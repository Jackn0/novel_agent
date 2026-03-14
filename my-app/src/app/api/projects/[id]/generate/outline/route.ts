import { NextRequest, NextResponse } from "next/server";
import { getProject, updateOutline } from "@/lib/db/projects";
import { generateJSON, isAPIKeyConfigured } from "@/lib/agent/clients";
import { buildOutlineUserPromptWithConfig, buildCompleteSystemPrompt } from "@/lib/agent/prompts";
import type { NovelOutline, VolumeConfig } from "@/types/novel";

interface RouteParams {
  params: Promise<{ id: string }>;
}

interface GenerateOutlineRequest {
  volumeCount: number;
  volumeConfigs: VolumeConfig[];
}

/**
 * POST /api/projects/:id/generate/outline
 * 生成小说大纲（非流式，返回 JSON）
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body: GenerateOutlineRequest = await request.json();
    const { volumeCount, volumeConfigs } = body;

    // 检查 API Key
    if (!isAPIKeyConfigured()) {
      return NextResponse.json(
        { success: false, error: "API Key 未配置，请检查环境变量 ANTHROPIC_API_KEY 或 OPENAI_API_KEY" },
        { status: 500 }
      );
    }

    // 加载项目
    const project = await getProject(id);
    if (!project) {
      return NextResponse.json(
        { success: false, error: "项目不存在" },
        { status: 404 }
      );
    }

    // 获取记忆等级（环境变量优先）
    const memoryLevel = parseInt(process.env.MEMORY_LEVEL || String(project.settings.memoryLevel)) as 1 | 2 | 3 | 4 | 5;

    // 构建 prompts
    const systemPrompt = buildCompleteSystemPrompt(project, "outline", memoryLevel);
    const userPrompt = buildOutlineUserPromptWithConfig(project, volumeCount, volumeConfigs);

    // 获取设定模型和 maxTokens（环境变量优先）
    const settingModel = process.env.SETTING_MODEL || project.settings.settingModel || "gpt-4-turbo";
    const maxTokens = parseInt(process.env.MAX_TOKENS || String(project.settings.maxTokens)) || 4096;
    
    // 调用 AI 生成
    const { data, usage } = await generateJSON<NovelOutline>({
      model: settingModel,
      systemPrompt,
      userPrompt,
      maxTokens: Math.min(maxTokens, 16000),
      temperature: 0.7,
    });

    // 保存大纲
    await updateOutline(id, data);

    return NextResponse.json({
      success: true,
      data,
      usage,
    });
  } catch (error) {
    console.error("Failed to generate outline:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : "生成大纲失败" 
      },
      { status: 500 }
    );
  }
}
