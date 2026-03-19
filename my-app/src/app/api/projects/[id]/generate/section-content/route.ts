import { NextRequest, NextResponse } from "next/server";
import { getProject, updateProject } from "@/lib/db/projects";
import { generateContent, generateJSON, isAPIKeyConfigured } from "@/lib/agent/clients";
import { buildSectionContentUserPrompt, buildCompleteSystemPrompt } from "@/lib/agent/prompts";
import { buildCharacterDetectionPrompt } from "@/lib/agent/audio-prompts";
import type { Chapter, Section, Character, NovelInstance, DiscoveredCharacter } from "@/types/novel";

interface RouteParams {
  params: Promise<{ id: string }>;
}

interface GenerateRequest {
  chapterId: string;
  sectionId: string;
  previousSectionEnding?: string;
  detectCharacters?: boolean; // 是否自动检测人物
}

/**
 * POST /api/projects/:id/generate/section-content
 * 生成小节正文内容
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body: GenerateRequest = await request.json();
    const { chapterId, sectionId, previousSectionEnding, detectCharacters = true } = body;

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

    // 查找章节和小节
    const chapter = project.chapters.find((c: Chapter) => c.id === chapterId);
    if (!chapter) {
      return NextResponse.json(
        { success: false, error: "章节不存在" },
        { status: 404 }
      );
    }

    const section = chapter.sections?.find((s: Section) => s.id === sectionId);
    if (!section) {
      return NextResponse.json(
        { success: false, error: "小节不存在" },
        { status: 404 }
      );
    }

    // 获取涉及的人物
    const involvedCharacters: Character[] = [];
    if (section.pov) {
      const povChar = project.bible.characters.find(c => c.id === section.pov);
      if (povChar) involvedCharacters.push(povChar);
    }
    // 从关键事件中提取涉及的人物
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

    // 获取记忆等级
    const memoryLevel = (project.settings.memoryLevel ?? parseInt(process.env.MEMORY_LEVEL || "3")) as 1 | 2 | 3 | 4 | 5;

    // 根据记忆等级获取前序小节内容（Level 4+ 需要）
    let previousSections: Section[] | undefined;
    if (memoryLevel >= 4 && chapter.sections) {
      const currentIndex = chapter.sections.findIndex((s: Section) => s.id === sectionId);
      if (currentIndex > 0) {
        // 获取当前小节之前的所有小节
        previousSections = chapter.sections.slice(0, currentIndex);
      }
    }

    // 构建上下文
    const context = {
      section,
      chapter,
      bible: project.bible,
      writingStyleSample: project.bible.meta.writingStyleSample,
      previousSectionEnding,
      previousSections,  // Level 4+ 会包含前序小节完整内容
      involvedCharacters,
      location,
      chapterProgress: `第 ${section.sectionNumber} / ${chapter.sections?.length || 1} 节`,
      povCharacter: involvedCharacters[0],
    };

    // 构建 prompts（memoryLevel 已在上面获取）
    const systemPrompt = buildCompleteSystemPrompt(project, "writing", memoryLevel);
    const userPrompt = buildSectionContentUserPrompt(context, memoryLevel, project);

    // 获取写作模型和 maxTokens（环境变量优先于项目设置）
    const writingModel = process.env.WRITING_MODEL || process.env.SETTING_MODEL || project.settings.writingModel || "gpt-4-turbo";
    const maxTokens = parseInt(process.env.MAX_TOKENS || String(project.settings.maxTokens)) || 4096;

    console.log("Generating section content with model:", writingModel);
    console.log("System prompt preview:", systemPrompt.substring(0, 200));
    console.log("User prompt preview:", userPrompt.substring(0, 200));
    
    // 调用 AI 生成
    const result = await generateContent({
      model: writingModel,
      systemPrompt,
      userPrompt,
      maxTokens: Math.min(maxTokens, 16000),
      temperature: 0.8,
    });

    console.log("Generated content preview:", result.content.substring(0, 200));

    // 检测涉及的人物（如果启用）
    let detectedCharacters: string[] = [];
    if (detectCharacters) {
      try {
        const settingModel = process.env.SETTING_MODEL || project.settings.settingModel || "gpt-4-turbo";
        const detectSystemPrompt = buildCompleteSystemPrompt(project, "writing", memoryLevel);
        const detectUserPrompt = buildCharacterDetectionPrompt(
          project,
          `【待分析内容】\n${result.content}`
        );
        
        const detectResult = await generateJSON<{
          involvedCharacters: { name: string; role: string; action: string }[];
        }>({
          model: settingModel,
          systemPrompt: detectSystemPrompt,
          userPrompt: detectUserPrompt,
          maxTokens: 1000,
          temperature: 0.3,
        });
        
        const characters = detectResult.data.involvedCharacters || [];
        detectedCharacters = characters.map(c => c.name);
        
        // 保存到项目
        if (characters.length > 0) {
          const existingCharacters = project.discoveredCharacters || [];
          
          for (const detected of characters) {
            const existingIndex = existingCharacters.findIndex(
              c => c.name === detected.name
            );
            
            if (existingIndex >= 0) {
              existingCharacters[existingIndex].mentionCount++;
            } else {
              const newChar: DiscoveredCharacter = {
                id: `discovered_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                name: detected.name,
                firstAppearChapter: chapter.chapterNumber,
                firstAppearSection: section.sectionNumber,
                mentionCount: 1,
              };
              existingCharacters.push(newChar);
            }
          }
          
          await updateProject(id, { discoveredCharacters: existingCharacters });
        }
        
        console.log("Detected characters:", detectedCharacters);
      } catch (error) {
        console.warn("Character detection failed:", error);
        // 不影响主流程
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        content: result.content,
        wordCount: result.content.length,
        detectedCharacters,
      },
      usage: result.usage,
    });
  } catch (error) {
    console.error("Failed to generate section content:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : "生成正文失败" 
      },
      { status: 500 }
    );
  }
}
