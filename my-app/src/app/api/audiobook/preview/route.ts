/**
 * POST /api/audiobook/preview
 * 生成音色试听音频
 * 支持 Edge TTS 和 百度 TTS
 */

import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import { promises as fs } from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { generateTTS } from "@/lib/tts";

const execAsync = promisify(exec);

const PREVIEW_TEXT = "你好，我是你的有声小说配音助手。这是音色试听，你可以听听这个声音是否符合你的需求。";

interface PreviewRequest {
  voiceId: string;
  text?: string;
}

export async function POST(request: NextRequest) {
  const tempFiles: string[] = [];

  try {
    const body: PreviewRequest = await request.json();
    const { voiceId, text = PREVIEW_TEXT } = body;

    if (!voiceId) {
      return NextResponse.json(
        { success: false, error: "缺少音色ID" },
        { status: 400 }
      );
    }

    // 创建临时目录
    const tempDir = path.join(process.cwd(), "temp", "preview");
    await fs.mkdir(tempDir, { recursive: true });

    // 生成临时文件名
    const previewId = uuidv4();
    const mp3Path = path.join(tempDir, `${previewId}.mp3`);
    tempFiles.push(mp3Path);

    console.log(`[Preview] Generating preview for voice: ${voiceId}`);

    // 限制试听文本长度
    const limitedText = text.slice(0, 200);

    // 判断音色类型并调用相应的 TTS 服务
    if (voiceId.startsWith("baidu-")) {
      // 使用百度 TTS
      const result = await generateTTS({
        text: limitedText,
        voiceId,
        outputPath: mp3Path,
      });

      if (!result.success) {
        throw new Error(result.error || "百度 TTS 试听生成失败");
      }
    } else {
      // 使用 Edge TTS
      // 验证音色ID格式（只允许合法的 Edge TTS 音色）
      const validVoicePattern = /^[a-z]{2}-[A-Z]{2}-[A-Za-z]+Neural$/;
      if (!validVoicePattern.test(voiceId)) {
        return NextResponse.json(
          { success: false, error: "非法的音色ID" },
          { status: 400 }
        );
      }

      const escapedText = limitedText.replace(/"/g, '\\"');
      const command = `edge-tts --voice "${voiceId}" --text "${escapedText}" --write-media "${mp3Path}"`;

      const { stderr } = await execAsync(command, { timeout: 30000 });

      if (stderr) {
        console.warn("[Preview] edge-tts stderr:", stderr);
      }
    }

    // 检查文件是否生成成功
    try {
      await fs.access(mp3Path);
    } catch {
      throw new Error("音频生成失败，文件未创建");
    }

    const stats = await fs.stat(mp3Path);
    if (stats.size === 0) {
      throw new Error("音频生成失败，文件为空");
    }

    console.log(`[Preview] Generated: ${stats.size} bytes`);

    // 读取音频文件并返回
    const audioBuffer = await fs.readFile(mp3Path);

    // 清理临时文件
    try {
      await fs.unlink(mp3Path);
    } catch {
      // 忽略清理错误
    }

    return new NextResponse(audioBuffer, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": stats.size.toString(),
        "Cache-Control": "public, max-age=3600", // 缓存1小时
      },
    });

  } catch (error) {
    console.error("[Preview] Error:", error);

    // 清理临时文件
    for (const file of tempFiles) {
      try {
        await fs.unlink(file);
      } catch {
        // 忽略
      }
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "试听生成失败",
        details: error instanceof Error && error.message.includes("edge-tts")
          ? "请确保已安装 edge-tts: pip install edge-tts"
          : undefined
      },
      { status: 500 }
    );
  }
}
