"use client";

import { useState, useCallback, useEffect } from "react";
import { ChevronLeft, ChevronRight, Sparkles, Save, ArrowLeft, RotateCcw, Info, Download, FileText, Plus, CheckCircle2, Circle, Trash2, AlertCircle, BookOpen, Library } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { NovelProject, NovelStage, Chapter, Section, Foreshadowing } from "@/types/novel";
import { v4 as uuidv4 } from "uuid";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface WritingStageProps {
  project: NovelProject;
  onUpdate: (updates: Partial<NovelProject>) => Promise<boolean>;
  onConfirm: (nextStage: NovelStage) => Promise<boolean>;
}

export default function WritingStage({ project, onUpdate, onConfirm }: WritingStageProps) {
  const [currentChapterIndex, setCurrentChapterIndex] = useState(0);
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [exporting, setExporting] = useState(false);
  
  // 批量生成状态
  const [batchGeneratingChapter, setBatchGeneratingChapter] = useState(false);
  const [batchGeneratingVolume, setBatchGeneratingVolume] = useState(false);
  
  // 使用本地状态存储编辑内容，避免频繁触发父组件更新
  const [localContent, setLocalContent] = useState<string>("");
  const [hasChanges, setHasChanges] = useState(false);

  // 伏笔面板状态
  const [newForeshadowContent, setNewForeshadowContent] = useState("");
  const [newForeshadowImportance, setNewForeshadowImportance] = useState<"minor" | "major" | "critical">("major");
  const [editingForeshadow, setEditingForeshadow] = useState<string | null>(null);

  const currentChapter = project.chapters[currentChapterIndex];
  const currentSection = currentChapter?.sections?.[currentSectionIndex];
  const foreshadowings = project.foreshadowings || [];
  
  // 创建一个唯一标识符来跟踪当前小节的变化（包括章节切换）
  const currentSectionKey = `${currentChapterIndex}-${currentSectionIndex}-${currentSection?.id}`;

  // 当切换小节时，同步本地状态
  useEffect(() => {
    if (currentSection) {
      setLocalContent(currentSection.content || "");
      setHasChanges(false);
    }
  }, [currentSectionKey]);

  const getPreviousSectionEnding = (): string | undefined => {
    if (currentSectionIndex === 0) return undefined;
    const prevSection = currentChapter?.sections?.[currentSectionIndex - 1];
    if (prevSection?.content) {
      return prevSection.content.slice(-100);
    }
    return undefined;
  };

  // 生成全文
  async function generateContent() {
    if (!currentSection || !currentChapter) return;
    setGenerating(true);
    
    try {
      const response = await fetch(`/api/projects/${project.id}/generate/section-content`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chapterId: currentChapter.id,
          sectionId: currentSection.id,
          previousSectionEnding: getPreviousSectionEnding(),
        }),
      });

      const result = await response.json();

      if (result.success) {
        setLocalContent(result.data.content);
        setHasChanges(true);
        await saveContent(result.data.content);
      } else {
        alert(result.error || "生成正文失败");
      }
    } catch (error) {
      console.error("Failed to generate content:", error);
      alert("生成正文失败，请检查 API 配置");
    } finally {
      setGenerating(false);
    }
  }

  // 保存内容到服务器
  async function saveContent(content: string) {
    if (!currentChapter || !currentSection) return;
    
    const sectionIndex = currentChapter.sections.findIndex(s => s.id === currentSection.id);
    if (sectionIndex === -1) return;

    const updatedSections = [...currentChapter.sections];
    updatedSections[sectionIndex] = { 
      ...currentSection, 
      content,
      wordCount: content.length,
    };

    const updatedChapters = [...project.chapters];
    updatedChapters[currentChapterIndex] = {
      ...currentChapter,
      sections: updatedSections,
    };

    await onUpdate({ chapters: updatedChapters });
    setHasChanges(false);
  }

  // 处理输入变化 - 只更新本地状态
  const handleInputChange = useCallback((value: string) => {
    setLocalContent(value);
    setHasChanges(true);
  }, []);

  // 处理失焦时保存
  const handleBlur = useCallback(() => {
    if (hasChanges && currentSection) {
      saveContent(localContent);
    }
  }, [hasChanges, localContent, currentSection]);

  async function confirmSection() {
    if (!currentSection) return;
    
    // 先保存当前内容
    if (hasChanges) {
      await saveContent(localContent);
    }
    
    // 更新状态为已确认
    const sectionIndex = currentChapter.sections.findIndex(s => s.id === currentSection.id);
    if (sectionIndex === -1) return;

    const updatedSections = [...currentChapter.sections];
    updatedSections[sectionIndex] = { 
      ...updatedSections[sectionIndex],
      contentStatus: "confirmed",
      confirmedAt: new Date().toISOString(),
    };

    const updatedChapters = [...project.chapters];
    updatedChapters[currentChapterIndex] = {
      ...currentChapter,
      sections: updatedSections,
    };

    await onUpdate({ chapters: updatedChapters });

    // 进入下一节
    if (currentSectionIndex < currentChapter.sections.length - 1) {
      setCurrentSectionIndex(currentSectionIndex + 1);
    } else if (currentChapterIndex < project.chapters.length - 1) {
      setCurrentChapterIndex(currentChapterIndex + 1);
      setCurrentSectionIndex(0);
    }
  }

  function jumpToSection(chapterIdx: number, sectionIdx: number) {
    // 切换前保存当前内容
    if (hasChanges && currentSection) {
      saveContent(localContent);
    }
    setCurrentChapterIndex(chapterIdx);
    setCurrentSectionIndex(sectionIdx);
  }

  async function handleComplete() {
    if (hasChanges && currentSection) {
      await saveContent(localContent);
    }
    await onConfirm("completed");
  }

  // ============ 批量生成功能 ============

  // 生成本章所有小节
  async function generateAllSectionsInChapter() {
    if (!currentChapter) return;
    
    const sectionsCount = currentChapter.sections?.length || 0;
    if (sectionsCount === 0) {
      alert("当前章节没有小节");
      return;
    }

    if (!confirm(`将为当前章节的 ${sectionsCount} 个小节生成全文，这可能需要一些时间。是否继续？`)) {
      return;
    }

    setBatchGeneratingChapter(true);
    try {
      const response = await fetch(`/api/projects/${project.id}/generate/batch-sections`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "chapter",
          chapterId: currentChapter.id,
        }),
      });

      const result = await response.json();

      if (result.success) {
        const { success, failed, skipped } = result.data;
        let message = `生成完成！\n成功：${success} 个`;
        if (failed > 0) message += `\n失败：${failed} 个`;
        if (skipped > 0) message += `\n跳过（已有内容）：${skipped} 个`;
        alert(message);
        
        // 重新获取项目数据以更新界面
        const projectResponse = await fetch(`/api/projects/${project.id}`);
        if (projectResponse.ok) {
          const updatedProject = await projectResponse.json();
          if (updatedProject.success) {
            await onUpdate({ chapters: updatedProject.data.chapters });
            
            // 刷新当前小节内容
            const updatedChapter = updatedProject.data.chapters.find((c: Chapter) => c.id === currentChapter.id);
            const updatedSection = updatedChapter?.sections?.find((s: Section) => s.id === currentSection?.id);
            if (updatedSection?.content && currentSection) {
              setLocalContent(updatedSection.content);
              setHasChanges(false);
            }
          }
        }
      } else {
        alert(result.error || result.message || "批量生成失败");
      }
    } catch (error) {
      console.error("Failed to batch generate chapter sections:", error);
      alert("批量生成失败，请检查 API 配置");
    } finally {
      setBatchGeneratingChapter(false);
    }
  }

  // 生成当前卷所有章节的所有小节
  async function generateAllSectionsInVolume() {
    if (!currentChapter) return;
    
    const currentVolumeNumber = currentChapter.volumeNumber;
    const volumeChapters = project.chapters.filter(c => c.volumeNumber === currentVolumeNumber);
    const totalSections = volumeChapters.reduce((sum, c) => sum + (c.sections?.length || 0), 0);
    
    if (totalSections === 0) {
      alert("当前卷没有可生成的小节");
      return;
    }

    if (!confirm(`将为当前卷的 ${volumeChapters.length} 个章节、共 ${totalSections} 个小节生成全文，这可能需要较长时间。是否继续？`)) {
      return;
    }

    setBatchGeneratingVolume(true);
    try {
      const response = await fetch(`/api/projects/${project.id}/generate/batch-sections`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "volume",
          volumeNumber: currentVolumeNumber,
        }),
      });

      const result = await response.json();

      if (result.success) {
        const { success, failed, skipped } = result.data;
        let message = `生成完成！\n成功：${success} 个`;
        if (failed > 0) message += `\n失败：${failed} 个`;
        if (skipped > 0) message += `\n跳过（已有内容）：${skipped} 个`;
        alert(message);
        
        // 重新获取项目数据以更新界面
        const projectResponse = await fetch(`/api/projects/${project.id}`);
        if (projectResponse.ok) {
          const updatedProject = await projectResponse.json();
          if (updatedProject.success) {
            await onUpdate({ chapters: updatedProject.data.chapters });
            
            // 刷新当前小节内容
            const updatedChapter = updatedProject.data.chapters.find((c: Chapter) => c.id === currentChapter?.id);
            const updatedSection = updatedChapter?.sections?.find((s: Section) => s.id === currentSection?.id);
            if (updatedSection?.content && currentSection) {
              setLocalContent(updatedSection.content);
              setHasChanges(false);
            }
          }
        }
      } else {
        alert(result.error || result.message || "批量生成失败");
      }
    } catch (error) {
      console.error("Failed to batch generate volume sections:", error);
      alert("批量生成失败，请检查 API 配置");
    } finally {
      setBatchGeneratingVolume(false);
    }
  }

  // ============ 伏笔管理功能 ============
  
  // 创建新伏笔
  async function createForeshadowing() {
    if (!newForeshadowContent.trim()) return;
    
    const newForeshadow: Foreshadowing = {
      id: uuidv4(),
      content: newForeshadowContent.trim(),
      plantedInChapter: currentChapter?.chapterNumber,
      plantedInSection: currentSection?.sectionNumber,
      plantedAt: new Date().toISOString(),
      status: "planted",
      importance: newForeshadowImportance,
    };
    
    const updatedForeshadowings = [...foreshadowings, newForeshadow];
    await onUpdate({ foreshadowings: updatedForeshadowings });
    
    setNewForeshadowContent("");
    setNewForeshadowImportance("major");
  }

  // 回收伏笔
  async function resolveForeshadowing(id: string) {
    const foreshadow = foreshadowings.find(f => f.id === id);
    if (!foreshadow) return;
    
    const updatedForeshadowings = foreshadowings.map(f => {
      if (f.id === id) {
        return {
          ...f,
          status: "resolved" as const,
          resolvedInChapter: currentChapter?.chapterNumber,
          resolvedInSection: currentSection?.sectionNumber,
          resolvedAt: new Date().toISOString(),
        };
      }
      return f;
    });
    
    await onUpdate({ foreshadowings: updatedForeshadowings });
  }

  // 删除伏笔
  async function deleteForeshadowing(id: string) {
    if (!confirm("确定要删除这个伏笔吗？")) return;
    
    const updatedForeshadowings = foreshadowings.filter(f => f.id !== id);
    await onUpdate({ foreshadowings: updatedForeshadowings });
  }

  // 获取重要性标签样式
  function getImportanceStyle(importance: string) {
    switch (importance) {
      case "critical":
        return "bg-red-100 text-red-800 border-red-200";
      case "major":
        return "bg-orange-100 text-orange-800 border-orange-200";
      case "minor":
        return "bg-blue-100 text-blue-800 border-blue-200";
      default:
        return "bg-gray-100 text-gray-800";
    }
  }

  function getImportanceLabel(importance: string) {
    switch (importance) {
      case "critical":
        return "关键";
      case "major":
        return "重要";
      case "minor":
        return "次要";
      default:
        return importance;
    }
  }

  // 导出小说
  async function exportNovel(format: "md" | "txt") {
    setExporting(true);
    try {
      const response = await fetch(`/api/projects/${project.id}/export`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ format }),
      });
      
      const result = await response.json();
      if (result.success) {
        alert(`小说已导出到: ${result.filePath}`);
      } else {
        alert(result.error || "导出失败");
      }
    } catch (error) {
      console.error("Export failed:", error);
      alert("导出失败，请检查服务器配置");
    } finally {
      setExporting(false);
    }
  }

  const chaptersByVolume = project.chapters.reduce((acc, chapter) => {
    const volNum = chapter.volumeNumber;
    if (!acc[volNum]) acc[volNum] = [];
    acc[volNum].push(chapter);
    return acc;
  }, {} as Record<number, Chapter[]>);

  if (!currentChapter || !currentSection) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">正文写作</h1>
            <p className="text-gray-600 mt-1">撰写小说正文内容</p>
          </div>
          <Button variant="outline" onClick={() => onConfirm("section_lists")}>
            <ArrowLeft className="w-4 h-4 mr-1" />
            返回
          </Button>
        </div>
        <div className="text-center py-12">
          <p className="text-muted-foreground">没有可写的小节，请先在"小节列表"阶段生成小节规划</p>
          <Button variant="outline" className="mt-4" onClick={() => onConfirm("section_lists")}>
            前往小节列表
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 h-[calc(100vh-120px)] flex flex-col">
      {/* 顶部标题栏 */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold">正文写作</h1>
          <p className="text-gray-600 mt-1">
            第 {currentChapter.volumeNumber} 卷 第 {currentChapter.chapterNumberInVolume} 章 · 第 {currentSection.sectionNumber} 节
            {hasChanges && <span className="text-orange-500 ml-2">(未保存)</span>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => onConfirm("section_lists")}>
            <ArrowLeft className="w-4 h-4 mr-1" />
            返回
          </Button>
          <Button variant="outline" onClick={handleComplete}>
            <ChevronRight className="w-4 h-4 mr-1" />
            完成写作
          </Button>
        </div>
      </div>

      {/* 主内容区 */}
      <div className="flex gap-4 flex-1 min-h-0">
        {/* 左侧区域 - 章节导航(2/3) + 伏笔管理(1/3) */}
        <div className="w-72 flex flex-col gap-3 flex-shrink-0 h-full">
          {/* 章节导航 - 占2/3 */}
          <div className="flex-[2] flex flex-col gap-2 min-h-0">
            <div className="flex justify-between items-center px-1">
              <span className="text-sm font-medium text-muted-foreground">
                章节导航
              </span>
              {/* 批量生成按钮 */}
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={generateAllSectionsInChapter}
                  disabled={batchGeneratingChapter || batchGeneratingVolume || generating}
                  title="生成本章所有小节"
                >
                  <BookOpen className="w-3.5 h-3.5 mr-1" />
                  {batchGeneratingChapter ? "生成中..." : "本章生成"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={generateAllSectionsInVolume}
                  disabled={batchGeneratingChapter || batchGeneratingVolume || generating}
                  title="生成当前卷所有小节"
                >
                  <Library className="w-3.5 h-3.5 mr-1" />
                  {batchGeneratingVolume ? "生成中..." : "全卷生成"}
                </Button>
              </div>
            </div>
            
            {/* 固定高度带独立滚动 */}
            <div className="flex-1 border rounded-md overflow-hidden">
              <ScrollArea className="h-full">
                <div className="p-2 space-y-2">
                  {Object.entries(chaptersByVolume).map(([volNum, chapters]) => {
                    const volume = project.outline?.volumes.find(v => v.number === parseInt(volNum));
                    return (
                      <div key={volNum} className="space-y-1">
                        <div className="text-xs font-bold text-primary px-2 py-1 bg-primary/10 rounded">
                          第 {volNum} 卷：{volume?.title || "未命名"}
                        </div>
                        {chapters.map((chapter) => {
                          const chIdx = project.chapters.findIndex(c => c.id === chapter.id);
                          return (
                            <div key={chapter.id} className="space-y-1">
                              <div className="text-xs font-semibold text-muted-foreground px-2 py-1">
                                第 {chapter.chapterNumberInVolume} 章 {chapter.title}
                              </div>
                              {chapter.sections?.map((section, secIdx) => {
                                const isCurrent = chIdx === currentChapterIndex && secIdx === currentSectionIndex;
                                const isCompleted = section.contentStatus === "confirmed";
                                const hasContent = section.content && section.content.length > 0;
                                const isGenerated = hasContent && section.contentStatus !== "confirmed";
                                return (
                                  <button
                                    key={section.id}
                                    onClick={() => jumpToSection(chIdx, secIdx)}
                                    className={`w-full text-left px-3 py-1.5 rounded-md text-sm transition-colors ${
                                      isCurrent
                                        ? "bg-primary text-primary-foreground"
                                        : isCompleted
                                        ? "bg-green-100 text-green-800 hover:bg-green-200"
                                        : isGenerated
                                        ? "bg-blue-50 text-blue-800 hover:bg-blue-100"
                                        : "hover:bg-muted"
                                    }`}
                                  >
                                    <div className="flex items-center gap-2">
                                      <span>第 {section.sectionNumber} 节</span>
                                      <span className="truncate flex-1 opacity-70">{section.title}</span>
                                      {isCompleted && <span className="text-xs">✓</span>}
                                      {isGenerated && !isCompleted && <span className="text-xs">○</span>}
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </div>
          </div>

          {/* 伏笔管理 - 占1/3 */}
          <div className="flex-1 flex flex-col gap-2 min-h-0">
            <div className="flex justify-between items-center px-1">
              <span className="text-sm font-medium text-muted-foreground">
                伏笔管理
              </span>
              <span className="text-xs text-muted-foreground">
                {foreshadowings.filter(f => f.status === "resolved").length}/{foreshadowings.length}
              </span>
            </div>
            <div className="flex-1 border rounded-md flex flex-col overflow-hidden min-h-0">
              {/* 创建新伏笔 */}
              <div className="p-2 border-b space-y-1.5">
                <Textarea
                  value={newForeshadowContent}
                  onChange={(e) => setNewForeshadowContent(e.target.value)}
                  placeholder="输入伏笔内容..."
                  className="min-h-[50px] text-xs resize-none"
                />
                <div className="flex gap-1.5">
                  <Select
                    value={newForeshadowImportance}
                    onValueChange={(v) => setNewForeshadowImportance(v as "minor" | "major" | "critical")}
                  >
                    <SelectTrigger className="h-7 text-xs flex-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="minor">次要</SelectItem>
                      <SelectItem value="major">重要</SelectItem>
                      <SelectItem value="critical">关键</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    size="sm"
                    className="h-7 px-2"
                    onClick={createForeshadowing}
                    disabled={!newForeshadowContent.trim()}
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>

              {/* 伏笔列表 - 带滚动条 */}
              <ScrollArea className="flex-1 h-full">
                <div className="p-2 space-y-1.5">
                  {foreshadowings.length === 0 ? (
                    <div className="text-center py-3 text-xs text-muted-foreground">
                      暂无伏笔
                      <br />
                      在上方创建
                    </div>
                  ) : (
                    foreshadowings.map((f) => (
                      <div
                        key={f.id}
                        className={`p-1.5 rounded border text-xs space-y-1 ${
                          f.status === "resolved"
                            ? "bg-green-50 border-green-200 opacity-60"
                            : "bg-card"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-1">
                          <p className={`flex-1 leading-relaxed ${
                            f.status === "resolved" ? "line-through" : ""
                          }`}>
                            {f.content}
                          </p>
                          <div className="flex gap-0.5 flex-shrink-0">
                            {f.status !== "resolved" && (
                              <button
                                onClick={() => resolveForeshadowing(f.id)}
                                className="p-0.5 rounded hover:bg-green-100 text-green-600"
                                title="回收伏笔"
                              >
                                <CheckCircle2 className="w-3 h-3" />
                              </button>
                            )}
                            <button
                              onClick={() => deleteForeshadowing(f.id)}
                              className="p-0.5 rounded hover:bg-red-100 text-red-600"
                              title="删除"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-1 flex-wrap">
                          <Badge
                            variant="outline"
                            className={`text-[9px] px-1 py-0 h-3 ${getImportanceStyle(f.importance)}`}
                          >
                            {getImportanceLabel(f.importance)}
                          </Badge>
                          
                          {f.status === "resolved" ? (
                            <span className="text-[9px] text-green-600 flex items-center gap-0.5">
                              <CheckCircle2 className="w-2.5 h-2.5" />
                              第{f.resolvedInChapter}章
                            </span>
                          ) : (
                            <span className="text-[9px] text-orange-600 flex items-center gap-0.5">
                              <Circle className="w-2.5 h-2.5" />
                              未回收
                            </span>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </div>
          </div>
        </div>

        {/* 右侧主区域 */}
        <div className="flex-1 flex flex-col gap-3 min-w-0">
          {/* 上方信息区域 - 两列布局：左侧小节信息+本章大纲，右侧写作要点 */}
          <div className="flex gap-3 flex-shrink-0">
            {/* 左侧：小节信息 */}
            <Dialog>
              <DialogTrigger className="flex-1 text-left">
                <Card className="h-full cursor-pointer hover:shadow-md transition-shadow">
                  <CardHeader className="pb-2 pt-3 px-4">
                    <CardTitle className="text-xs font-medium flex items-center justify-between text-muted-foreground">
                      小节信息
                      <Info className="w-3 h-3" />
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0 pb-3 px-4 space-y-1">
                    <p className="font-medium text-sm truncate">{currentSection.title || `第 ${currentSection.sectionNumber} 节`}</p>
                    <p className="text-xs text-muted-foreground truncate">{currentSection.sceneTime} · {currentSection.sceneLocation}</p>
                    <p className="text-xs text-muted-foreground line-clamp-1">{currentSection.emotionalBeat}</p>
                    {(currentSection.wordCount ?? 0) > 0 && (
                      <p className="text-xs text-blue-600">{currentSection.wordCount} / {currentSection.wordCountTarget} 字</p>
                    )}
                  </CardContent>
                </Card>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[80vh]">
                <DialogHeader>
                  <DialogTitle>小节详情 - {currentSection.title || `第 ${currentSection.sectionNumber} 节`}</DialogTitle>
                </DialogHeader>
                <ScrollArea className="max-h-[60vh]">
                  <div className="space-y-4 pr-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div><span className="font-medium">场景时间：</span>{currentSection.sceneTime || "未指定"}</div>
                      <div><span className="font-medium">场景地点：</span>{currentSection.sceneLocation || "未指定"}</div>
                      <div><span className="font-medium">情感节拍：</span>{currentSection.emotionalBeat || "未指定"}</div>
                      <div><span className="font-medium">目标字数：</span>{currentSection.wordCountTarget} 字</div>
                      <div><span className="font-medium">视角角色：</span>{currentSection.pov || "未指定"}</div>
                    </div>
                    <Separator />
                    <div>
                      <h4 className="font-medium mb-2">内容概要</h4>
                      <p className="text-sm text-muted-foreground">{currentSection.contentSummary}</p>
                    </div>
                  </div>
                </ScrollArea>
              </DialogContent>
            </Dialog>

            {/* 中间：本章大纲 */}
            <Dialog>
              <DialogTrigger className="flex-1 text-left">
                <Card className="h-full cursor-pointer hover:shadow-md transition-shadow">
                  <CardHeader className="pb-2 pt-3 px-4">
                    <CardTitle className="text-xs font-medium flex items-center justify-between text-muted-foreground">
                      本章大纲
                      <Info className="w-3 h-3" />
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0 pb-3 px-4 space-y-1">
                    <p className="font-medium text-sm truncate">第 {currentChapter.chapterNumberInVolume} 章 {currentChapter.title}</p>
                    <p className="text-xs text-muted-foreground line-clamp-2">{currentChapter.summary}</p>
                    <p className="text-xs text-muted-foreground">{currentChapter.keyEvents.length} 个关键事件</p>
                  </CardContent>
                </Card>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[80vh]">
                <DialogHeader>
                  <DialogTitle>本章大纲 - 第 {currentChapter.chapterNumberInVolume} 章 {currentChapter.title}</DialogTitle>
                </DialogHeader>
                <ScrollArea className="max-h-[60vh]">
                  <div className="space-y-4 pr-4">
                    <div>
                      <h4 className="font-medium mb-2">章节摘要</h4>
                      <p className="text-sm text-muted-foreground">{currentChapter.summary}</p>
                    </div>
                    <Separator />
                    <div>
                      <h4 className="font-medium mb-2">开头钩子</h4>
                      <p className="text-sm text-muted-foreground">{currentChapter.openingHook || "未设置"}</p>
                    </div>
                    <Separator />
                    <div>
                      <h4 className="font-medium mb-2">结尾悬念</h4>
                      <p className="text-sm text-muted-foreground">{currentChapter.closingHook || "未设置"}</p>
                    </div>
                    <Separator />
                    <div>
                      <h4 className="font-medium mb-2">关键事件 ({currentChapter.keyEvents.length})</h4>
                      <div className="space-y-2">
                        {currentChapter.keyEvents.map((event, idx) => (
                          <div key={idx} className="text-sm border-l-2 border-primary pl-3 py-1">
                            <p className="font-medium">事件 {event.order}</p>
                            <p className="text-muted-foreground">{event.description}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </ScrollArea>
              </DialogContent>
            </Dialog>

            {/* 右侧：写作要点 - 更宽 */}
            <Dialog>
              <DialogTrigger className="w-1/3 text-left">
                <Card className="h-full cursor-pointer hover:shadow-md transition-shadow">
                  <CardHeader className="pb-2 pt-3 px-4">
                    <CardTitle className="text-xs font-medium flex items-center justify-between text-muted-foreground">
                      写作要点
                      <Info className="w-3 h-3" />
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0 pb-3 px-4">
                    <p className="text-xs text-muted-foreground line-clamp-4">
                      {currentSection.writingNotes || "无特殊要求"}
                    </p>
                  </CardContent>
                </Card>
              </DialogTrigger>
              <DialogContent className="max-w-xl">
                <DialogHeader>
                  <DialogTitle>写作要点</DialogTitle>
                </DialogHeader>
                <div className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {currentSection.writingNotes || "无特殊要求"}
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* 下方写作区域 */}
          <Card className="flex-1 flex flex-col min-h-0 overflow-hidden">
            <CardContent className="flex-1 p-4">
              <textarea
                value={localContent}
                onChange={(e) => handleInputChange(e.target.value)}
                onBlur={handleBlur}
                placeholder="在此输入正文..."
                className="w-full h-full resize-none font-mono text-base leading-relaxed border-0 focus-visible:ring-0 focus-visible:outline-none p-0 bg-transparent"
                spellCheck={false}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
              />
            </CardContent>
          </Card>

          {/* 操作按钮 */}
          <div className="flex justify-between flex-shrink-0">
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={generateContent}
                disabled={generating}
              >
                <Sparkles className="w-4 h-4 mr-2" />
                {generating ? "生成中..." : (localContent ? "重新生成" : "生成全文")}
              </Button>
              <Button
                variant="outline"
                onClick={async () => {
                  setLocalContent("");
                  setHasChanges(false);
                  // 保存空内容到服务器，并重置状态
                  if (currentChapter && currentSection) {
                    const sectionIndex = currentChapter.sections.findIndex(s => s.id === currentSection.id);
                    if (sectionIndex !== -1) {
                      const updatedSections = [...currentChapter.sections];
                      updatedSections[sectionIndex] = { 
                        ...currentSection, 
                        content: "",
                        wordCount: 0,
                        contentStatus: "pending",
                      };
                      const updatedChapters = [...project.chapters];
                      updatedChapters[currentChapterIndex] = {
                        ...currentChapter,
                        sections: updatedSections,
                      };
                      await onUpdate({ chapters: updatedChapters });
                    }
                  }
                }}
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                清空
              </Button>
            </div>
            <div className="flex gap-2">
              {/* 导出当前写作内容按钮 */}
              <Dialog>
                <DialogTrigger
                  render={
                    <Button variant="outline" disabled={!localContent}>
                      <Download className="w-4 h-4 mr-2" />
                      导出当前内容
                    </Button>
                  }
                />
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>导出小说</DialogTitle>
                  </DialogHeader>
                  <div className="flex gap-4 py-4">
                    <Button 
                      variant="outline" 
                      className="flex-1 h-20 flex flex-col gap-2"
                      onClick={() => exportNovel("md")}
                      disabled={exporting}
                    >
                      <FileText className="w-8 h-8" />
                      <span>导出为 Markdown</span>
                    </Button>
                    <Button 
                      variant="outline" 
                      className="flex-1 h-20 flex flex-col gap-2"
                      onClick={() => exportNovel("txt")}
                      disabled={exporting}
                    >
                      <FileText className="w-8 h-8" />
                      <span>导出为 TXT</span>
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
              <Button
                onClick={confirmSection}
                disabled={!localContent}
              >
                <Save className="w-4 h-4 mr-2" />
                确认并下一节
              </Button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
