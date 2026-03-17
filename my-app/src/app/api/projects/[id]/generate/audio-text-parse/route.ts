/**
 * POST /api/projects/:id/generate/audio-text-parse
 * 将小说正文解析为音频段（角色-台词格式）
 */

import { NextRequest, NextResponse } from "next/server";
import { getProject } from "@/lib/db/projects";
import { generateJSON, isAPIKeyConfigured } from "@/lib/agent/clients";
import { buildCompleteSystemPrompt } from "@/lib/agent/prompts";
import { buildAudioTextParsePrompt } from "@/lib/agent/audio-prompts";
import type { ParsedAudioSegment } from "@/types/novel";

interface RouteParams {
  params: Promise<{ id: string }>;
}

interface ParseRequest {
  sectionId: string;
  content: string;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body: ParseRequest = await request.json();
    const { sectionId, content } = body;

    if (!isAPIKeyConfigured()) {
      return NextResponse.json(
        { success: false, error: "API Key 未配置" },
        { status: 500 }
      );
    }

    const project = await getProject(id);
    if (!project) {
      return NextResponse.json(
        { success: false, error: "项目不存在" },
        { status: 404 }
      );
    }

    // 获取语音配置中的角色列表
    const voiceConfig = project.voiceConfig;
    if (!voiceConfig || voiceConfig.characters.length === 0) {
      return NextResponse.json(
        { success: false, error: "请先配置语音人物" },
        { status: 400 }
      );
    }

    // 准备角色列表（包含旁白）
    const characters = voiceConfig.characters.map(c => ({
      id: c.characterId,
      name: c.characterName,
    }));

    // 获取主角名称
    const protagonist = project.bible.characters.find(c => c.role === "protagonist");

    // 构建prompt
    const memoryLevel = project.settings.memoryLevel ?? 3;
    const systemPrompt = buildCompleteSystemPrompt(project, "writing", memoryLevel);
    const userPrompt = buildAudioTextParsePrompt(
      content,
      characters,
      protagonist?.name
    );

    // 调用AI解析
    const settingModel = project.settings.settingModel || process.env.SETTING_MODEL || "gpt-4-turbo";
    const maxTokens = project.settings.maxTokens || parseInt(process.env.MAX_TOKENS || "4096");

    const result = await generateJSON<ParsedAudioSegment[]>({
      model: settingModel,
      systemPrompt,
      userPrompt,
      maxTokens: Math.min(maxTokens, 8000),
      temperature: 0.3, // 低温度，确保解析准确性
    });

    // 验证结果
    const segments = result.data;
    if (!Array.isArray(segments)) {
      return NextResponse.json(
        { success: false, error: "解析结果格式错误" },
        { status: 500 }
      );
    }

    // 为每个段添加ID和order
    const validatedSegments: ParsedAudioSegment[] = segments.map((seg, index) => ({
      id: crypto.randomUUID(),
      order: index + 1,
      characterId: seg.characterId || "narrator",
      characterName: seg.characterName || "旁白",
      type: seg.type || "narration",
      text: seg.text || "",
      processedText: seg.processedText || seg.text || "",
    }));

    return NextResponse.json({
      success: true,
      data: validatedSegments,
      count: validatedSegments.length,
    });

  } catch (error) {
    console.error("Failed to parse audio text:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "解析失败" },
      { status: 500 }
    );
  }
}
