"use client";

import { useState, useCallback, useEffect } from "react";
import { Sparkles, Save, ArrowLeft, RotateCcw, Info, BookOpen, Scroll } from "lucide-react";
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
import type { NovelProject, NovelStage, Chapter, Section } from "@/types/novel";

interface ContinuationWritingStageProps {
  project: NovelProject;
  onUpdate: (updates: Partial<NovelProject>) => Promise<boolean>;
  onConfirm: (nextStage: NovelStage) => Promise<boolean>;
}

// 从环境变量获取模型配置
const WRITING_MODEL = process.env.WRITING_MODEL || "";

export default function ContinuationWritingStage({
  project,
  onUpdate,
  onConfirm,
}: ContinuationWritingStageProps) {
  const [currentChapterIndex, setCurrentChapterIndex] = useState(0);
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [generating, setGenerating] = useState(false);
  
  // 使用本地状态存储编辑内容
  const [localContent, setLocalContent] = useState<string>("");
  const [hasChanges, setHasChanges] = useState(false);

  const analysisResult = project.continuation?.analysisResult;
  const currentChapter = project.chapters[currentChapterIndex];
  const currentSection = currentChapter?.sections[currentSectionIndex];

  // 当切换小节时同步本地状态
  useEffect(() => {
    if (currentSection) {
      setLocalContent(currentSection.content || "");
      setHasChanges(false);
    }
  }, [currentSection?.id]);

  // 获取前一小节结尾
  const getPreviousSectionEnding = (): string | undefined => {
    if (currentSectionIndex === 0) return undefined;
    const prevSection = currentChapter?.sections[currentSectionIndex - 1];
    if (prevSection?.content) {
      return prevSection.content.slice(-100);
    }
    return undefined;
  };

  // 获取续写上下文提示
  const getContinuationContext = (): string => {
    const context: string[] = [];
    
    if (analysisResult) {
      context.push(`【世界观】${analysisResult.worldSummary}`);
      context.push(`【整体基调】${analysisResult.tone}`);
      
      if (analysisResult.unresolvedPlots.length > 0) {
        context.push(`【待回收伏笔】${analysisResult.unresolvedPlots.join("；")}`);
      }
      
      // 当前角色状态
      const relevantCharacters = analysisResult.characters.filter(c => 
        currentSection?.pov === c.name || 
        currentChapter?.keyEvents.some(e => e.characters.includes(c.name))
      );
      
      if (relevantCharacters.length > 0) {
        context.push(`【角色状态】${relevantCharacters.map(c => 
          `${c.name}：${c.currentState || "状态未知"}`
        ).join("；")}`);
      }
    }
    
    // 本章设定
    context.push(`【本章信息】${currentChapter?.summary || ""}`);
    if (currentChapter?.openingHook && currentSectionIndex === 0) {
      context.push(`【开头钩子】${currentChapter.openingHook}`);
    }
    if (currentChapter?.foreshadowing) {
      context.push(`【本章伏笔】${currentChapter.foreshadowing}`);
    }
    
    return context.join("\n\n");
  };

  // 生成正文
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
          isContinuation: true,
          continuationContext: getContinuationContext(),
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

  // 保存内容
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

  // 处理输入变化
  const handleInputChange = useCallback((value: string) => {
    setLocalContent(value);
    setHasChanges(true);
  }, []);

  // 处理失焦保存
  const handleBlur = useCallback(() => {
    if (hasChanges && currentSection) {
      saveContent(localContent);
    }
  }, [hasChanges, localContent, currentSection]);

  // 确认并进入下一节
  async function confirmSection() {
    if (!currentSection) return;
    
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

  // 跳转到指定小节
  function jumpToSection(chapterIdx: number, sectionIdx: number) {
    if (hasChanges && currentSection) {
      saveContent(localContent);
    }
    setCurrentChapterIndex(chapterIdx);
    setCurrentSectionIndex(sectionIdx);
  }

  // 完成写作
  async function handleComplete() {
    if (hasChanges && currentSection) {
      await saveContent(localContent);
    }
    await onConfirm("completed");
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
            <h1 className="text-2xl font-bold">续写正文</h1>
            <p className="text-gray-600 mt-1">撰写续写部分的正文内容</p>
          </div>
          <Button variant="outline" onClick={() => onConfirm("continuation_chapters")}>
            <ArrowLeft className="w-4 h-4 mr-1" />
            返回
          </Button>
        </div>
        <div className="text-center py-12">
          <p className="text-muted-foreground">没有可写的小节，请先在"章节规划"阶段生成章节</p>
          <Button variant="outline" className="mt-4" onClick={() => onConfirm("continuation_chapters")}>
            前往章节规划
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
          <h1 className="text-2xl font-bold">续写正文</h1>
          <p className="text-gray-600 mt-1">
            第 {currentChapter.volumeNumber} 卷 第 {currentChapter.chapterNumberInVolume} 章 · 第 {currentSection.sectionNumber} 节
            {hasChanges && <span className="text-orange-500 ml-2">(未保存)</span>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => onConfirm("continuation_chapters")}>
            <ArrowLeft className="w-4 h-4 mr-1" />
            返回
          </Button>
          <Button variant="outline" onClick={handleComplete}>
            完成写作
          </Button>
        </div>
      </div>

      {/* 主内容区 */}
      <div className="flex gap-4 flex-1 min-h-0">
        {/* 左侧导航 */}
        <div className="w-64 flex flex-col gap-2 flex-shrink-0">
          <div className="flex justify-between items-center px-1">
            <span className="text-sm font-medium text-muted-foreground">
              章节导航
            </span>
          </div>
          <div className="flex-1 border rounded-md overflow-hidden">
            <ScrollArea className="h-full">
              <div className="p-2 space-y-2">
                {Object.entries(chaptersByVolume).map(([volNum, chapters]) => (
                  <div key={volNum} className="space-y-1">
                    <div className="text-xs font-bold text-primary px-2 py-1 bg-primary/10 rounded">
                      第 {volNum} 卷
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
                            const isGenerated = section.contentStatus === "generated";
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
                                  {isGenerated && !isCompleted && <span className="text-xs">◯</span>}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        </div>

        {/* 右侧主区域 */}
        <div className="flex-1 flex flex-col gap-3 min-w-0">
          {/* 上方信息区域 */}
          <div className="flex gap-3 flex-shrink-0">
            {/* 小节信息 */}
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
                    {(currentSection.wordCount ?? 0) > 0 && (
                      <p className="text-xs text-blue-600">{currentSection.wordCount} / {currentSection.wordCountTarget} 字</p>
                    )}
                  </CardContent>
                </Card>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[80vh]">
                <DialogHeader>
                  <DialogTitle>小节详情</DialogTitle>
                </DialogHeader>
                <ScrollArea className="max-h-[60vh]">
                  <div className="space-y-4 pr-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div><span className="font-medium">场景时间：</span>{currentSection.sceneTime || "未指定"}</div>
                      <div><span className="font-medium">场景地点：</span>{currentSection.sceneLocation || "未指定"}</div>
                      <div><span className="font-medium">情感节拍：</span>{currentSection.emotionalBeat || "未指定"}</div>
                      <div><span className="font-medium">目标字数：</span>{currentSection.wordCountTarget} 字</div>
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

            {/* 续写上下文 */}
            <Dialog>
              <DialogTrigger className="flex-1 text-left">
                <Card className="h-full cursor-pointer hover:shadow-md transition-shadow">
                  <CardHeader className="pb-2 pt-3 px-4">
                    <CardTitle className="text-xs font-medium flex items-center justify-between text-muted-foreground">
                      续写上下文
                      <Scroll className="w-3 h-3" />
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0 pb-3 px-4">
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      点击查看前作设定、伏笔回收提示等续写参考信息
                    </p>
                  </CardContent>
                </Card>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[80vh]">
                <DialogHeader>
                  <DialogTitle>续写参考信息</DialogTitle>
                </DialogHeader>
                <ScrollArea className="max-h-[60vh]">
                  <div className="space-y-4 pr-4 text-sm">
                    <div className="bg-blue-50 p-3 rounded-md">
                      <h4 className="font-medium text-blue-900 mb-2">世界观与基调</h4>
                      <p className="text-blue-800">{analysisResult?.worldSummary}</p>
                      <p className="text-blue-700 mt-1">基调：{analysisResult?.tone}</p>
                    </div>
                    
                    {analysisResult?.unresolvedPlots && analysisResult.unresolvedPlots.length > 0 && (
                      <div className="bg-orange-50 p-3 rounded-md">
                        <h4 className="font-medium text-orange-900 mb-2">待回收伏笔</h4>
                        <ul className="list-disc list-inside text-orange-800">
                          {analysisResult.unresolvedPlots.map((plot, idx) => (
                            <li key={idx}>{plot}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    <div>
                      <h4 className="font-medium mb-2">当前章节设定</h4>
                      <p className="text-muted-foreground">{currentChapter.summary}</p>
                    </div>
                    
                    {currentChapter.foreshadowing && (
                      <div>
                        <h4 className="font-medium mb-2">本章伏笔安排</h4>
                        <p className="text-muted-foreground">{currentChapter.foreshadowing}</p>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </DialogContent>
            </Dialog>

            {/* 本章大纲 */}
            <Dialog>
              <DialogTrigger className="flex-1 text-left">
                <Card className="h-full cursor-pointer hover:shadow-md transition-shadow">
                  <CardHeader className="pb-2 pt-3 px-4">
                    <CardTitle className="text-xs font-medium flex items-center justify-between text-muted-foreground">
                      本章大纲
                      <BookOpen className="w-3 h-3" />
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0 pb-3 px-4 space-y-1">
                    <p className="font-medium text-sm truncate">第 {currentChapter.chapterNumberInVolume} 章 {currentChapter.title}</p>
                    <p className="text-xs text-muted-foreground line-clamp-2">{currentChapter.summary}</p>
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
          </div>

          {/* 下方写作区域 */}
          <Card className="flex-1 flex flex-col min-h-0 overflow-hidden">
            <CardContent className="flex-1 p-4">
              <textarea
                value={localContent}
                onChange={(e) => handleInputChange(e.target.value)}
                onBlur={handleBlur}
                placeholder="在此输入续写正文..."
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
                {generating ? "生成中..." : (localContent ? "重新生成" : "生成正文")}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setLocalContent("");
                  setHasChanges(true);
                }}
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                清空
              </Button>
            </div>
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
  );
}
