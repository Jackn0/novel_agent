import { NextRequest, NextResponse } from "next/server";
import { getProject } from "@/lib/db/projects";
import { mkdir, writeFile } from "fs/promises";
import { join } from "path";

interface RouteParams {
  params: Promise<{ id: string }>;
}

interface ExportRequest {
  format: "md" | "txt";
}

/**
 * POST /api/projects/:id/export
 * 导出小说为指定格式
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body: ExportRequest = await request.json();
    const { format } = body;

    const project = await getProject(id);
    if (!project) {
      return NextResponse.json(
        { success: false, error: "项目不存在" },
        { status: 404 }
      );
    }

    // 确保 output 目录存在
    const outputDir = join(process.cwd(), "output");
    await mkdir(outputDir, { recursive: true });

    // 构建文件内容
    let content = "";
    const fileName = `${project.bible.meta.title || "未命名小说"}.${format}`;
    const filePath = join(outputDir, fileName);

    if (format === "md") {
      content = generateMarkdown(project);
    } else {
      content = generateText(project);
    }

    // 写入文件
    await writeFile(filePath, content, "utf-8");

    return NextResponse.json({
      success: true,
      filePath: filePath.replace(process.cwd(), ""),
      fileName,
    });
  } catch (error) {
    console.error("Failed to export novel:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "导出失败" },
      { status: 500 }
    );
  }
}

function generateMarkdown(project: any): string {
  const { bible, chapters } = project;
  
  let md = `# ${bible.meta.title}\n\n`;
  md += `> ${bible.meta.genre} | ${bible.meta.tone}\n\n`;
  md += `## 简介\n\n${bible.meta.synopsis}\n\n`;
  md += `---\n\n`;

  // 按卷分组章节
  const chaptersByVolume = chapters.reduce((acc: any, chapter: any) => {
    const volNum = chapter.volumeNumber;
    if (!acc[volNum]) acc[volNum] = [];
    acc[volNum].push(chapter);
    return acc;
  }, {});

  // 遍历卷
  Object.entries(chaptersByVolume).forEach(([volNum, volChapters]: [string, any]) => {
    const volume = project.outline?.volumes.find((v: any) => v.number === parseInt(volNum));
    md += `# 第 ${volNum} 卷：${volume?.title || "未命名"}\n\n`;
    md += `${volume?.summary || ""}\n\n`;

    // 遍历章节
    volChapters.forEach((chapter: any) => {
      md += `## 第 ${chapter.chapterNumberInVolume} 章：${chapter.title}\n\n`;
      
      // 遍历小节
      if (chapter.sections && chapter.sections.length > 0) {
        chapter.sections.forEach((section: any) => {
          if (section.content) {
            md += section.content + "\n\n";
          }
        });
      }
      
      md += `\n---\n\n`;
    });
  });

  return md;
}

function generateText(project: any): string {
  const { bible, chapters } = project;
  
  let txt = `${bible.meta.title}\n`;
  txt += `${"=".repeat(bible.meta.title.length)}\n\n`;
  txt += `题材：${bible.meta.genre}\n`;
  txt += `基调：${bible.meta.tone}\n\n`;
  txt += `简介：\n${bible.meta.synopsis}\n\n`;
  txt += `${"=".repeat(50)}\n\n`;

  // 按卷分组章节
  const chaptersByVolume = chapters.reduce((acc: any, chapter: any) => {
    const volNum = chapter.volumeNumber;
    if (!acc[volNum]) acc[volNum] = [];
    acc[volNum].push(chapter);
    return acc;
  }, {});

  // 遍历卷
  Object.entries(chaptersByVolume).forEach(([volNum, volChapters]: [string, any]) => {
    const volume = project.outline?.volumes.find((v: any) => v.number === parseInt(volNum));
    txt += `第 ${volNum} 卷：${volume?.title || "未命名"}\n`;
    txt += `${"-".repeat(30)}\n\n`;

    // 遍历章节
    volChapters.forEach((chapter: any) => {
      txt += `第 ${chapter.chapterNumberInVolume} 章：${chapter.title}\n\n`;
      
      // 遍历小节
      if (chapter.sections && chapter.sections.length > 0) {
        chapter.sections.forEach((section: any) => {
          if (section.content) {
            txt += section.content + "\n\n";
          }
        });
      }
      
      txt += `\n${"-".repeat(30)}\n\n`;
    });
  });

  return txt;
}
