/**
 * POST /api/projects/[id]/generate/multirole-dubbing
 * 为多角色章节生成配音，每个角色使用不同的音色
 */

import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import { promises as fs } from "fs";
import path from "path";
import { getProject, updateProject } from "@/lib/db/projects";
import type { MultiRoleParagraph, MultiRoleCharacter } from "@/types/novel";

const execAsync = promisify(exec);

interface RouteParams {
  params: Promise<{ id: string }>;
}

interface DubbingRequest {
  volumeNumber: number;
  chapterNumber: number;
  paragraphs: MultiRoleParagraph[];
  characters: MultiRoleCharacter[];
}

// 生成单段音频
async function generateParagraphAudio(
  text: string,
  voiceId: string,
  outputPath: string
): Promise<void> {
  const escapedText = text.replace(/"/g, '\\"').replace(/\n/g, ' ');
  const command = `edge-tts --voice "${voiceId}" --text "${escapedText}" --write-media "${outputPath}"`;
  
  const { stderr } = await execAsync(command, { timeout: 60000 });
  if (stderr) {
    console.warn("[edge-tts] stderr:", stderr);
  }
  
  const stats = await fs.stat(outputPath);
  if (stats.size === 0) {
    throw new Error(`音频生成失败: ${outputPath}`);
  }
}

// 合并音频文件
async function mergeAudioFiles(
  inputFiles: string[],
  outputPath: string
): Promise<void> {
  if (inputFiles.length === 0) {
    throw new Error("没有输入文件");
  }
  
  if (inputFiles.length === 1) {
    await fs.copyFile(inputFiles[0], outputPath);
    return;
  }
  
  const tempDir = path.dirname(outputPath);
  const listFile = path.join(tempDir, `concat-${Date.now()}.txt`);
  
  const fileList = inputFiles
    .map(f => `file '${f.replace(/'/g, "'\\''")}'`)
    .join('\n');
  
  await fs.writeFile(listFile, fileList, 'utf-8');
  
  try {
    const command = `ffmpeg -f concat -safe 0 -i "${listFile}" -c copy "${outputPath}" -y`;
    await execAsync(command, { timeout: 120000 });
    
    const stats = await fs.stat(outputPath);
    if (stats.size === 0) {
      throw new Error("合并后的音频文件为空");
    }
  } finally {
    try {
      await fs.unlink(listFile);
    } catch {}
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const tempFiles: string[] = [];
  
  try {
    const body: DubbingRequest = await request.json();
    const { volumeNumber, chapterNumber, paragraphs, characters } = body;
    
    // 获取项目
    const project = await getProject(id);
    if (!project) {
      return NextResponse.json(
        { success: false, error: "项目不存在" },
        { status: 404 }
      );
    }
    
    // 创建输出目录
    const safeTitle = project.title.replace(/[\\/:*?"<>|]/g, '').trim() || '未命名';
    const outputDir = path.join(process.cwd(), "output", `有声小说-${safeTitle}`);
    await fs.mkdir(outputDir, { recursive: true });
    
    console.log(`[MultiRoleDubbing] Chapter ${volumeNumber}-${chapterNumber}`);
    
    // 为每个段落生成音频
    const audioFiles: string[] = [];
    let totalDuration = 0;
    
    for (let i = 0; i < paragraphs.length; i++) {
      const para = paragraphs[i];
      
      // 查找角色对应的音色
      const character = characters.find(c => c.id === para.characterId);
      let voiceId = character?.voiceId;
      
      // 如果没有分配音色，使用默认
      if (!voiceId) {
        if (para.characterId === "narrator") {
          voiceId = "zh-CN-YunjianNeural";
        } else {
          // 根据性别选择默认音色
          voiceId = character?.gender === "female" 
            ? "zh-CN-XiaoxiaoNeural" 
            : "zh-CN-YunxiNeural";
        }
      }
      
      const paraFile = path.join(outputDir, `v${volumeNumber}-c${chapterNumber}-p${i}.mp3`);
      tempFiles.push(paraFile);
      
      console.log(`[MultiRoleDubbing] Paragraph ${i + 1}/${paragraphs.length}: ${para.characterName} (${voiceId})`);
      
      await generateParagraphAudio(para.processedText, voiceId, paraFile);
      audioFiles.push(paraFile);
      
      // 累加预估时长
      totalDuration += Math.ceil(para.processedText.length / 5);
    }
    
    // 合并所有音频
    const finalFileName = `v${volumeNumber}-c${chapterNumber}.mp3`;
    const finalPath = path.join(outputDir, finalFileName);
    
    console.log(`[MultiRoleDubbing] Merging ${audioFiles.length} files...`);
    await mergeAudioFiles(audioFiles, finalPath);
    
    // 清理临时文件
    for (const file of tempFiles) {
      try {
        await fs.unlink(file);
      } catch {}
    }
    
    // 更新项目状态
    const segments = project.audiobookSegments?.map(s => {
      if (s.volumeNumber === volumeNumber && s.chapterNumber === chapterNumber) {
        return {
          ...s,
          status: "completed" as const,
          audioUrl: `/api/audio-file?path=${encodeURIComponent(`有声小说-${safeTitle}/${finalFileName}`)}`,
          duration: Math.ceil(totalDuration / paragraphs.length),
        };
      }
      return s;
    });
    
    // 更新多角色配置
    const multiRoleConfig = project.multiRoleConfig;
    if (multiRoleConfig) {
      // 保存人物配置（包含用户设置的音色）
      multiRoleConfig.characters = characters;
      
      const chapterIndex = multiRoleConfig.chapters.findIndex(
        c => c.volumeNumber === volumeNumber && c.chapterNumber === chapterNumber
      );
      if (chapterIndex >= 0) {
        multiRoleConfig.chapters[chapterIndex].status = "completed";
        multiRoleConfig.chapters[chapterIndex].audioUrl = `/api/audio-file?path=${encodeURIComponent(`有声小说-${safeTitle}/${finalFileName}`)}`;
        multiRoleConfig.chapters[chapterIndex].duration = totalDuration;
        multiRoleConfig.chapters[chapterIndex].paragraphs = paragraphs;
      }
    }
    
    await updateProject(id, {
      audiobookSegments: segments,
      multiRoleConfig,
    });
    
    const stats = await fs.stat(finalPath);
    
    return NextResponse.json({
      success: true,
      data: {
        volumeNumber,
        chapterNumber,
        audioUrl: `/api/audio-file?path=${encodeURIComponent(`有声小说-${safeTitle}/${finalFileName}`)}`,
        duration: totalDuration,
        fileSize: stats.size,
      },
    });
    
  } catch (error) {
    console.error("[MultiRoleDubbing] Error:", error);
    
    // 清理临时文件
    for (const file of tempFiles) {
      try {
        await fs.unlink(file);
      } catch {}
    }
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : "配音失败",
        details: error instanceof Error && error.message.includes("edge-tts")
          ? "请确保已安装 edge-tts"
          : error instanceof Error && error.message.includes("ffmpeg")
          ? "请确保已安装 FFmpeg"
          : undefined
      },
      { status: 500 }
    );
  }
}
