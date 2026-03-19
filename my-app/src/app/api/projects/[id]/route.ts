/**
 * 项目详情和更新 API
 */

import { NextRequest, NextResponse } from "next/server";
import { getProject, updateProject } from "@/lib/db/projects";
import type { NovelStage } from "@/types/novel";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET: 获取项目详情
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  
  try {
    const project = await getProject(id);
    if (!project) {
      return NextResponse.json({ error: "项目不存在" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: project,
    });
  } catch (error) {
    console.error("Failed to get project:", error);
    return NextResponse.json({ error: "获取项目失败" }, { status: 500 });
  }
}

// PATCH: 更新项目
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  
  try {
    const project = await getProject(id);
    if (!project) {
      return NextResponse.json({ error: "项目不存在" }, { status: 404 });
    }

    const updates = await request.json();
    
    // 只允许更新特定字段
    const allowedUpdates: Partial<typeof project> = {};
    
    if (updates.title !== undefined) {
      allowedUpdates.title = updates.title;
    }
    
    if (updates.currentStage !== undefined) {
      allowedUpdates.currentStage = updates.currentStage as NovelStage;
    }
    
    if (updates.bible !== undefined) {
      allowedUpdates.bible = { ...project.bible, ...updates.bible };
    }
    
    if (updates.outline !== undefined) {
      allowedUpdates.outline = updates.outline;
    }
    
    if (updates.chapters !== undefined) {
      allowedUpdates.chapters = updates.chapters;
    }
    
    if (updates.foreshadowings !== undefined) {
      allowedUpdates.foreshadowings = updates.foreshadowings;
    }
    
    if (updates.continuation !== undefined) {
      allowedUpdates.continuation = {
        ...project.continuation,
        ...updates.continuation,
      };
    }
    
    if (updates.settings !== undefined) {
      allowedUpdates.settings = {
        ...project.settings,
        ...updates.settings,
      };
    }
    
    // 有声小说特有字段
    if (updates.audiobookSegments !== undefined) {
      allowedUpdates.audiobookSegments = updates.audiobookSegments;
    }
    
    if (updates.voiceConfig !== undefined) {
      allowedUpdates.voiceConfig = updates.voiceConfig;
    }
    
    if (updates.multiRoleConfig !== undefined) {
      allowedUpdates.multiRoleConfig = updates.multiRoleConfig;
    }

    const updatedProject = await updateProject(id, allowedUpdates);

    return NextResponse.json({
      success: true,
      data: updatedProject,
    });
  } catch (error) {
    console.error("Failed to update project:", error);
    return NextResponse.json(
      { error: "更新项目失败: " + (error instanceof Error ? error.message : "未知错误") },
      { status: 500 }
    );
  }
}
