/**
 * POST /api/projects/[id]/generate/audiobook-chapter
 * 简化版：Edge TTS 单一音色直接朗读章节，按自然段分割后合并
 */

import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import { promises as fs } from "fs";
import path from "path";
import { getProject, updateProject } from "@/lib/db/projects";

const execAsync = promisify(exec);

interface RouteParams {
  params: Promise<{ id: string }>;
}

interface GenerateRequest {
  volumeNumber: number;
  chapterNumber: number;
}

// 按自然段分割文本（保持每段合理长度）
function splitIntoParagraphs(text: string): string[] {
  // 标准化换行符
  const normalized = text.replace(/\r\n/g, '\n').trim();
  
  // 首先尝试按空行分割
  let paragraphs = normalized.split(/\n\s*\n/).map(p => p.trim()).filter(p => p.length > 0);
  
  // 如果段落太少，按行分割
  if (paragraphs.length < 3) {
    const lines = normalized.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    paragraphs = [];
    let currentPara = '';
    
    for (const line of lines) {
      currentPara += line;
      // 如果行尾有标点或者是最后一行，保存段落
      if (/[。！？\.\!\?""''）】]$/.test(line) || line.length > 100) {
        if (currentPara.length > 0) {
          paragraphs.push(currentPara);
          currentPara = '';
        }
      }
    }
    if (currentPara) paragraphs.push(currentPara);
  }
  
  // 合并过短的段落（避免单句段落太多）
  const result: string[] = [];
  let temp = '';
  for (const para of paragraphs) {
    if (temp.length + para.length < 200) {
      temp += (temp ? '\n' : '') + para;
    } else {
      if (temp) result.push(temp);
      temp = para;
    }
  }
  if (temp) result.push(temp);
  
  return result.filter(p => p.length > 0);
}

