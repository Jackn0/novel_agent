/**
 * POST /api/projects/:id/generate/audio
 * 生成单段音频
 * 
 * POST /api/projects/:id/generate/audio/batch
 * 批量生成音频
 */

import { NextRequest, NextResponse } from "next/server";
import { getProject } from "@/lib/db/projects";
import { getTTSProvider } from "@/lib/audio/tts-providers/base";
import type { ParsedAudioSegment, CharacterVoice } from "@/types/novel";
import path from "path";
import fs from "fs/promises";

interface RouteParams {
  params: Promise<{ id: string }>;
}

interface SingleAudioRequest {
  segment: ParsedAudioSegment;
  voiceConfig: CharacterVoice;
  outputFileName: string;
}

interface BatchAudioRequest {
  sectionId: string;
  segments: ParsedAudioSegment[];
}

// 单段音频生成
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const project = await getProject(id);

    if (!project) {
      return NextResponse.json(
        { success: false, error: "项目不存在" },
        { status: 404 }
      );
    }

    const body = await request.json();

    // 判断是批量还是单段
    if ("segments" in body) {
      return handleBatchGenerate(project, body as BatchAudioRequest);
    } else {
      return handleSingleGenerate(project, body as SingleAudioRequest);
    }

  } catch (error) {
    console.error("Failed to generate audio:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "生成失败" },
      { status: 500 }
    );
  }
}

// 处理单段音频生成
async function handleSingleGenerate(
  project: { id: string; title: string; voiceConfig?: { pauseBetweenLines?: number } },
  request: SingleAudioRequest
) {
  const { segment, voiceConfig, outputFileName } = request;

  // 获取TTS提供商
  const provider = getTTSProvider(voiceConfig.service);
  if (!provider) {
    return NextResponse.json(
      { success: false, error: `不支持的TTS服务: ${voiceConfig.service}` },
      { status: 400 }
    );
  }

  if (!provider.isConfigured()) {
    return NextResponse.json(
      { success: false, error: `${provider.nameCN} 未配置` },
      { status: 400 }
    );
  }

  // 构建输出路径
  const outputDir = path.join(
    process.cwd(),
    "output",
    `有声小说-${project.title}`,
    "segments"
  );
  const outputFile = path.join(outputDir, outputFileName);

  try {
    // 确保目录存在
    await fs.mkdir(outputDir, { recursive: true });

    // 生成音频
    const result = await provider.synthesize({
      text: segment.processedText || segment.text,
      voiceId: voiceConfig.voiceId,
      speed: voiceConfig.speed,
      pitch: voiceConfig.pitch,
      volume: voiceConfig.volume,
      emotion: voiceConfig.emotion,
      outputFile,
    });

    return NextResponse.json({
      success: true,
      data: {
        segmentId: segment.id,
        audioUrl: result.filePath.replace(process.cwd(), ""),
        duration: result.duration,
        fileSize: result.fileSize,
      },
    });

  } catch (error) {
    console.error("TTS generation failed:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : "音频生成失败",
        segmentId: segment.id,
      },
      { status: 500 }
    );
  }
}

// 处理批量音频生成
async function handleBatchGenerate(
  project: { id: string; title: string; voiceConfig?: { characters?: CharacterVoice[]; pauseBetweenLines?: number } },
  request: BatchAudioRequest
) {
  const { sectionId, segments } = request;

  if (!project.voiceConfig) {
    return NextResponse.json(
      { success: false, error: "请先配置语音人物" },
      { status: 400 }
    );
  }

  const results: Array<{
    segmentId: string;
    success: boolean;
    audioUrl?: string;
    duration?: number;
    error?: string;
  }> = [];

  // 串行生成（避免API限流）
  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    
    // 查找对应的语音配置
    const voiceConfig = project.voiceConfig?.characters?.find(
      c => c.characterId === segment.characterId
    );

    if (!voiceConfig) {
      results.push({
        segmentId: segment.id,
        success: false,
        error: `未找到角色 ${segment.characterId} 的语音配置`,
      });
      continue;
    }

    const provider = getTTSProvider(voiceConfig.service);
    if (!provider || !provider.isConfigured()) {
      results.push({
        segmentId: segment.id,
        success: false,
        error: `TTS服务 ${voiceConfig.service} 不可用`,
      });
      continue;
    }

    const outputFileName = `${sectionId}-${segment.id}.mp3`;
    const outputDir = path.join(
      process.cwd(),
      "output",
      `有声小说-${project.title}`,
      "segments"
    );
    const outputFile = path.join(outputDir, outputFileName);

    try {
      await fs.mkdir(outputDir, { recursive: true });

      const result = await provider.synthesize({
        text: segment.processedText || segment.text,
        voiceId: voiceConfig.voiceId,
        speed: voiceConfig.speed,
        pitch: voiceConfig.pitch,
        volume: voiceConfig.volume,
        emotion: voiceConfig.emotion,
        outputFile,
      });

      results.push({
        segmentId: segment.id,
        success: true,
        audioUrl: result.filePath.replace(process.cwd(), ""),
        duration: result.duration,
      });

    } catch (error) {
      results.push({
        segmentId: segment.id,
        success: false,
        error: error instanceof Error ? error.message : "生成失败",
      });
    }
  }

  const successCount = results.filter(r => r.success).length;

  return NextResponse.json({
    success: successCount > 0,
    data: results,
    summary: {
      total: segments.length,
      success: successCount,
      failed: segments.length - successCount,
    },
  });
}
