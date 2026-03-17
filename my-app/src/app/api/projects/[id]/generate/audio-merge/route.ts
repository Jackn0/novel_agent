/**
 * POST /api/projects/:id/generate/audio-merge
 * 合并多个音频文件为一个小节的完整音频
 */

import { NextRequest, NextResponse } from "next/server";
import { getProject, updateProject } from "@/lib/db/projects";
import { mergeAudioFiles } from "@/lib/audio/audio-merger";
import path from "path";
import fs from "fs/promises";
import type { AudioGenerationTask } from "@/types/novel";

interface RouteParams {
  params: Promise<{ id: string }>;
}

interface MergeRequest {
  sectionId: string;
  chapterId: string;
  segmentAudioFiles: string[];  // 音频文件路径列表
  pauseDuration?: number;       // 段落间隔（毫秒）
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body: MergeRequest = await request.json();
    const { sectionId, chapterId, segmentAudioFiles, pauseDuration } = body;

    const project = await getProject(id);
    if (!project) {
      return NextResponse.json(
        { success: false, error: "项目不存在" },
        { status: 404 }
      );
    }

    if (!project.voiceConfig) {
      return NextResponse.json(
        { success: false, error: "请先配置语音人物" },
        { status: 400 }
      );
    }

    if (segmentAudioFiles.length === 0) {
      return NextResponse.json(
        { success: false, error: "没有音频文件需要合并" },
        { status: 400 }
      );
    }

    // 查找章节和小节信息
    const chapter = project.chapters.find(c => c.id === chapterId);
    if (!chapter) {
      return NextResponse.json(
        { success: false, error: "章节不存在" },
        { status: 404 }
      );
    }

    const section = chapter.sections?.find(s => s.id === sectionId);
    if (!section) {
      return NextResponse.json(
        { success: false, error: "小节不存在" },
        { status: 404 }
      );
    }

    // 构建输出文件路径
    // 格式: output/有声小说-{小说名}/{卷号}-{章节号}-{小节号}.mp3
    const outputDir = path.join(
      process.cwd(),
      "output",
      `有声小说-${project.title}`
    );
    const outputFileName = `${chapter.volumeNumber}-${chapter.chapterNumberInVolume}-${section.sectionNumber}.mp3`;
    const outputFile = path.join(outputDir, outputFileName);

    // 转换相对路径为绝对路径
    const absoluteInputFiles = segmentAudioFiles.map(f => {
      if (f.startsWith("/")) {
        return path.join(process.cwd(), f);
      }
      return f;
    });

    // 合并音频
    const result = await mergeAudioFiles({
      inputFiles: absoluteInputFiles,
      outputFile,
      pauseDuration: pauseDuration ?? project.voiceConfig.pauseBetweenLines ?? 500,
    });

    // 更新任务记录
    const task: AudioGenerationTask = {
      id: crypto.randomUUID(),
      projectId: id,
      chapterId,
      sectionId,
      parsedSegments: [],  // 简化存储
      segmentAudioFiles: segmentAudioFiles.map((file, index) => ({
        segmentId: `segment-${index}`,
        audioUrl: file,
        duration: 0,
      })),
      mergedAudioUrl: result.filePath.replace(process.cwd(), ""),
      totalDuration: result.duration,
      status: "completed",
      progress: 100,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // 保存任务到项目
    const audioTasks = project.audioTasks || [];
    audioTasks.push(task);
    await updateProject(id, { audioTasks });

    return NextResponse.json({
      success: true,
      data: {
        audioUrl: task.mergedAudioUrl,
        duration: result.duration,
        fileSize: result.fileSize,
        outputPath: outputFileName,
      },
    });

  } catch (error) {
    console.error("Failed to merge audio:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "合并失败" },
      { status: 500 }
    );
  }
}