// 生成单个段落音频
async function generateParagraphAudio(
  text: string,
  voiceId: string,
  outputPath: string
): Promise<void> {
  // 转义特殊字符
  const escapedText = text.replace(/"/g, '\\"').replace(/\n/g, ' ');
  const command = `edge-tts --voice "${voiceId}" --text "${escapedText}" --write-media "${outputPath}"`;
  
  const { stderr } = await execAsync(command, { timeout: 60000 });
  if (stderr) {
    console.warn("[edge-tts] stderr:", stderr);
  }
  
  // 验证文件
  const stats = await fs.stat(outputPath);
  if (stats.size === 0) {
    throw new Error(`音频生成失败: ${outputPath}`);
  }
}

// 使用 FFmpeg 合并多个 MP3 文件
async function mergeAudioFiles(
  inputFiles: string[],
  outputPath: string
): Promise<void> {
  if (inputFiles.length === 0) {
    throw new Error("没有输入文件");
  }
  
  if (inputFiles.length === 1) {
    // 只有一个文件，直接复制
    await fs.copyFile(inputFiles[0], outputPath);
    return;
  }
  
  // 创建临时文件列表
  const tempDir = path.dirname(outputPath);
  const listFile = path.join(tempDir, `concat-${Date.now()}.txt`);
  
  const fileList = inputFiles
    .map(f => `file '${f.replace(/'/g, "'\\''")}'`)
    .join('\n');
  
  await fs.writeFile(listFile, fileList, 'utf-8');
  
  try {
    // 使用 FFmpeg concat demuxer 合并（不重新编码，速度快）
    const command = `ffmpeg -f concat -safe 0 -i "${listFile}" -c copy "${outputPath}" -y`;
    await execAsync(command, { timeout: 120000 });
    
    // 验证输出文件
    const stats = await fs.stat(outputPath);
    if (stats.size === 0) {
      throw new Error("合并后的音频文件为空");
    }
  } finally {
    // 清理临时文件列表
    try {
      await fs.unlink(listFile);
    } catch {
      // 忽略
    }
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const tempFiles: string[] = [];
  
  try {
    const body: GenerateRequest = await request.json();
    const { volumeNumber, chapterNumber } = body;
    
    // 获取项目
    const project = await getProject(id);
    if (!project) {
      return NextResponse.json(
        { success: false, error: "项目不存在" },
        { status: 404 }
      );
    }
    
    if (project.projectType !== "audiobook") {
      return NextResponse.json(
        { success: false, error: "不是有声小说项目" },
        { status: 400 }
      );
    }
    
    // 获取该章节的所有分段
    const segments = project.audiobookSegments?.filter(
      s => s.volumeNumber === volumeNumber && s.chapterNumber === chapterNumber
    ) || [];
    
    if (segments.length === 0) {
      return NextResponse.json(
        { success: false, error: "章节不存在" },
        { status: 404 }
      );
    }
    
    // 按分段顺序合并内容
    const fullContent = segments.map(s => s.content).join('\n\n');
    
    // 获取语音配置
    const voiceConfig = project.voiceConfig;
    const voiceId = voiceConfig?.edgeSingleVoiceId || 
                    process.env.AUDIOBOOK_EDGE_SINGLE_VOICE || 
                    "zh-CN-YunjianNeural";
    
    console.log(`[Audiobook] Generating chapter ${volumeNumber}-${chapterNumber}`);
    console.log(`[Audiobook] Voice: ${voiceId}, Content length: ${fullContent.length}`);
    
    // 创建输出目录 - 使用小说名称
    const safeTitle = project.title.replace(/[\\/:*?"<>|]/g, '').trim() || '未命名';
    const outputDir = path.join(process.cwd(), "output", `有声小说-${safeTitle}`);
    await fs.mkdir(outputDir, { recursive: true });
    
    // 按自然段分割
    const paragraphs = splitIntoParagraphs(fullContent);
    console.log(`[Audiobook] Split into ${paragraphs.length} paragraphs`);
    
    if (paragraphs.length === 0) {
      return NextResponse.json(
        { success: false, error: "章节内容为空" },
        { status: 400 }
      );
    }
    
    // 生成每个段落的音频
    const audioFiles: string[] = [];
    for (let i = 0; i < paragraphs.length; i++) {
      const paraFile = path.join(outputDir, `v${volumeNumber}-c${chapterNumber}-p${i}.mp3`);
      tempFiles.push(paraFile);
      
      console.log(`[Audiobook] Generating paragraph ${i + 1}/${paragraphs.length}`);
      await generateParagraphAudio(paragraphs[i], voiceId, paraFile);
      audioFiles.push(paraFile);
    }
    
    // 合并所有音频
    const finalFileName = `v${volumeNumber}-c${chapterNumber}.mp3`;
    const finalPath = path.join(outputDir, finalFileName);
    
    console.log(`[Audiobook] Merging ${audioFiles.length} audio files...`);
    await mergeAudioFiles(audioFiles, finalPath);
    
    // 清理临时段落文件
    for (const file of tempFiles) {
      try {
        await fs.unlink(file);
      } catch {
        // 忽略
      }
    }
    
    // 计算预估时长（约每秒 4-5 字）
    const estimatedDuration = Math.ceil(fullContent.length / 5);
    
    // 使用小说名称构建路径
    const audioPath = `有声小说-${safeTitle}/${finalFileName}`;
    
    // 更新所有分段状态为已完成
    const updatedSegments = project.audiobookSegments?.map(s => {
      if (s.volumeNumber === volumeNumber && s.chapterNumber === chapterNumber) {
        return {
          ...s,
          status: "completed" as const,
          audioUrl: `/api/audio-file?path=${encodeURIComponent(audioPath)}`,
          duration: Math.ceil(estimatedDuration / segments.length), // 平均分配时长
        };
      }
      return s;
    });
    
    await updateProject(id, {
      audiobookSegments: updatedSegments,
    });
    
    const stats = await fs.stat(finalPath);
    
    return NextResponse.json({
      success: true,
      data: {
        volumeNumber,
        chapterNumber,
        audioUrl: `/api/audio-file?path=${encodeURIComponent(audioPath)}`,
        duration: estimatedDuration,
        fileSize: stats.size,
        paragraphs: paragraphs.length,
      },
    });
    
  } catch (error) {
    console.error("[Audiobook] Error:", error);
    
    // 清理临时文件
    for (const file of tempFiles) {
      try {
        await fs.unlink(file);
      } catch {
        // 忽略
      }
    }
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : "音频生成失败",
        details: error instanceof Error && error.message.includes("edge-tts")
          ? "请确保已安装 edge-tts: pip install edge-tts"
          : error instanceof Error && error.message.includes("ffmpeg")
          ? "请确保已安装 FFmpeg 并添加到 PATH"
          : undefined
      },
      { status: 500 }
    );
  }
}
