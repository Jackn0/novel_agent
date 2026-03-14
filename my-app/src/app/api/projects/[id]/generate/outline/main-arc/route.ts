import { NextRequest, NextResponse } from "next/server";
import { getProject } from "@/lib/db/projects";
import { generateContent, isAPIKeyConfigured } from "@/lib/agent/clients";
import { buildMainArcUserPrompt, buildCompleteSystemPrompt } from "@/lib/agent/prompts";
import type { NovelOutline } from "@/types/novel";

interface RouteParams {
  params: Promise<{ id: string }>;
}

interface GenerateMainArcRequest {
  existingOutline?: NovelOutline | null;
}

/**
 * POST /api/projects/:id/generate/outline/main-arc
 * 生成故事主线
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body: GenerateMainArcRequest = await request.json();
    const { existingOutline } = body;

    // 检查 API Key
    if (!isAPIKeyConfigured()) {
      return NextResponse.json(
        { success: false, error: "API Key 未配置" },
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

    // 获取记忆等级
    const memoryLevel = parseInt(process.env.MEMORY_LEVEL || String(project.settings.memoryLevel)) as 1 | 2 | 3 | 4 | 5;

    // 构建 prompts
    const systemPrompt = buildCompleteSystemPrompt(project, "outline", memoryLevel);
    const userPrompt = buildMainArcUserPrompt(project, existingOutline);

    // 获取设定模型和 maxTokens（环境变量优先）
    const settingModel = process.env.SETTING_MODEL || project.settings.settingModel || "gpt-4-turbo";
    const maxTokens = parseInt(process.env.MAX_TOKENS || String(project.settings.maxTokens)) || 4096;
    
    // 调用 AI 生成（文本形式）
    const { content, usage } = await generateContent({
      model: settingModel,
      systemPrompt,
      userPrompt,
      maxTokens: Math.min(maxTokens, 8000),
      temperature: 0.7,
    });

    return NextResponse.json({
      success: true,
      data: { mainArc: content.trim() },
      usage,
    });
  } catch (error) {
    console.error("Failed to generate main arc:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : "生成主线失败" 
      },
      { status: 500 }
    );
  }
}
