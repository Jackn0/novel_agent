/**
 * Edge TTS 提供商实现
 * 使用微软Edge浏览器的TTS服务（免费）
 * 需要安装 edge-tts: pip install edge-tts
 */

import { spawn } from "child_process";
import fs from "fs/promises";
import path from "path";
import type { TTSProvider, VoiceOption, SynthesizeOptions, SynthesizeResult } from "./base";

// Edge TTS 中文音色
const EDGE_VOICES: VoiceOption[] = [
  {
    id: "zh-CN-XiaoxiaoNeural",
    name: "晓晓 (女声-温柔)",
    gender: "female",
    language: ["zh-CN"],
    description: "温柔知性的年轻女声，适合女主角",
  },
  {
    id: "zh-CN-YunxiNeural",
    name: "云希 (男声-自然)",
    gender: "male",
    language: ["zh-CN"],
    description: "自然沉稳的年轻男声，适合男主角",
  },
  {
    id: "zh-CN-YunjianNeural",
    name: "云健 (男声-新闻)",
    gender: "male",
    language: ["zh-CN"],
    description: "稳重正式的男声，适合旁白",
  },
  {
    id: "zh-CN-XiaoyiNeural",
    name: "晓伊 (女声-儿童)",
    gender: "female",
    language: ["zh-CN"],
    description: "活泼可爱的女童声",
  },
  {
    id: "zh-TW-HsiaoChenNeural",
    name: "曉臻 (台湾女声)",
    gender: "female",
    language: ["zh-TW"],
    description: "温柔的台湾女声",
  },
  {
    id: "zh-HK-HiuMaanNeural",
    name: "曉曼 (粤语女声)",
    gender: "female",
    language: ["zh-HK"],
    description: "粤语女声",
  },
];

export class EdgeTTSProvider implements TTSProvider {
  readonly name = "edge";
  readonly nameCN = "Edge TTS (免费)";

  isConfigured(): boolean {
    // Edge TTS 不需要API Key，只需要安装edge-tts
    return true;
  }

  async getVoices(): Promise<VoiceOption[]> {
    return EDGE_VOICES;
  }

  async synthesize(options: SynthesizeOptions): Promise<SynthesizeResult> {
    const { text, voiceId, speed = 1.0, outputFile } = options;
    
    console.log(`[EdgeTTS] Synthesizing: voice=${voiceId}, speed=${speed}, textLength=${text.length}`);
    console.log(`[EdgeTTS] Output: ${outputFile}`);

    // 确保输出目录存在
    await fs.mkdir(path.dirname(outputFile), { recursive: true });

    // 构建edge-tts命令
    // rate: 语速，默认值是+0%，可以是+50%或-50%
    const ratePercent = Math.round((speed - 1.0) * 100);
    const rateStr = ratePercent >= 0 ? `+${ratePercent}%` : `${ratePercent}%`;

    return new Promise((resolve, reject) => {
      const args = [
        "-t", text,
        "--voice", voiceId,
        "--rate", rateStr,
        "--write-media", outputFile,
      ];
      
      console.log(`[EdgeTTS] Command: python -m edge_tts ${args.join(" ")}`);

      const process = spawn("python", ["-m", "edge_tts", ...args]);

      let stderr = "";
      process.stderr?.on("data", (data) => {
        stderr += data.toString();
      });

      process.on("close", async (code) => {
        if (code === 0) {
          try {
            const stats = await fs.stat(outputFile);
            // Edge TTS 不直接返回时长，我们估算：中文大约每秒4-5个字
            const duration = text.length / 4.5;
            
            console.log(`[EdgeTTS] Success: ${outputFile}, size=${stats.size}, duration=${duration.toFixed(2)}s`);
            
            resolve({
              filePath: outputFile,
              duration,
              fileSize: stats.size,
            });
          } catch (error) {
            console.error(`[EdgeTTS] Failed to read output file:`, error);
            reject(new Error(`无法读取生成的音频文件: ${error}`));
          }
        } else {
          console.error(`[EdgeTTS] Failed with code ${code}: ${stderr}`);
          reject(new Error(`edge-tts 失败 (code ${code}): ${stderr}`));
        }
      });

      process.on("error", (error) => {
        console.error(`[EdgeTTS] Process error:`, error);
        if ((error as NodeJS.ErrnoException).code === "ENOENT") {
          reject(new Error(
            "未找到 Python 或 edge-tts 模块。请检查:\n" +
            "1. Python 是否已安装: python --version\n" +
            "2. edge-tts 是否已安装: pip install edge-tts"
          ));
        } else {
          reject(error);
        }
      });
    });
  }
}
