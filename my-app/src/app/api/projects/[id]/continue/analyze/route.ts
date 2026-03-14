/**
 * 续写分析 API（分层分析版本）
 * 采用章节级分析 -> 汇总 -> 整体分析的分层策略
 */

import { NextRequest, NextResponse } from "next/server";
import { getProject, updateProject } from "@/lib/db/projects";
import { performLayeredAnalysis, performQuickAnalysis } from "@/lib/agent/continuation-agent";
import type { AnalysisResult } from "@/types/novel";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  
  try {
    const project = await getProject(id);
    if (!project) {
      return NextResponse.json({ error: "项目不存在" }, { status: 404 });
    }

    const inputFiles = project.continuation?.inputFiles || [];
    if (inputFiles.length === 0) {
      return NextResponse.json({ error: "没有输入文件可供分析" }, { status: 400 });
    }

    // 准备文件数据
    const filesData = inputFiles.map(f => ({
      content: f.content,
      filename: f.filename,
    }));

    // 判断使用快速分析还是分层分析
    const totalLength = filesData.reduce((sum, f) => sum + f.content.length, 0);
    
    let analysisResult: AnalysisResult;
    
    if (totalLength < 5000) {
      // 短文本使用快速分析
      const combinedText = filesData.map(f => f.content).join("\n\n");
      analysisResult = await performQuickAnalysis(combinedText, project.title);
    } else {
      // 长文本使用分层分析
      analysisResult = await performLayeredAnalysis(
        filesData,
        project.title,
        // 可选：添加进度回调（如果需要WebSocket或SSE支持）
        // (progress, stage) => console.log(`[${project.id}] ${stage}: ${progress}%`)
      );
    }

    // 更新项目数据
    await updateProject(id, {
      continuation: {
        ...project.continuation,
        isActive: true,
        continuationNumber: (project.continuation?.continuationNumber || 0) + 1,
        inputFiles: project.continuation?.inputFiles || [],
        analysisResult,
        previousWorkSummary: analysisResult.worldSummary,
      },
    });

    return NextResponse.json({
      success: true,
      analysis: analysisResult,
    });
  } catch (error) {
    console.error("Failed to analyze content:", error);
    return NextResponse.json(
      { error: "分析内容失败: " + (error instanceof Error ? error.message : "未知错误") },
      { status: 500 }
    );
  }
}

/**
 * GET: 获取分析进度（用于长文本分析的轮询）
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  
  try {
    const project = await getProject(id);
    if (!project) {
      return NextResponse.json({ error: "项目不存在" }, { status: 404 });
    }

    const analysisResult = project.continuation?.analysisResult;
    
    if (!analysisResult) {
      return NextResponse.json({
        success: true,
        status: "not_started",
        progress: 0,
      });
    }

    return NextResponse.json({
      success: true,
      status: analysisResult.processingStatus,
      progress: analysisResult.progress,
      analysis: analysisResult.processingStatus === "completed" ? analysisResult : undefined,
    });
  } catch (error) {
    console.error("Failed to get analysis status:", error);
    return NextResponse.json(
      { error: "获取分析状态失败" },
      { status: 500 }
    );
  }
}
