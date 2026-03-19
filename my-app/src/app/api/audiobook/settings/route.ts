/**
 * GET/POST /api/audiobook/settings
 * 获取/保存有声小说语音配置到 .env.local
 */

import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

const ENV_FILE = path.join(process.cwd(), ".env.local");

// Edge-TTS 可用音色列表
const EDGE_VOICES = [
  // 男声（已验证稳定）
  { id: "zh-CN-YunjianNeural", name: "云健", gender: "male", description: "沉稳大气，适合旁白" },
  { id: "zh-CN-YunxiNeural", name: "云希", gender: "male", description: "年轻阳光，适合青年男性" },
  { id: "zh-CN-YunxiaNeural", name: "云夏", gender: "male", description: "活泼开朗，适合少年男性" },
  { id: "zh-CN-YunyangNeural", name: "云扬", gender: "male", description: "磁性低沉，适合中年男性" },
  // 女声（已验证稳定）
  { id: "zh-CN-XiaoxiaoNeural", name: "晓晓", gender: "female", description: "活泼自然，适合年轻女性" },
  { id: "zh-CN-XiaoyiNeural", name: "晓伊", gender: "female", description: "温柔知性，适合成熟女性" },
];

interface VoiceSettings {
  ttsService: string;
  edgeTTSMode: "single" | "multi";
  edgeSingleVoiceId: string;
  pauseBetweenLines: number;
}

// 从环境变量读取当前配置
function getSettingsFromEnv(): VoiceSettings {
  return {
    ttsService: process.env.AUDIOBOOK_TTS_SERVICE || "edge",
    edgeTTSMode: (process.env.AUDIOBOOK_EDGE_TTS_MODE as "single" | "multi") || "single",
    edgeSingleVoiceId: process.env.AUDIOBOOK_EDGE_SINGLE_VOICE || "zh-CN-YunjianNeural",
    pauseBetweenLines: parseInt(process.env.AUDIOBOOK_PAUSE_BETWEEN_LINES || "500"),
  };
}

// GET: 获取语音配置
export async function GET() {
  try {
    const settings = getSettingsFromEnv();
    
    return NextResponse.json({
      success: true,
      data: {
        settings,
        availableVoices: EDGE_VOICES,
      },
    });
  } catch (error) {
    console.error("[VoiceSettings] Error reading settings:", error);
    return NextResponse.json(
      { success: false, error: "读取配置失败" },
      { status: 500 }
    );
  }
}

// POST: 保存语音配置
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { settings }: { settings: VoiceSettings } = body;
    
    if (!settings) {
      return NextResponse.json(
        { success: false, error: "缺少配置参数" },
        { status: 400 }
      );
    }
    
    // 读取现有 .env.local 内容
    let envContent = "";
    try {
      envContent = await fs.readFile(ENV_FILE, 'utf-8');
    } catch {
      // 文件不存在，将创建新文件
    }
    
    // 解析现有配置
    const lines = envContent.split('\n');
    const envMap = new Map<string, string>();
    const commentLines: string[] = [];
    let inAudioConfig = false;
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      // 检测是否在音频配置区域
      if (trimmed.includes('音频生成配置') || trimmed.includes('有声小说配置')) {
        inAudioConfig = true;
        continue;
      }
      
      // 跳过旧的音频配置项（我们会重新添加）
      if (inAudioConfig && trimmed.startsWith('AUDIOBOOK_')) {
        continue;
      }
      
      // 解析普通配置项
      const match = line.match(/^([^=]+)=(.*)$/);
      if (match && !trimmed.startsWith('#')) {
        const key = match[1].trim();
        if (!key.startsWith('AUDIOBOOK_')) {
          envMap.set(key, match[2].trim());
        }
      }
    }
    
    // 构建新的 env 内容
    const newLines: string[] = [];
    
    // 添加非音频配置
    for (const [key, value] of envMap) {
      if (value.includes(' ') || value.includes('"')) {
        newLines.push(`${key}="${value.replace(/"/g, '\\"')}"`);
      } else {
        newLines.push(`${key}=${value}`);
      }
    }
    
    // 添加有声小说配置
    newLines.push('');
    newLines.push('# 有声小说语音配置');
    newLines.push('# 修改后需要重启服务器生效');
    newLines.push(`AUDIOBOOK_TTS_SERVICE=${settings.ttsService}`);
    newLines.push(`AUDIOBOOK_EDGE_TTS_MODE=${settings.edgeTTSMode}`);
    newLines.push(`AUDIOBOOK_EDGE_SINGLE_VOICE=${settings.edgeSingleVoiceId}`);
    newLines.push(`AUDIOBOOK_PAUSE_BETWEEN_LINES=${settings.pauseBetweenLines}`);
    
    // 写入文件
    await fs.writeFile(ENV_FILE, newLines.join('\n'), 'utf-8');
    
    console.log("[VoiceSettings] Saved settings to .env.local:", {
      ttsService: settings.ttsService,
      edgeTTSMode: settings.edgeTTSMode,
      edgeSingleVoiceId: settings.edgeSingleVoiceId,
    });
    
    return NextResponse.json({
      success: true,
      message: "配置已保存到 .env.local，请重启服务器后生效",
      data: {
        settings,
        needsRestart: true,
      },
    });
  } catch (error) {
    console.error("[VoiceSettings] Error saving settings:", error);
    return NextResponse.json(
      { success: false, error: "保存配置失败" },
      { status: 500 }
    );
  }
}
