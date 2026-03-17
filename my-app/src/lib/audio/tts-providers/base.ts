/**
 * TTS 服务商基础接口
 */

export interface VoiceOption {
  id: string;
  name: string;
  gender: "male" | "female" | "neutral";
  language: string[];
  description?: string;
  previewUrl?: string;
}

export interface SynthesizeOptions {
  text: string;
  voiceId: string;
  speed?: number;
  pitch?: number;
  volume?: number;
  emotion?: string;
  outputFile: string;
}

export interface SynthesizeResult {
  filePath: string;
  duration: number;  // 秒
  fileSize: number;  // bytes
}

export interface TTSProvider {
  readonly name: string;
  readonly nameCN: string;
  
  /**
   * 检查是否已配置（API Key等）
   */
  isConfigured(): boolean;
  
  /**
   * 获取可用音色列表
   */
  getVoices(): Promise<VoiceOption[]>;
  
  /**
   * 生成音频
   */
  synthesize(options: SynthesizeOptions): Promise<SynthesizeResult>;
}

/**
 * TTS 服务商工厂
 */
import { EdgeTTSProvider } from "./edge";

export function getTTSProvider(service: string): TTSProvider | null {
  switch (service) {
    case "edge":
      return new EdgeTTSProvider();
    // TODO: 添加其他服务商
    default:
      return null;
  }
}

export function getEnabledTTSServices(): string[] {
  const services: string[] = [];
  
  // Edge TTS 始终可用（免费）
  services.push("edge");
  
  // 检查其他服务是否配置
  if (process.env.ELEVENLABS_API_KEY) services.push("elevenlabs");
  if (process.env.OPENAI_TTS_API_KEY || process.env.OPENAI_API_KEY) services.push("openai");
  if (process.env.ALIYUN_ACCESS_KEY_ID) services.push("aliyun");
  if (process.env.BAIDU_TTS_API_KEY) services.push("baidu");
  if (process.env.TENCENT_SECRET_ID) services.push("tencent");
  
  return services;
}
