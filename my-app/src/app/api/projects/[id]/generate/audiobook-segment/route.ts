/**
 * POST /api/projects/[id]/generate/audiobook-segment
 * 生成单个分段的音频
 */

import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { getProject, updateProject } from "@/lib/db/projects";
import { generateTTS } from "@/lib/tts";

interface RouteParams {
  params: Promise<{ id: string }>;
}

interface GenerateRequest {
  segmentId: string;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;

  try {
    const body: GenerateRequest = await request.json();
    const { segmentId } = body;

    if (!segmentId) {
      return NextResponse.json(
        { success: false, error: "缺少分段ID" },
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

    // 检查是否是有声小说项目
    if (project.projectType !== "audiobook") {
      return NextResponse.json(
        { success: false, error: "不是有声小说项目" },
        { status: 400 }
      );
    }

    // 查找分段
    const segment = project.audiobookSegments?.find((s) => s.id === segmentId);
    if (!segment) {
      return NextResponse.json(
        { success: false, error: "分段不存在" },
        { status: 404 }
      );
    }

    // 获取语音配置
    const voiceConfig = project.voiceConfig;
    const voiceId = voiceConfig?.characters?.[0]?.voiceId || "zh-CN-YunjianNeural";
    const service = voiceConfig?.characters?.[0]?.service || "edge";

    // 创建输出目录 - 使用小说名称
    const safeTitle = project.title.replace(/[\\/:*?"<>|]/g, "").trim() || "未命名";
    const outputDir = path.join(process.cwd(), "output", `有声小说-${safeTitle}`);
    await fs.mkdir(outputDir, { recursive: true });

    // 生成文件名
    const fileName = `v${segment.volumeNumber}-c${segment.chapterNumber}-s${segment.segmentNumber}.mp3`;
    const mp3Path = path.join(outputDir, fileName);

    console.log(`[Audiobook] Generating audio for segment ${segmentId}`);
    console.log(`[Audiobook] Service: ${service}, Voice: ${voiceId}, Text length: ${segment.content.length}`);

    // 使用统一的 TTS 服务生成音频
    const result = await generateTTS({
      text: segment.content,
      voiceId,
      service: service as "edge" | "baidu",
      outputPath: mp3Path,
    });

    if (!result.success) {
      throw new Error(result.error || "音频生成失败");
    }

    // 检查文件
    const stats = await fs.stat(mp3Path);
    if (stats.size === 0) {
      throw new Error("生成的音频文件为空");
    }
    console.log(`[Audiobook] Generated: ${stats.size} bytes`);

    // 构建相对路径用于访问
    const relativePath = `有声小说-${safeTitle}/${fileName}`;

    // 更新分段状态
    const updatedSegments = project.audiobookSegments?.map((s) => {
      if (s.id === segmentId) {
        return {
          ...s,
          status: "completed" as const,
          audioUrl: `/api/audio-file?path=${encodeURIComponent(relativePath)}`,
          duration: result.duration || Math.ceil(segment.content.length / 5),
        };
      }
      return s;
    });

    // 保存到项目
    await updateProject(id, {
      audiobookSegments: updatedSegments,
    });

    return NextResponse.json({
      success: true,
      data: {
        segmentId,
        audioUrl: `/api/audio-file?path=${encodeURIComponent(relativePath)}`,
        duration: result.duration || Math.ceil(segment.content.length / 5),
      },
    });
  } catch (error) {
    console.error("[Audiobook] Error:", error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "音频生成失败",
        details:
          error instanceof Error && error.message.includes("edge-tts")
            ? "请确保已安装 edge-tts: pip install edge-tts"
            : undefined,
      },
      { status: 500 }
    );
  }
}
