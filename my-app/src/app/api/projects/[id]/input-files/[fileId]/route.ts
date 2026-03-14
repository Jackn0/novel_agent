/**
 * 单个输入文件管理 API
 */

import { NextRequest, NextResponse } from "next/server";
import { getProject, updateProject } from "@/lib/db/projects";
import fs from "fs/promises";
import path from "path";

interface RouteParams {
  params: Promise<{ id: string; fileId: string }>;
}

// 获取项目输入文件目录
function getInputDir(projectId: string): string {
  return path.join(process.cwd(), "data", "projects", projectId, "input");
}

// DELETE: 删除输入文件
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { id, fileId } = await params;
  
  try {
    const project = await getProject(id);
    if (!project) {
      return NextResponse.json({ error: "项目不存在" }, { status: 404 });
    }

    const inputFiles = project.continuation?.inputFiles || [];
    const fileToDelete = inputFiles.find(f => f.id === fileId);
    
    if (!fileToDelete) {
      return NextResponse.json({ error: "文件不存在" }, { status: 404 });
    }

    // 从列表中移除
    const updatedFiles = inputFiles.filter(f => f.id !== fileId);
    
    // 更新项目数据
    await updateProject(id, {
      continuation: {
        ...project.continuation,
        isActive: project.continuation?.isActive ?? false,
        continuationNumber: project.continuation?.continuationNumber ?? 0,
        inputFiles: updatedFiles,
      },
    });

    // 尝试删除物理文件（如果存在）
    try {
      const inputDir = getInputDir(id);
      const files = await fs.readdir(inputDir);
      // 查找包含fileId的文件（实际文件名包含时间戳和uuid）
      const physicalFile = files.find(f => f.includes(fileId.slice(0, 8)));
      if (physicalFile) {
        await fs.unlink(path.join(inputDir, physicalFile));
      }
    } catch {
      // 忽略物理文件删除错误
    }

    return NextResponse.json({
      success: true,
      message: "文件已删除",
    });
  } catch (error) {
    console.error("Failed to delete input file:", error);
    return NextResponse.json({ error: "删除文件失败" }, { status: 500 });
  }
}
