/**
 * 删除项目 API
 * 删除项目所有数据，但保留 output 文件夹
 */

import { NextRequest, NextResponse } from "next/server";
import { deleteProject } from "@/lib/db/projects";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  
  try {
    const success = await deleteProject(id);
    
    if (!success) {
      return NextResponse.json(
        { error: "项目不存在或删除失败" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "项目已删除，导出文件已保留",
    });
  } catch (error) {
    console.error("Failed to delete project:", error);
    return NextResponse.json(
      { error: "删除项目失败" },
      { status: 500 }
    );
  }
}
