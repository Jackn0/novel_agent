import { NextRequest, NextResponse } from "next/server";
import { getProject, updateChapters } from "@/lib/db/projects";
import { generateJSON, isAPIKeyConfigured } from "@/lib/agent/clients";
import { buildSectionListUserPrompt, buildCompleteSystemPrompt } from "@/lib/agent/prompts";
import type { Chapter, Section } from "@/types/novel";

interface RouteParams {
  params: Promise<{ id: string }>;
}

interface GenerateRequest {
  chapterId: string;
  continuationContext?: {
    characters: unknown[];
    instances: unknown[];
    worldSettings?: Record<string, unknown>;
  };
}

/**
 * POST /api/projects/:id/generate/sections
 * 生成指定章节的小节列表
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body: GenerateRequest = await request.json();
    const { chapterId, continuationContext } = body;

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

    // 查找目标章节
    const chapter = project.chapters.find(c => c.id === chapterId);
    if (!chapter) {
      return NextResponse.json(
        { success: false, error: "章节不存在" },
        { status: 404 }
      );
    }

    // 获取记忆等级（环境变量优先）
    const memoryLevel = parseInt(process.env.MEMORY_LEVEL || String(project.settings.memoryLevel)) as 1 | 2 | 3 | 4 | 5;

    // 构建 prompts（支持续写上下文）
    const systemPrompt = buildCompleteSystemPrompt(project, "section_lists", memoryLevel);
    const userPrompt = buildSectionListUserPrompt(project, chapter, memoryLevel, continuationContext || undefined);

    // 获取设定模型和 maxTokens（环境变量优先）
    const settingModel = process.env.SETTING_MODEL || project.settings.settingModel || "gpt-4-turbo";
    const maxTokens = parseInt(process.env.MAX_TOKENS || String(project.settings.maxTokens)) || 4096;
    
    // 调用 AI 生成
    const { data: newSections, usage } = await generateJSON<Section[]>({
      model: settingModel,
      systemPrompt,
      userPrompt,
      maxTokens: Math.min(maxTokens, 16000),
      temperature: 0.7,
    });

    // 确保小节数据完整
    const validatedSections: Section[] = newSections.map((section, index) => ({
      id: section.id || crypto.randomUUID(),
      volumeNumber: chapter.volumeNumber,
      chapterNumber: chapter.chapterNumber,
      sectionNumber: section.sectionNumber || index + 1,
      title: section.title || `第${index + 1}小节`,
      wordCountTarget: section.wordCountTarget || 1000,
      sceneTime: section.sceneTime || "",
      sceneLocation: section.sceneLocation || "",
      contentSummary: section.contentSummary || "",
      emotionalBeat: section.emotionalBeat || "",
      pov: section.pov || "",
      writingNotes: section.writingNotes || "",
      contentStatus: "pending",
    }));

    // 更新章节的小节列表
    const updatedChapters = project.chapters.map(c => {
      if (c.id === chapterId) {
        return { ...c, sections: validatedSections };
      }
      return c;
    });

    // 保存
    await updateChapters(id, updatedChapters);

    return NextResponse.json({
      success: true,
      data: validatedSections,
      usage,
    });
  } catch (error) {
    console.error("Failed to generate sections:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : "生成小节列表失败" 
      },
      { status: 500 }
    );
  }
}
