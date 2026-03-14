import { NextRequest, NextResponse } from "next/server";
import { getProject } from "@/lib/db/projects";
import { generateContent, isAPIKeyConfigured } from "@/lib/agent/clients";
import { buildCompleteSystemPrompt } from "@/lib/agent/prompts";
import type { Chapter, Section } from "@/types/novel";

interface RouteParams {
  params: Promise<{ id: string }>;
}

interface CompletionRequest {
  chapterId: string;
  sectionId: string;
  contextBefore: string;
}

/**
 * POST /api/projects/:id/generate/completion
 * 生成 AI 写作补全建议
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body: CompletionRequest = await request.json();
    const { chapterId, sectionId, contextBefore } = body;

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

    const chapter = project.chapters.find((c: Chapter) => c.id === chapterId);
    const section = chapter?.sections?.find((s: Section) => s.id === sectionId);

    if (!chapter || !section) {
      return NextResponse.json(
        { success: false, error: "章节或小节不存在" },
        { status: 404 }
      );
    }

    // 获取主角名
    const protagonist = project.bible.characters.find(c => c.role === "protagonist");
    const protagonistName = protagonist?.name || "主角";

    // 获取记忆等级（环境变量优先）
    const memoryLevel = parseInt(process.env.MEMORY_LEVEL || String(project.settings.memoryLevel)) as 1 | 2 | 3 | 4 | 5;

    const systemPrompt = buildCompleteSystemPrompt(project, "writing", memoryLevel);
    
    const userPrompt = `请根据下文续写接下来的 1-2 句话，保持文风一致。

【重要】主角名字必须是"${protagonistName}"，禁止出现其他主角名！

【本节信息】
场景：${section.sceneTime} · ${section.sceneLocation}
情感：${section.emotionalBeat}
概要：${section.contentSummary}

【已写内容】
${contextBefore.slice(-500)}

【要求】
1. 续写 1-2 句话，约 30-80 字
2. 必须与上文自然衔接
3. 只输出续写的内容，不要重复上文
4. 禁止使用"林云"、"萧炎"等常见小说主角名

请续写：`;

    // 获取续写模型和 maxTokens
    const completionModel = project.settings.writingModel || process.env.COMPLETION_MODEL || process.env.WRITING_MODEL || process.env.SETTING_MODEL || "gpt-4-turbo";
    const maxTokens = project.settings.maxTokens || parseInt(process.env.MAX_TOKENS || "4096");

    const result = await generateContent({
      model: completionModel,
      systemPrompt,
      userPrompt,
      maxTokens: Math.min(maxTokens, 2000),
      temperature: 0.7,
    });

    // 清理响应，移除可能的重复内容
    let suggestion = result.content.trim();
    
    // 如果建议以已写内容结尾相同的文字开头，移除重复
    const lastWords = contextBefore.slice(-20).trim();
    if (suggestion.startsWith(lastWords)) {
      suggestion = suggestion.slice(lastWords.length).trim();
    }

    return NextResponse.json({
      success: true,
      data: {
        suggestion,
      },
    });
  } catch (error) {
    console.error("Failed to generate completion:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "生成补全失败" },
      { status: 500 }
    );
  }
}
