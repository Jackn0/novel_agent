/**
 * 输入文件管理 API
 * 用于上传、删除、列出项目的输入文件（用于续写）
 */

import { NextRequest, NextResponse } from "next/server";
import { getProject, updateProject } from "@/lib/db/projects";
import fs from "fs/promises";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import type { InputFile } from "@/types/novel";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// 获取项目输入文件目录
function getInputDir(projectId: string): string {
  return path.join(process.cwd(), "data", "projects", projectId, "input");
}

// 确保输入目录存在
async function ensureInputDir(projectId: string) {
  const inputDir = getInputDir(projectId);
  try {
    await fs.access(inputDir);
  } catch {
    await fs.mkdir(inputDir, { recursive: true });
  }
  return inputDir;
}

// GET: 列出所有输入文件
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  
  try {
    const project = await getProject(id);
    if (!project) {
      return NextResponse.json({ error: "项目不存在" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      files: project.continuation?.inputFiles || [],
    });
  } catch (error) {
    console.error("Failed to get input files:", error);
    return NextResponse.json({ error: "获取输入文件列表失败" }, { status: 500 });
  }
}

// POST: 上传输入文件
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  
  try {
    const project = await getProject(id);
    if (!project) {
      return NextResponse.json({ error: "项目不存在" }, { status: 404 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;
    
    if (!file) {
      return NextResponse.json({ error: "没有提供文件" }, { status: 400 });
    }

    // 检查文件类型
    const fileName = file.name.toLowerCase();
    if (!fileName.endsWith(".txt") && !fileName.endsWith(".md")) {
      return NextResponse.json(
        { error: "仅支持 .txt 和 .md 文件" },
        { status: 400 }
      );
    }

    // 检查文件大小（限制 10MB）
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "文件大小不能超过 10MB" },
        { status: 400 }
      );
    }

    // 确保输入目录存在
    const inputDir = await ensureInputDir(id);

    // 生成唯一文件名
    const fileExt = fileName.endsWith(".md") ? "md" : "txt";
    const uniqueName = `${Date.now()}_${uuidv4().slice(0, 8)}.${fileExt}`;
    const filePath = path.join(inputDir, uniqueName);

    // 读取文件内容
    const bytes = await file.arrayBuffer();
    const content = Buffer.from(bytes).toString("utf-8");

    // 保存文件到磁盘
    await fs.writeFile(filePath, content, "utf-8");

    // 创建输入文件记录
    const inputFile: InputFile = {
      id: uuidv4(),
      filename: file.name,
      type: fileExt,
      size: file.size,
      content: content.slice(0, 50000), // 只存储前50000字符到数据库
      uploadedAt: new Date().toISOString(),
      processed: false,
    };

    // 更新项目数据
    const currentFiles = project.continuation?.inputFiles || [];
    await updateProject(id, {
      continuation: {
        ...project.continuation,
        isActive: project.continuation?.isActive ?? false,
        continuationNumber: project.continuation?.continuationNumber ?? 0,
        inputFiles: [...currentFiles, inputFile],
      },
    });

    return NextResponse.json({
      success: true,
      file: inputFile,
    });
  } catch (error) {
    console.error("Failed to upload input file:", error);
    return NextResponse.json({ error: "上传文件失败" }, { status: 500 });
  }
}
