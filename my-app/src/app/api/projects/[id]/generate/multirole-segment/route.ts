/**
 * POST /api/projects/[id]/generate/multirole-segment
 * 生成单个段落的音频（用于多角色配音进度显示）
 */

import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { getProject } from "@/lib/db/projects";
import { generateTTS } from "@/lib/tts";

interface RouteParams {
  params: Promise<{ id: string }>;
}

interface SegmentRequest {
  volumeNumber: number;
  chapterNumber: number;
  segmentIndex: number;
  text: string;
  voiceId: string;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;

  try {
    const body: SegmentRequest = await request.json();
    const { volumeNumber, chapterNumber, segmentIndex, text, voiceId } = body;

    // 获取项目
    const project = await getProject(id);
    if (!project) {
      return NextResponse.json(
        { success: false, error: "项目不存在" },
        { status: 404 }
      );
    }

    // 创建临时目录
    const safeTitle = project.title.replace(/[\\/:*?"<>|]/g, "").trim() || "未命名";
    const tempDir = path.join(process.cwd(), "output", `有声小说-${safeTitle}`, "temp");
    await fs.mkdir(tempDir, { recursive: true });

    // 生成临时文件名
    const tempFile = path.join(tempDir, `v${volumeNumber}-c${chapterNumber}-seg${segmentIndex}.mp3`);

    // 使用统一的 TTS 服务生成音频
    const result = await generateTTS({
      text,
      voiceId,
      outputPath: tempFile,
    });

    if (!result.success) {
      throw new Error(result.error || "音频生成失败");
    }

    // 验证文件
    const stats = await fs.stat(tempFile);
    if (stats.size === 0) {
      throw new Error("音频生成失败");
    }

    return NextResponse.json({
      success: true,
      data: {
        audioUrl: tempFile,
        duration: result.duration || Math.ceil(text.length / 5),
      },
    });
  } catch (error) {
    console.error("[Segment] Error:", error);
    const errorMessage = error instanceof Error ? error.message : "生成失败";

    // 判断错误类型
    const isNetworkError =
      errorMessage.includes("网络连接失败") ||
      errorMessage.includes("getaddrinfo failed") ||
      errorMessage.includes("Cannot connect to host");

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        errorType: isNetworkError ? "network" : "unknown",
        retryable: isNetworkError,
      },
      { status: 500 }
    );
  }
}
