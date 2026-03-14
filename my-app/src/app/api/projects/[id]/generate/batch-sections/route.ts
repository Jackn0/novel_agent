import { NextRequest, NextResponse } from "next/server";
import { getProject, updateProject } from "@/lib/db/projects";
import { generateContent, isAPIKeyConfigured } from "@/lib/agent/clients";
import { buildSectionContentUserPrompt, buildCompleteSystemPrompt } from "@/lib/agent/prompts";
import type { Chapter, Section, Character, NovelInstance } from "@/types/novel";

interface RouteParams {
  params: Promise<{ id: string }>;
}

interface BatchGenerateRequest {
  type: "chapter" | "volume";
  chapterId?: string;
  volumeNumber?: number;
}

/**
 * POST /api/projects/:id/generate/batch-sections
 * 批量生成小节正文内容
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body: BatchGenerateRequest = await request.json();
    const { type, chapterId, volumeNumber } = body;

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

    const memoryLevel = parseInt(process.env.MEMORY_LEVEL || String(project.settings.memoryLevel)) as 1 | 2 | 3 | 4 | 5;
    const writingModel = process.env.WRITING_MODEL || process.env.SETTING_MODEL || project.settings.writingModel || "gpt-4-turbo";
    const maxTokens = parseInt(process.env.MAX_TOKENS || String(project.settings.maxTokens)) || 4096;

    // 确定要处理的小节列表
    let sectionsToGenerate: { chapter: Chapter; section: Section; previousEnding?: string }[] = [];

    let skippedCount = 0;

    if (type === "chapter" && chapterId) {
      // 生成指定章节的所有小节
      const chapter = project.chapters.find((c: Chapter) => c.id === chapterId);
      if (!chapter) {
        return NextResponse.json(
          { success: false, error: "章节不存在" },
          { status: 404 }
        );
      }

      // 只生成没有内容的小节
      const sections = chapter.sections || [];
      for (let i = 0; i < sections.length; i++) {
        const section = sections[i];
        // 跳过已有内容的小节
        if (section.content && section.content.length > 0) {
          skippedCount++;
          continue;
        }
        let previousEnding: string | undefined;
        if (i > 0 && sections[i - 1].content) {
          previousEnding = sections[i - 1].content!.slice(-100);
        }
        sectionsToGenerate.push({ chapter, section, previousEnding });
      }
    } else if (type === "volume" && volumeNumber) {
      // 生成指定卷的所有章节的所有小节
      const chapters = project.chapters.filter((c: Chapter) => c.volumeNumber === volumeNumber);
      for (const chapter of chapters) {
        const sections = chapter.sections || [];
        for (let i = 0; i < sections.length; i++) {
          const section = sections[i];
          // 跳过已有内容的小节
          if (section.content && section.content.length > 0) {
            skippedCount++;
            continue;
          }
          let previousEnding: string | undefined;
          if (i > 0 && sections[i - 1].content) {
            previousEnding = sections[i - 1].content!.slice(-100);
          }
          sectionsToGenerate.push({ chapter, section, previousEnding });
        }
      }
    } else {
      return NextResponse.json(
        { success: false, error: "无效的请求参数" },
        { status: 400 }
      );
    }

    if (sectionsToGenerate.length === 0) {
      return NextResponse.json(
        { 
          success: true, 
          data: {
            total: 0,
            success: 0,
            failed: 0,
            skipped: skippedCount,
            results: [],
          },
          message: skippedCount > 0 ? `所有小节都已有内容，跳过生成` : "没有需要生成的小节"
        }
      );
    }

    // 批量生成内容
    const results: { sectionId: string; content: string; success: boolean; error?: string }[] = [];
    
    for (const { chapter, section, previousEnding } of sectionsToGenerate) {
      try {
        // 获取涉及的人物
        const involvedCharacters: Character[] = [];
        if (section.pov) {
          const povChar = project.bible.characters.find(c => c.id === section.pov);
          if (povChar) involvedCharacters.push(povChar);
        }
        for (const event of chapter.keyEvents) {
          for (const charId of event.characters || []) {
            const char = project.bible.characters.find(c => c.id === charId);
            if (char && !involvedCharacters.find(c => c.id === char.id)) {
              involvedCharacters.push(char);
            }
          }
        }

        // 获取地点信息
        const location = project.bible.instances.find(
          (i: NovelInstance) => i.name === section.sceneLocation || i.id === section.sceneLocation
        );

        // 构建上下文
        const context = {
          section,
          chapter,
          bible: project.bible,
          writingStyleSample: project.bible.meta.writingStyleSample,
          previousSectionEnding: previousEnding,
          involvedCharacters,
          location,
          chapterProgress: `第 ${section.sectionNumber} / ${chapter.sections?.length || 1} 节`,
          povCharacter: involvedCharacters[0],
        };

        // 构建 prompts
        const systemPrompt = buildCompleteSystemPrompt(project, "writing", memoryLevel);
        const userPrompt = buildSectionContentUserPrompt(context, memoryLevel, project);

        // 调用 AI 生成
        const result = await generateContent({
          model: writingModel,
          systemPrompt,
          userPrompt,
          maxTokens: Math.min(maxTokens, 16000),
          temperature: 0.8,
        });

        results.push({
          sectionId: section.id,
          content: result.content,
          success: true,
        });

        // 更新小节内容
        const chapterIndex = project.chapters.findIndex((c: Chapter) => c.id === chapter.id);
        if (chapterIndex !== -1) {
          const sectionIndex = project.chapters[chapterIndex].sections.findIndex((s: Section) => s.id === section.id);
          if (sectionIndex !== -1) {
            project.chapters[chapterIndex].sections[sectionIndex].content = result.content;
            project.chapters[chapterIndex].sections[sectionIndex].wordCount = result.content.length;
            project.chapters[chapterIndex].sections[sectionIndex].contentStatus = "generated";
            project.chapters[chapterIndex].sections[sectionIndex].generatedAt = new Date().toISOString();
          }
        }
      } catch (error) {
        console.error(`Failed to generate section ${section.id}:`, error);
        results.push({
          sectionId: section.id,
          content: "",
          success: false,
          error: error instanceof Error ? error.message : "生成失败",
        });
      }
    }

    // 保存更新后的项目
    await updateProject(id, { chapters: project.chapters });

    const successCount = results.filter(r => r.success).length;
    const failCount = results.length - successCount;

    return NextResponse.json({
      success: failCount === 0,
      data: {
        total: results.length + skippedCount,
        generated: results.length,
        success: successCount,
        failed: failCount,
        skipped: skippedCount,
        results,
      },
    });

  } catch (error) {
    console.error("Failed to batch generate sections:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : "批量生成失败" 
      },
      { status: 500 }
    );
  }
}
