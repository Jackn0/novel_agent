/**
 * POST /api/projects/:id/detect-characters
 * 从正文内容中检测涉及的人物
 */

import { NextRequest, NextResponse } from "next/server";
import { getProject, updateProject } from "@/lib/db/projects";
import { generateJSON, isAPIKeyConfigured } from "@/lib/agent/clients";
import { buildCompleteSystemPrompt } from "@/lib/agent/prompts";
import { buildCharacterDetectionPrompt } from "@/lib/agent/audio-prompts";
import type { DiscoveredCharacter } from "@/types/novel";

interface RouteParams {
  params: Promise<{ id: string }>;
}

interface DetectRequest {
  content: string;
  chapterNumber?: number;
  sectionNumber?: number;
  saveToProject?: boolean;  // 是否保存到项目
}

interface DetectedCharacter {
  name: string;
  role: "protagonist" | "supporting" | "antagonist" | "neutral";
  action: string;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body: DetectRequest = await request.json();
    const { content, chapterNumber, sectionNumber, saveToProject = true } = body;

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

    // 构建prompt
    const memoryLevel = project.settings.memoryLevel ?? 3;
    const systemPrompt = buildCompleteSystemPrompt(project, "writing", memoryLevel);
    const userPrompt = buildCharacterDetectionPrompt(
      project,
      `【待分析内容】\n${content}`
    );

    // 调用AI检测人物
    const settingModel = process.env.SETTING_MODEL || project.settings.settingModel || "gpt-4-turbo";
    const result = await generateJSON<{
      involvedCharacters: DetectedCharacter[];
    }>({
      model: settingModel,
      systemPrompt,
      userPrompt,
      maxTokens: 2000,
      temperature: 0.3,
    });

    const detectedCharacters = result.data.involvedCharacters || [];

    // 合并到项目的发现人物列表
    if (saveToProject && detectedCharacters.length > 0) {
      const existingCharacters = project.discoveredCharacters || [];
      
      for (const detected of detectedCharacters) {
        const existingIndex = existingCharacters.findIndex(
          c => c.name === detected.name
        );
        
        if (existingIndex >= 0) {
          // 更新现有人物
          existingCharacters[existingIndex].mentionCount++;
        } else {
          // 添加新人物
          const newChar: DiscoveredCharacter = {
            id: `discovered_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            name: detected.name,
            firstAppearChapter: chapterNumber,
            firstAppearSection: sectionNumber,
            mentionCount: 1,
          };
          existingCharacters.push(newChar);
        }
      }
      
      await updateProject(id, { discoveredCharacters: existingCharacters });
    }

    return NextResponse.json({
      success: true,
      data: detectedCharacters,
      totalDiscovered: project.discoveredCharacters?.length || 0,
    });

  } catch (error) {
    console.error("Failed to detect characters:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "检测失败" },
      { status: 500 }
    );
  }
}

// GET: 获取项目已发现的人物列表
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const project = await getProject(id);
    
    if (!project) {
      return NextResponse.json(
        { success: false, error: "项目不存在" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: project.discoveredCharacters || [],
    });

  } catch (error) {
    console.error("Failed to get discovered characters:", error);
    return NextResponse.json(
      { success: false, error: "获取失败" },
      { status: 500 }
    );
  }
}
