/**
 * POST /api/audiobook/create
 * 创建有声小说项目
 */

import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { promises as fs } from "fs";
import path from "path";
import type { NovelProject, AudiobookSegment, AudiobookSource } from "@/types/novel";

const DATA_DIR = path.join(process.cwd(), "data", "projects");

async function ensureDataDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

function getProjectFilePath(projectId: string): string {
  return path.join(DATA_DIR, `${projectId}.json`);
}

async function saveProject(project: NovelProject): Promise<void> {
  await ensureDataDir();
  await fs.writeFile(
    getProjectFilePath(project.id),
    JSON.stringify(project, null, 2),
    "utf-8"
  );
}

interface CreateAudiobookRequest {
  title: string;
  source: AudiobookSource;
  segments: AudiobookSegment[];
  voiceConfig?: {
    defaultService: "edge";
    maxCharacters: number;
    pauseBetweenLines: number;
  };
}

export async function POST(request: NextRequest) {
  try {
    const body: CreateAudiobookRequest = await request.json();
    const { title, source, segments, voiceConfig } = body;
    
    if (!title || !source || !segments) {
      return NextResponse.json(
        { success: false, error: "缺少必要参数" },
        { status: 400 }
      );
    }
    
    const now = new Date().toISOString();
    
    // 构建有声小说项目
    const project: NovelProject = {
      id: uuidv4(),
      title,
      createdAt: now,
      updatedAt: now,
      currentStage: "audiobook_content_review",
      projectType: "audiobook",
      
      // 空的圣经设定（有声小说不需要）
      bible: {
        meta: {
          title,
          genre: "audiobook",
          tone: "",
          targetAudience: "",
          wordCountTarget: 0,
          synopsis: "",
          themes: [],
        },
        characters: [],
        factions: [],
        instances: [],
        climaxScenes: [],
      },
      
      // 从段落生成章节结构
      outline: null,
      chapters: [],
      
      // 有声小说特有数据
      audiobookSource: source,
      audiobookSegments: segments,
      
      // 默认语音配置
      voiceConfig: {
        defaultService: voiceConfig?.defaultService || "edge",
        maxCharacters: voiceConfig?.maxCharacters || 15,
        pauseBetweenLines: voiceConfig?.pauseBetweenLines || 500,
        edgeTTSMode: "single",
        edgeSingleVoiceId: "zh-CN-YunjianNeural",
        characters: [
          {
            characterId: "narrator",
            characterName: "旁白",
            characterType: "narrator",
            service: voiceConfig?.defaultService || "edge",
            voiceId: "zh-CN-YunjianNeural",
            speed: 1.0,
            pitch: 0,
            volume: 100,
          },
        ],
      },
      
      // 其他字段
      settings: {
        settingModel: process.env.SETTING_MODEL || "gpt-4-turbo",
        writingModel: process.env.WRITING_MODEL || "gpt-4-turbo",
        language: "zh",
        sectionWordCountMin: 500,
        sectionWordCountMax: 1500,
        autoSaveEnabled: true,
        streamingEnabled: false,
        memoryLevel: 1,
        maxTokens: 4096,
      },
      foreshadowings: [],
      audioTasks: [],
      discoveredCharacters: [],
    };
    
    // 保存到数据库
    await saveProject(project);
    
    console.log(`[Audiobook Create] Created project: ${project.id}, title: ${title}, segments: ${segments.length}`);
    
    return NextResponse.json({
      success: true,
      data: {
        projectId: project.id,
        title: project.title,
        segmentCount: segments.length,
      },
    });
    
  } catch (error) {
    console.error("[Audiobook Create] Error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "创建失败" },
      { status: 500 }
    );
  }
}
