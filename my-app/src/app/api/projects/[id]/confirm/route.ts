import { NextRequest, NextResponse } from "next/server";
import { confirmStage, updateNovelBible, updateOutline, updateChapters } from "@/lib/db/projects";
import type { NovelStage, NovelBible, NovelOutline, Chapter } from "@/types/novel";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/projects/:id/confirm
 * 确认当前阶段完成，进入下一阶段
 * 
 * 请求体：
 * {
 *   nextStage: NovelStage,
 *   data?: { // 可选，同时保存的数据
 *     bible?: Partial<NovelBible>,
 *     outline?: NovelOutline,
 *     chapters?: Chapter[]
 *   }
 * }
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { nextStage, data } = body;

    if (!nextStage) {
      return NextResponse.json(
        { success: false, error: "缺少 nextStage 参数" },
        { status: 400 }
      );
    }

    // 如果有数据更新，先保存数据
    if (data?.bible) {
      await updateNovelBible(id, data.bible);
    }
    if (data?.outline) {
      await updateOutline(id, data.outline);
    }
    if (data?.chapters) {
      await updateChapters(id, data.chapters);
    }

    // 然后确认阶段
    const project = await confirmStage(id, nextStage as NovelStage);
    
    if (!project) {
      return NextResponse.json(
        { success: false, error: "项目不存在" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: project });
  } catch (error) {
    console.error("Failed to confirm stage:", error);
    return NextResponse.json(
      { success: false, error: "确认阶段失败" },
      { status: 500 }
    );
  }
}
