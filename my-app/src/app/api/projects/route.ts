import { NextRequest, NextResponse } from "next/server";
import { createProject, createContinuationProject, listProjects } from "@/lib/db/projects";
import type { CreateProjectRequest, InputFile } from "@/types/novel";

/**
 * GET /api/projects
 * 获取所有项目列表
 */
export async function GET() {
  try {
    const projects = await listProjects();
    return NextResponse.json({ success: true, data: projects });
  } catch (error) {
    console.error("Failed to list projects:", error);
    return NextResponse.json(
      { success: false, error: "获取项目列表失败" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/projects
 * 创建新项目
 */
export async function POST(request: NextRequest) {
  try {
    const body: CreateProjectRequest & { 
      projectType?: "original" | "continuation";
      originalTitle?: string;
      inputFiles?: InputFile[];
    } = await request.json();
    
    if (!body.title || body.title.trim() === "") {
      return NextResponse.json(
        { success: false, error: "项目标题不能为空" },
        { status: 400 }
      );
    }

    // 根据项目类型创建不同的项目
    let project;
    if (body.projectType === "continuation") {
      // 创建续写项目
      if (!body.originalTitle) {
        return NextResponse.json(
          { success: false, error: "续写项目需要提供原作标题" },
          { status: 400 }
        );
      }
      project = await createContinuationProject(
        body.title,
        body.originalTitle,
        body.inputFiles || [],
        body.meta
      );
    } else {
      // 创建原创项目
      project = await createProject(body.title, body.meta, "original");
    }
    
    return NextResponse.json({ success: true, data: project }, { status: 201 });
  } catch (error) {
    console.error("Failed to create project:", error);
    return NextResponse.json(
      { success: false, error: "创建项目失败" },
      { status: 500 }
    );
  }
}
