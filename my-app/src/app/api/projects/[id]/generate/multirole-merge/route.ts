/**
 * POST /api/projects/[id]/generate/multirole-merge
 * 合并多角色配音的段落音频
 */

import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import { promises as fs } from "fs";
import path from "path";
import { getProject, updateProject } from "@/lib/db/projects";
import type { MultiRoleCharacter } from "@/types/novel";

const execAsync = promisify(exec);

interface RouteParams {
  params: Promise<{ id: string }>;
}

interface MergeRequest {
  volumeNumber: number;
  chapterNumber: number;
  audioUrls: string[];
  characters: MultiRoleCharacter[];
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  
  try {
    const body: MergeRequest = await request.json();
    const { volumeNumber, chapterNumber, audioUrls, characters } = body;
    
    if (audioUrls.length === 0) {
      return NextResponse.json(
        { success: false, error: "没有音频文件可合并" },
        { status: 400 }
      );
    }
    
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
    
    // 最终输出文件
    const finalFileName = `v${volumeNumber}-c${chapterNumber}.mp3`;
    const finalPath = path.join(outputDir, finalFileName);
    
    if (audioUrls.length === 1) {
      // 只有一个文件，直接复制
      await fs.copyFile(audioUrls[0], finalPath);
    } else {
      // 使用 FFmpeg 合并音频，添加静音间隔防止边界截断
      const listFile = path.join(outputDir, `concat-${Date.now()}.txt`);
      const silenceFile = path.join(outputDir, `silence-${Date.now()}.mp3`);
      
      try {
        // 生成 0.2 秒静音文件（防止MP3边界截断问题）
        await execAsync(
          `ffmpeg -f lavfi -i anullsrc=r=24000:cl=mono -t 0.2 -acodec libmp3lame -b:a 48k "${silenceFile}" -y`,
          { timeout: 30000 }
        );
        
        // 构建文件列表：音频 + 静音 + 音频 + 静音 + ...
        const fileListWithSilence: string[] = [];
        audioUrls.forEach((f, index) => {
          fileListWithSilence.push(`file '${f.replace(/'/g, "'\\''")}'`);
          // 在每个音频后添加静音（最后一个除外）
          if (index < audioUrls.length - 1) {
            fileListWithSilence.push(`file '${silenceFile.replace(/'/g, "'\\''")}'`);
          }
        });
        
        await fs.writeFile(listFile, fileListWithSilence.join('\n'), 'utf-8');
        
        // 使用 concat 协议合并，重新编码确保一致性
        const command = `ffmpeg -f concat -safe 0 -i "${listFile}" -acodec libmp3lame -ar 24000 -b:a 48k "${finalPath}" -y`;
        await execAsync(command, { timeout: 180000 });
        
        // 清理静音文件
        try {
          await fs.unlink(silenceFile);
        } catch {}
        
      } finally {
        // 清理列表文件
        try {
          await fs.unlink(listFile);
        } catch {}
      }
    }
    
    // 清理临时文件和temp目录
    const tempDirs = new Set<string>();
    for (const file of audioUrls) {
      try {
        if (file.includes('/temp/') || file.includes('\\temp\\')) {
          await fs.unlink(file);
          // 记录temp目录路径
          const tempDir = path.dirname(file);
          tempDirs.add(tempDir);
        }
      } catch {}
    }
    // 尝试删除空temp目录
    for (const tempDir of tempDirs) {
      try {
        const files = await fs.readdir(tempDir);
        if (files.length === 0) {
          await fs.rmdir(tempDir);
          console.log(`[Merge] Removed empty temp dir: ${tempDir}`);
        }
      } catch {}
    }
    
    // 验证输出文件
    const stats = await fs.stat(finalPath);
    if (stats.size === 0) {
      throw new Error("合并后的音频文件为空");
    }
    
    // 更新项目状态
    const segments = project.audiobookSegments?.map(s => {
      if (s.volumeNumber === volumeNumber && s.chapterNumber === chapterNumber) {
        return {
          ...s,
          status: "completed" as const,
          audioUrl: `/api/audio-file?path=${encodeURIComponent(`有声小说-${safeTitle}/${finalFileName}`)}`,
          duration: Math.ceil(audioUrls.length * 10), // 估算时长
        };
      }
      return s;
    });
    
    // 保存人物配置（清除isNew临时标记）
    const multiRoleConfig = project.multiRoleConfig;
    if (multiRoleConfig) {
      // 保存时清除isNew标记，因为它只是临时的UI状态
      multiRoleConfig.characters = characters.map(c => ({
        ...c,
        isNew: undefined,
      }));
      const chapterIndex = multiRoleConfig.chapters.findIndex(
        c => c.volumeNumber === volumeNumber && c.chapterNumber === chapterNumber
      );
      if (chapterIndex >= 0) {
        multiRoleConfig.chapters[chapterIndex].status = "completed";
        multiRoleConfig.chapters[chapterIndex].audioUrl = `/api/audio-file?path=${encodeURIComponent(`有声小说-${safeTitle}/${finalFileName}`)}`;
      }
    }
    
    await updateProject(id, {
      audiobookSegments: segments,
      multiRoleConfig,
    });
    
    return NextResponse.json({
      success: true,
      data: {
        volumeNumber,
        chapterNumber,
        audioUrl: `/api/audio-file?path=${encodeURIComponent(`有声小说-${safeTitle}/${finalFileName}`)}`,
        fileSize: stats.size,
      },
    });
    
  } catch (error) {
    console.error("[Merge] Error:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : "合并失败"
      },
      { status: 500 }
    );
  }
}
