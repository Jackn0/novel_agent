/**
 * 音频文件服务 API
 * 用于提供有声小说生成的音频文件访问
 * GET /api/audio-file?path=有声小说-xxx/1-1-1.mp3
 */

import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const filePathParam = searchParams.get("path");
    
    if (!filePathParam) {
      return NextResponse.json(
        { success: false, error: "路径不能为空" },
        { status: 400 }
      );
    }

    // 防止目录遍历攻击
    const sanitizedPath = filePathParam.replace(/\.\./g, "").replace(/\\/g, "/");
    
    // 构建文件路径
    const filePath = path.join(process.cwd(), "output", sanitizedPath);
    
    // 安全检查：确保文件在 output 目录内
    const outputDir = path.join(process.cwd(), "output");
    const resolvedPath = path.resolve(filePath);
    const resolvedOutputDir = path.resolve(outputDir);
    
    if (!resolvedPath.startsWith(resolvedOutputDir)) {
      return NextResponse.json(
        { success: false, error: "非法路径" },
        { status: 403 }
      );
    }

    // 检查文件是否存在
    try {
      await fs.access(filePath);
    } catch {
      return NextResponse.json(
        { success: false, error: "文件不存在" },
        { status: 404 }
      );
    }

    // 读取文件
    const fileBuffer = await fs.readFile(filePath);
    
    // 根据文件扩展名设置 Content-Type
    const ext = path.extname(filePath).toLowerCase();
    const contentTypeMap: Record<string, string> = {
      ".mp3": "audio/mpeg",
      ".wav": "audio/wav",
      ".m4a": "audio/mp4",
      ".ogg": "audio/ogg",
    };
    const contentType = contentTypeMap[ext] || "application/octet-stream";

    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400", // 缓存24小时
      },
    });

  } catch (error) {
    console.error("Failed to serve audio file:", error);
    return NextResponse.json(
      { success: false, error: "服务文件失败" },
      { status: 500 }
    );
  }
}
