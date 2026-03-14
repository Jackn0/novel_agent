import { NextRequest, NextResponse } from "next/server";
import { getProject } from "@/lib/db/projects";
import { generateJSON, isAPIKeyConfigured } from "@/lib/agent/clients";
import { buildSingleVolumeUserPrompt, buildCompleteSystemPrompt } from "@/lib/agent/prompts";
import type { Volume } from "@/types/novel";

interface RouteParams {
  params: Promise<{ id: string }>;
}

interface GenerateVolumeRequest {
  volumeNumber: number;
  existingVolumes: Volume[];
  mainArc: string;
}

/**
 * POST /api/projects/:id/generate/outline/volume
 * 生成单个卷的配置
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body: GenerateVolumeRequest = await request.json();
    const { volumeNumber, existingVolumes, mainArc } = body;

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
    const userPrompt = buildSingleVolumeUserPrompt(
      project, 
      volumeNumber, 
      existingVolumes, 
      mainArc
    );

    // 获取设定模型和 maxTokens
    const settingModel = project.settings.settingModel || process.env.SETTING_MODEL || "gpt-4-turbo";
    const maxTokens = project.settings.maxTokens || parseInt(process.env.MAX_TOKENS || "4096");
    
    // 调用 AI 生成
    const { data, usage } = await generateJSON<Volume>({
      model: settingModel,
      systemPrompt,
      userPrompt,
      maxTokens: Math.min(maxTokens, 16000),
      temperature: 0.7,
    });

    return NextResponse.json({
      success: true,
      data,
      usage,
    });
  } catch (error) {
    console.error("Failed to generate volume:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : "生成卷失败" 
      },
      { status: 500 }
    );
  }
}
