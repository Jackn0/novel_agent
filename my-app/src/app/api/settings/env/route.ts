import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

const ENV_FILE = path.join(process.cwd(), ".env.local");

interface EnvSettings {
  ANTHROPIC_API_KEY?: string;
  OPENAI_API_KEY?: string;
  OPENAI_BASE_URL?: string;
  SETTING_MODEL?: string;
  WRITING_MODEL?: string;
  MAX_TOKENS?: string;
  MEMORY_LEVEL?: string;
}

// 允许读取的变量名列表
const ALLOWED_KEYS: (keyof EnvSettings)[] = [
  "ANTHROPIC_API_KEY",
  "OPENAI_API_KEY",
  "OPENAI_BASE_URL",
  "SETTING_MODEL",
  "WRITING_MODEL",
  "MAX_TOKENS",
  "MEMORY_LEVEL",
];

// 从 process.env 读取当前设置
function getSettingsFromEnv(): EnvSettings {
  return {
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    OPENAI_BASE_URL: process.env.OPENAI_BASE_URL,
    SETTING_MODEL: process.env.SETTING_MODEL,
    WRITING_MODEL: process.env.WRITING_MODEL,
    MAX_TOKENS: process.env.MAX_TOKENS,
    MEMORY_LEVEL: process.env.MEMORY_LEVEL,
  };
}

// 读取 .env.local 文件（用于写入时保留其他未管理的变量）
function parseEnvFile(content: string): Record<string, string> {
  const settings: Record<string, string> = {};
  const lines = content.split("\n");
  
  for (const line of lines) {
    const trimmed = line.trim();
    // 跳过注释和空行
    if (!trimmed || trimmed.startsWith("#")) continue;
    
    // 支持 KEY=VALUE 格式，VALUE 可以包含等号
    const equalIndex = trimmed.indexOf("=");
    if (equalIndex === -1) continue;
    
    const key = trimmed.substring(0, equalIndex).trim();
    const value = trimmed.substring(equalIndex + 1).trim();
    
    settings[key] = value;
  }
  
  return settings;
}

// 生成 .env.local 内容
function generateEnvFile(settings: Record<string, string>): string {
  const lines: string[] = [
    "# API Configuration",
    `ANTHROPIC_API_KEY=${settings.ANTHROPIC_API_KEY || ""}`,
    `OPENAI_API_KEY=${settings.OPENAI_API_KEY || ""}`,
    `OPENAI_BASE_URL=${settings.OPENAI_BASE_URL || ""}`,
    "",
    "# Model Settings",
    `SETTING_MODEL=${settings.SETTING_MODEL || "gpt-4-turbo"}`,
    `WRITING_MODEL=${settings.WRITING_MODEL || "gpt-4-turbo"}`,
    "",
    "# Token & Memory Settings",
    `MAX_TOKENS=${settings.MAX_TOKENS || "4096"}`,
    `MEMORY_LEVEL=${settings.MEMORY_LEVEL || "3"}`,
  ];
  
  return lines.join("\n");
}

// GET: 读取 .env.local 设置
export async function GET() {
  try {
    // 从 process.env 读取当前设置（Next.js 在启动时已加载 .env.local）
    const settings = getSettingsFromEnv();
    
    const apiKey = settings.ANTHROPIC_API_KEY || settings.OPENAI_API_KEY || "";
    const baseUrl = settings.OPENAI_BASE_URL || "";
    const settingModel = settings.SETTING_MODEL || "gpt-4-turbo";
    const writingModel = settings.WRITING_MODEL || "gpt-4-turbo";
    const maxTokens = parseInt(settings.MAX_TOKENS || "4096");
    const memoryLevel = parseInt(settings.MEMORY_LEVEL || "3");
    
    console.log("[Env API] Returning settings:", {
      hasApiKey: !!apiKey,
      baseUrl,
      settingModel,
      writingModel,
      maxTokens,
      memoryLevel,
    });
    
    return NextResponse.json({
      success: true,
      data: {
        apiKey,
        baseUrl,
        settingModel,
        writingModel,
        maxTokens,
        memoryLevel,
      },
    });
  } catch (error) {
    console.error("[Env API] Failed to read env settings:", error);
    return NextResponse.json(
      { success: false, error: "读取设置失败" },
      { status: 500 }
    );
  }
}

// POST: 保存设置到 .env.local
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      apiKey,
      baseUrl,
      settingModel,
      writingModel,
      maxTokens,
      memoryLevel,
    } = body;

    // 读取现有文件内容（保留其他未管理的变量）
    let existingSettings: Record<string, string> = {};
    try {
      const content = await fs.readFile(ENV_FILE, "utf-8");
      existingSettings = parseEnvFile(content);
    } catch {
      // 文件不存在，创建新文件
    }

    // 更新设置
    const newSettings: Record<string, string> = {
      ...existingSettings,
      SETTING_MODEL: settingModel || "gpt-4-turbo",
      WRITING_MODEL: writingModel || "gpt-4-turbo",
      MAX_TOKENS: String(maxTokens || "4096"),
      MEMORY_LEVEL: String(memoryLevel || "3"),
    };

    // 根据 baseUrl 判断 API Key 类型
    if (apiKey) {
      if (baseUrl?.includes("anthropic") || apiKey.startsWith("sk-ant-")) {
        newSettings.ANTHROPIC_API_KEY = apiKey;
        // 清除可能冲突的 OpenAI Key
        if (!baseUrl?.includes("openai")) {
          delete newSettings.OPENAI_API_KEY;
        }
      } else {
        newSettings.OPENAI_API_KEY = apiKey;
      }
    }

    if (baseUrl) {
      newSettings.OPENAI_BASE_URL = baseUrl;
    }

    // 生成新的文件内容
    const newContent = generateEnvFile(newSettings);

    // 写入文件（持久化）
    await fs.writeFile(ENV_FILE, newContent, "utf-8");

    console.log("[Env API] Settings saved to .env.local:", {
      settingModel: newSettings.SETTING_MODEL,
      writingModel: newSettings.WRITING_MODEL,
      maxTokens: newSettings.MAX_TOKENS,
      memoryLevel: newSettings.MEMORY_LEVEL,
      hasApiKey: !!(newSettings.ANTHROPIC_API_KEY || newSettings.OPENAI_API_KEY),
      hasBaseUrl: !!newSettings.OPENAI_BASE_URL,
    });

    return NextResponse.json({
      success: true,
      message: "设置已保存，需要重启服务后生效",
      needRestart: true,
    });
  } catch (error) {
    console.error("[Env API] Failed to save env settings:", error);
    return NextResponse.json(
      { success: false, error: "保存设置失败" },
      { status: 500 }
    );
  }
}
