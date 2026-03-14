import { NextRequest, NextResponse } from "next/server";
import { getProject, updateChapters } from "@/lib/db/projects";
import { generateJSON, isAPIKeyConfigured } from "@/lib/agent/clients";
import { buildChapterOutlineUserPrompt, buildCompleteSystemPrompt } from "@/lib/agent/prompts";
import type { Chapter } from "@/types/novel";

interface RouteParams {
  params: Promise<{ id: string }>;
}

interface GenerateRequest {
  volumeNumber: number;
}

/**
 * POST /api/projects/:id/generate/chapter-outlines
 * 生成指定卷的章节大纲
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body: GenerateRequest = await request.json();
    const { volumeNumber } = body;

    // 检查 API Key
    if (!isAPIKeyConfigured()) {
      return NextResponse.json(
        { success: false, error: "Claude API Key 未配置" },
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

    // 检查大纲是否存在
    if (!project.outline) {
      return NextResponse.json(
        { success: false, error: "先生成整体大纲" },
        { status: 400 }
      );
    }

    // 获取记忆等级
    const memoryLevel = parseInt(process.env.MEMORY_LEVEL || String(project.settings.memoryLevel)) as 1 | 2 | 3 | 4 | 5;

    // 构建 prompts
    const systemPrompt = buildCompleteSystemPrompt(project, "chapter_outlines", memoryLevel);
    const userPrompt = buildChapterOutlineUserPrompt(project, volumeNumber);

    // 获取设定模型和 maxTokens（环境变量优先）
    const settingModel = process.env.SETTING_MODEL || project.settings.settingModel || "gpt-4-turbo";
    const maxTokens = parseInt(process.env.MAX_TOKENS || String(project.settings.maxTokens)) || 4096;
    
    // 调用 AI 生成（增加 token 限制，避免长卷被截断）
    const { data: newChapters, usage } = await generateJSON<Chapter[]>({
      model: settingModel,
      systemPrompt,
      userPrompt,
      maxTokens: Math.min(maxTokens, 16000),
      temperature: 0.7,
    });

    // 合并新章节到现有章节（替换同卷章节）
    const existingChapters = project.chapters.filter(
      c => c.volumeNumber !== volumeNumber
    );
    const mergedChapters = [...existingChapters, ...newChapters];
    
    // 重新排序
    mergedChapters.sort((a, b) => {
      if (a.volumeNumber !== b.volumeNumber) {
        return a.volumeNumber - b.volumeNumber;
      }
      return a.chapterNumberInVolume - b.chapterNumberInVolume;
    });

    // 更新全书章节序号
    mergedChapters.forEach((chapter, index) => {
      chapter.chapterNumber = index + 1;
    });

    // 保存章节
    await updateChapters(id, mergedChapters);

    return NextResponse.json({
      success: true,
      data: newChapters,
      usage,
    });
  } catch (error) {
    console.error("Failed to generate chapter outlines:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : "生成章节大纲失败" 
      },
      { status: 500 }
    );
  }
}
