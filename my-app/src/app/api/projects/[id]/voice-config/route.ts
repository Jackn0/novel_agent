/**
 * 语音配置 API
 * GET: 获取项目语音配置
 * POST: 保存项目语音配置
 */

import { NextRequest, NextResponse } from "next/server";
import { getProject, updateProject } from "@/lib/db/projects";
import type { ProjectVoiceConfig, TTSService } from "@/types/novel";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// 获取环境变量中启用的TTS服务
function getEnabledTTSServices(): TTSService[] {
  const services: TTSService[] = [];
  
  // Edge TTS 不需要 API Key，默认启用
  services.push("edge");
  
  // 百度 TTS（需要配置 API Key）
  if (process.env.BAIDU_TTS_API_KEY && process.env.BAIDU_TTS_SECRET_KEY) {
    services.push("baidu");
  }
  
  return services;
}

// 获取默认语音配置
function getDefaultVoiceConfig(): ProjectVoiceConfig {
  const defaultService = (process.env.DEFAULT_TTS_SERVICE as TTSService) || "edge";
  
  return {
    maxCharacters: 10,
    defaultService,
    pauseBetweenLines: parseInt(process.env.DEFAULT_AUDIO_PAUSE_MS || "500"),
    characters: [
      {
        characterId: "narrator",
        characterName: "旁白",
        characterType: "narrator",
        service: defaultService,
        voiceId: "zh-CN-YunxiNeural", // Edge TTS 默认男声
        speed: 1.0,
        pitch: 0,
        volume: 100,
      },
    ],
  };
}

// GET: 获取语音配置
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
    
    // 如果没有语音配置，返回默认配置
    const voiceConfig = project.voiceConfig || getDefaultVoiceConfig();
    
    return NextResponse.json({
      success: true,
      data: {
        voiceConfig,
        enabledServices: getEnabledTTSServices(),
      },
    });
  } catch (error) {
    console.error("Failed to get voice config:", error);
    return NextResponse.json(
      { success: false, error: "获取语音配置失败" },
      { status: 500 }
    );
  }
}

// POST: 保存语音配置
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const project = await getProject(id);
    
    if (!project) {
      return NextResponse.json(
        { success: false, error: "项目不存在" },
        { status: 404 }
      );
    }
    
    const { voiceConfig } = await request.json();
    
    // 验证配置
    if (!voiceConfig || !voiceConfig.characters || voiceConfig.characters.length === 0) {
      return NextResponse.json(
        { success: false, error: "语音配置不能为空" },
        { status: 400 }
      );
    }
    
    // 检查是否有旁白配置
    const hasNarrator = voiceConfig.characters.some(
      (c: { characterId: string }) => c.characterId === "narrator"
    );
    if (!hasNarrator) {
      return NextResponse.json(
        { success: false, error: "必须配置旁白角色" },
        { status: 400 }
      );
    }
    
    // 更新项目
    const updatedProject = await updateProject(id, { voiceConfig });
    
    return NextResponse.json({
      success: true,
      data: updatedProject?.voiceConfig,
    });
  } catch (error) {
    console.error("Failed to save voice config:", error);
    return NextResponse.json(
      { success: false, error: "保存语音配置失败" },
      { status: 500 }
    );
  }
}
