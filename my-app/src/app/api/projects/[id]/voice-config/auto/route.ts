/**
 * POST /api/projects/:id/voice-config/auto
 * 根据发现的角色自动生成语音配置建议
 */

import { NextRequest, NextResponse } from "next/server";
import { getProject, updateProject } from "@/lib/db/projects";
import type { ProjectVoiceConfig, CharacterVoice, TTSService } from "@/types/novel";

interface RouteParams {
  params: Promise<{ id: string }>;
}

interface AutoConfigRequest {
  discoveredCharacters: Array<{
    id: string;
    name: string;
    gender: "male" | "female" | "unknown";
    characterType: "protagonist" | "supporting" | "antagonist" | "neutral";
  }>;
  defaultService?: TTSService;
}

// Edge TTS 推荐音色
const RECOMMENDED_VOICES = {
  male: {
    protagonist: "zh-CN-YunxiNeural",
    supporting: "zh-CN-YunjianNeural",
    antagonist: "zh-CN-YunjianNeural",
    neutral: "zh-CN-YunxiNeural",
    narrator: "zh-CN-YunjianNeural",
  },
  female: {
    protagonist: "zh-CN-XiaoxiaoNeural",
    supporting: "zh-CN-XiaoxiaoNeural",
    antagonist: "zh-CN-XiaoxiaoNeural",
    neutral: "zh-CN-XiaoxiaoNeural",
    narrator: "zh-CN-XiaoxiaoNeural",
  },
  unknown: {
    protagonist: "zh-CN-YunxiNeural",
    supporting: "zh-CN-XiaoxiaoNeural",
    antagonist: "zh-CN-YunjianNeural",
    neutral: "zh-CN-YunxiNeural",
    narrator: "zh-CN-YunjianNeural",
  },
};

function getRecommendedVoice(
  gender: "male" | "female" | "unknown",
  characterType: "protagonist" | "supporting" | "antagonist" | "neutral"
): string {
  const genderKey = gender || "unknown";
  const typeKey = characterType || "neutral";
  return RECOMMENDED_VOICES[genderKey][typeKey] || RECOMMENDED_VOICES.unknown.neutral;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body: AutoConfigRequest = await request.json();
    const { discoveredCharacters, defaultService = "edge" } = body;

    const project = await getProject(id);
    if (!project) {
      return NextResponse.json(
        { success: false, error: "项目不存在" },
        { status: 404 }
      );
    }

    const existingConfig = project.voiceConfig || {
      defaultService,
      maxCharacters: 10,
      pauseBetweenLines: 500,
      characters: [],
    };

    const hasNarrator = existingConfig.characters.some(c => c.characterId === "narrator");
    const newCharacters: CharacterVoice[] = [...existingConfig.characters];
    
    if (!hasNarrator) {
      newCharacters.push({
        characterId: "narrator",
        characterName: "旁白",
        characterType: "narrator",
        service: defaultService,
        voiceId: RECOMMENDED_VOICES.male.narrator,
        speed: 1.0,
        pitch: 0,
        volume: 100,
      });
    }

    const addedCharacters: CharacterVoice[] = [];
    const skippedCharacters: string[] = [];

    for (const char of discoveredCharacters) {
      const exists = newCharacters.some(c => 
        c.characterId === char.id || c.characterName === char.name
      );
      
      if (exists) {
        skippedCharacters.push(char.name);
        continue;
      }

      if (newCharacters.length >= existingConfig.maxCharacters) {
        skippedCharacters.push(`${char.name} (超出最大角色数限制)`);
        continue;
      }

      const voiceConfig: CharacterVoice = {
        characterId: char.id,
        characterName: char.name,
        characterType: char.characterType === "protagonist" ? "hero" : 
                      char.characterType === "antagonist" ? "villain" : "supporting",
        service: defaultService,
        voiceId: getRecommendedVoice(char.gender, char.characterType),
        speed: 1.0,
        pitch: 0,
        volume: 100,
      };

      newCharacters.push(voiceConfig);
      addedCharacters.push(voiceConfig);
    }

    const updatedConfig: ProjectVoiceConfig = {
      ...existingConfig,
      characters: newCharacters,
    };

    await updateProject(id, { voiceConfig: updatedConfig });

    return NextResponse.json({
      success: true,
      data: {
        voiceConfig: updatedConfig,
        addedCharacters,
        skippedCharacters,
        totalCharacters: newCharacters.length,
      },
    });

  } catch (error) {
    console.error("Failed to auto configure voice:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "自动配置失败" },
      { status: 500 }
    );
  }
}
