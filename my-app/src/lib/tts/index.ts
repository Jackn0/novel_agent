/**
 * TTS 服务统一接口
 * 支持 Edge TTS 和百度 TTS
 */

import { exec } from "child_process";
import { promisify } from "util";
import {
  getBaiduAccessToken,
  synthesizeBaiduTTS,
  getBaiduPerByVoiceId,
  BAIDU_VOICES,
} from "./baidu";

const execAsync = promisify(exec);

export type TTSService = "edge" | "baidu";

/**
 * TTS 生成参数
 */
export interface TTSGenerateParams {
  text: string;
  voiceId: string;
  service?: TTSService;
  outputPath: string;
  speed?: number;
  pitch?: number;
  volume?: number;
}

/**
 * TTS 生成结果
 */
export interface TTSGenerateResult {
  success: boolean;
  outputPath: string;
  error?: string;
  duration?: number; // 估算时长（秒）
}

/**
 * 获取当前启用的 TTS 服务
 */
export function getEnabledTTSServices(): TTSService[] {
  const services: TTSService[] = [];

  // Edge TTS 默认启用（不需要 API Key）
  services.push("edge");

  // 百度 TTS（需要配置 API Key）
  if (process.env.BAIDU_TTS_API_KEY && process.env.BAIDU_TTS_SECRET_KEY) {
    services.push("baidu");
  }

  return services;
}

/**
 * 生成语音
 */
export async function generateTTS(
  params: TTSGenerateParams
): Promise<TTSGenerateResult> {
  const { text, voiceId, service, outputPath } = params;

  // 自动检测服务类型
  const detectedService = service || detectService(voiceId);

  try {
    switch (detectedService) {
      case "edge":
        return await generateEdgeTTS(params);
      case "baidu":
        return await generateBaiduTTS(params);
      default:
        throw new Error(`不支持的 TTS 服务: ${detectedService}`);
    }
  } catch (error) {
    console.error(`[TTS] 生成失败:`, error);
    return {
      success: false,
      outputPath,
      error: error instanceof Error ? error.message : "未知错误",
    };
  }
}

/**
 * 根据 voiceId 检测服务类型
 */
function detectService(voiceId: string): TTSService {
  if (voiceId.startsWith("baidu-")) {
    return "baidu";
  }
  // 默认使用 Edge TTS
  return "edge";
}

/**
 * 使用 Edge TTS 生成语音
 */
async function generateEdgeTTS(
  params: TTSGenerateParams
): Promise<TTSGenerateResult> {
  const { text, voiceId, outputPath } = params;

  // 限制文本长度
  const maxLength = 3000;
  const limitedText = text.slice(0, maxLength);
  const escapedText = limitedText.replace(/"/g, '\\"').replace(/\n/g, " ");

  const command = `edge-tts --voice "${voiceId}" --text "${escapedText}" --write-media "${outputPath}"`;

  const { stderr } = await execAsync(command, { timeout: 60000 });

  if (stderr) {
    console.warn("[EdgeTTS] stderr:", stderr);
  }

  // 估算时长（约 1 秒 4-5 个汉字）
  const duration = Math.ceil(text.length / 5);

  return {
    success: true,
    outputPath,
    duration,
  };
}

/**
 * 使用百度 TTS 生成语音
 */
async function generateBaiduTTS(
  params: TTSGenerateParams
): Promise<TTSGenerateResult> {
  const { text, voiceId, outputPath, speed, pitch, volume } = params;

  const apiKey = process.env.BAIDU_TTS_API_KEY;
  const secretKey = process.env.BAIDU_TTS_SECRET_KEY;

  if (!apiKey || !secretKey) {
    throw new Error("百度 TTS API Key 或 Secret Key 未配置");
  }

  // 获取 Access Token
  const accessToken = await getBaiduAccessToken(apiKey, secretKey);

  // 获取发音人 ID
  const per = getBaiduPerByVoiceId(voiceId);

  // 百度 TTS 限制：最大 512 个中文字符
  const maxLength = 512;
  const limitedText = text.slice(0, maxLength);

  // 调用百度 TTS
  const audioBuffer = await synthesizeBaiduTTS(accessToken, {
    text: limitedText,
    per,
    spd: speed ? Math.round(speed * 5) : 5, // Edge: 0.5-2.0 -> Baidu: 0-15
    pit: pitch ? Math.round((pitch + 1) * 7.5) : 5, // Edge: -1 to 1 -> Baidu: 0-15
    vol: volume ? Math.round((volume / 100) * 15) : 5, // Edge: 0-100 -> Baidu: 0-15
    aue: 3, // MP3 格式
  });

  // 保存音频文件
  const fs = await import("fs/promises");
  await fs.writeFile(outputPath, audioBuffer);

  // 估算时长（约 1 秒 4-5 个汉字）
  const duration = Math.ceil(text.length / 5);

  return {
    success: true,
    outputPath,
    duration,
  };
}

// 导出百度 TTS 相关
export { BAIDU_VOICES, getBaiduPerByVoiceId };
