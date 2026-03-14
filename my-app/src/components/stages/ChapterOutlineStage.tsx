"use client";

import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight, Sparkles, BookOpen, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { GenerateInput } from "@/components/ui/generate-input";
import { GenerateTextarea } from "@/components/ui/generate-textarea";
import type { NovelProject, NovelStage, Chapter, ChapterKeyEvent } from "@/types/novel";
import { v4 as uuidv4 } from "uuid";

interface ChapterOutlineStageProps {
  project: NovelProject;
  onUpdate: (updates: Partial<NovelProject>) => Promise<boolean>;
  onConfirm: (nextStage: NovelStage, data?: { chapters?: Chapter[] }) => Promise<boolean>;
}

export default function ChapterOutlineStage({ project, onUpdate, onConfirm }: ChapterOutlineStageProps) {
  const [generating, setGenerating] = useState(false);
  const [chapters, setChapters] = useState<Chapter[]>(project.chapters);
  const [selectedVolume, setSelectedVolume] = useState<number>(1);
  const [selectedChapterId, setSelectedChapterId] = useState<string | null>(null);

  // 获取当前卷的章节
  const currentVolumeChapters = useMemo(() => {
    return chapters
      .filter(c => c.volumeNumber === selectedVolume)
      .sort((a, b) => a.chapterNumberInVolume - b.chapterNumberInVolume);
  }, [chapters, selectedVolume]);

  // 使用LLM生成本卷章节大纲
  async function generateChapterOutlines() {
    const volume = project.outline?.volumes.find(v => v.number === selectedVolume);
    if (!volume) {
      alert("请先完成大纲规划");
      return;
    }

    setGenerating(true);
    try {
      const response = await fetch(`/api/projects/${project.id}/generate/chapter-outlines`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ volumeNumber: selectedVolume }),
      });

      const result = await response.json();

      if (result.success) {
        const newChapters: Chapter[] = result.data;
        // 合并新章节，替换同卷已有章节
        const otherChapters = chapters.filter(c => c.volumeNumber !== selectedVolume);
        const mergedChapters = [...otherChapters, ...newChapters];
        
        // 重新排序并更新全书章节序号
        mergedChapters.sort((a, b) => {
          if (a.volumeNumber !== b.volumeNumber) {
            return a.volumeNumber - b.volumeNumber;
          }
          return a.chapterNumberInVolume - b.chapterNumberInVolume;
        });
        
        // 更新全书章节序号
        mergedChapters.forEach((chapter, index) => {
          chapter.chapterNumber = index + 1;
        });

        setChapters(mergedChapters);
        await onUpdate({ chapters: mergedChapters });
        
        // 自动选中新章节的第一个
        if (newChapters.length > 0) {
          setSelectedChapterId(newChapters[0].id);
        }
      } else {
        alert(result.error || "生成章节大纲失败");
      }
    } catch (error) {
      console.error("Failed to generate chapter outlines:", error);
      alert("生成章节大纲失败，请检查 API 配置");
    } finally {
      setGenerating(false);
    }
  }

  // 更新章节
  async function updateChapter(chapterId: string, updates: Partial<Chapter>) {
    const newChapters = chapters.map(c => 
      c.id === chapterId ? { ...c, ...updates } : c
    );
    setChapters(newChapters);
    await onUpdate({ chapters: newChapters });
  }

  // 添加关键事件
  function addKeyEvent(chapterId: string) {
    const chapter = chapters.find(c => c.id === chapterId);
    if (!chapter) return;
    
    const newEvent: ChapterKeyEvent = {
      order: chapter.keyEvents.length + 1,
      description: "",
      characters: [],
      emotionalBeat: "",
    };
    updateChapter(chapterId, { 
      keyEvents: [...chapter.keyEvents, newEvent] 
    });
  }

  // 更新关键事件
  function updateKeyEvent(chapterId: string, eventIndex: number, updates: Partial<ChapterKeyEvent>) {
    const chapter = chapters.find(c => c.id === chapterId);
    if (!chapter) return;
    
    const newEvents = [...chapter.keyEvents];
    newEvents[eventIndex] = { ...newEvents[eventIndex], ...updates };
    updateChapter(chapterId, { keyEvents: newEvents });
  }

  // 删除关键事件
  function removeKeyEvent(chapterId: string, eventIndex: number) {
    const chapter = chapters.find(c => c.id === chapterId);
    if (!chapter) return;
    
    const newEvents = chapter.keyEvents.filter((_, i) => i !== eventIndex);
    // 重新排序
    newEvents.forEach((e, i) => e.order = i + 1);
    updateChapter(chapterId, { keyEvents: newEvents });
  }

  // 添加新章节
  function addChapter() {
    const volume = project.outline?.volumes.find(v => v.number === selectedVolume);
    const volumeChapterCount = chapters.filter(c => c.volumeNumber === selectedVolume).length;
    const totalChapterCount = chapters.length;
    
    const newChapter: Chapter = {
      id: uuidv4(),
      volumeNumber: selectedVolume,
      chapterNumberInVolume: volumeChapterCount + 1,
      chapterNumber: totalChapterCount + 1,
      title: "",
      summary: "",
      keyEvents: [],
      wordCountTarget: volume ? Math.floor(volume.wordCountTarget / volume.chapterCount) : 3000,
      openingHook: "",
      closingHook: "",
      foreshadowing: "",
      characterStateChanges: [],
      outlineStatus: "pending",
      sections: [],
    };
    
    const updatedChapters = [...chapters, newChapter];
    setChapters(updatedChapters);
    onUpdate({ chapters: updatedChapters });
    setSelectedChapterId(newChapter.id);
  }

  // 删除章节
  function removeChapter(chapterId: string) {
    const chapter = chapters.find(c => c.id === chapterId);
    if (!chapter) return;
    
    if (!confirm(`确定要删除第 ${chapter.chapterNumberInVolume} 章"${chapter.title || "未命名"}"吗？`)) {
      return;
    }
    
    // 删除该章节并重新编号
    const filteredChapters = chapters.filter(c => c.id !== chapterId);
    
    // 重新编号同卷的章节
    const updatedChapters = filteredChapters.map(c => {
      if (c.volumeNumber === chapter.volumeNumber) {
        // 重新计算该卷内的章节号
        const precedingChapters = filteredChapters.filter(
          pc => pc.volumeNumber === c.volumeNumber && pc.chapterNumber < c.chapterNumber
        );
        const newChapterNumberInVolume = precedingChapters.length + 1;
        
        // 重新计算全局章节号
        const newChapterNumber = filteredChapters.filter(
          pc => pc.chapterNumber < c.chapterNumber
        ).length + 1;
        
        return {
          ...c,
          chapterNumberInVolume: newChapterNumberInVolume,
          chapterNumber: newChapterNumber,
        };
      }
      // 对于其他卷的章节，只更新全局章节号
      const newChapterNumber = filteredChapters.filter(
        pc => pc.chapterNumber < c.chapterNumber
      ).length + 1;
      return {
        ...c,
        chapterNumber: newChapterNumber,
      };
    });
    
    setChapters(updatedChapters);
    onUpdate({ chapters: updatedChapters });
    
    if (selectedChapterId === chapterId) {
      setSelectedChapterId(null);
    }
  }

  // 确认并进入下一阶段
  async function handleConfirm() {
    // Check if all volumes have chapters
    const emptyVolumes = project.outline?.volumes.filter(volume => {
      const volumeChapters = chapters.filter(c => c.volumeNumber === volume.number);
      return volumeChapters.length === 0;
    }) || [];
    
    if (emptyVolumes.length > 0) {
      const volumeNames = emptyVolumes.map(v => `第${v.number}卷《${v.title}》`).join("、");
      alert(`以下卷还没有生成章节大纲，请先生成后再继续：\n${volumeNames}`);
      return;
    }
    
    await onConfirm("section_lists", { chapters });
  }

  // 构建生成上下文
  const buildContext = () => {
    const volume = project.outline?.volumes.find(v => v.number === selectedVolume);
    return `小说基本信息：
标题：${project.bible.meta.title}
题材：${project.bible.meta.genre}
基调：${project.bible.meta.tone}

当前卷信息：
卷数：第 ${selectedVolume} 卷
标题：${volume?.title || ""}
核心事件：${volume?.coreEvent || ""}
卷简介：${volume?.summary || ""}
目标字数：${volume?.wordCountTarget || 0}
章节数：${volume?.chapterCount || 0}

已有章节：
${currentVolumeChapters.map(c => `- 第${c.chapterNumberInVolume}章：${c.title}`).join("\n")}`;
  };

  const systemPrompt = `你是一位专业的章节大纲规划专家。当前小说：${project.bible.meta.title}（${project.bible.meta.genre}）`;

  // 获取当前选中的章节
  const selectedChapter = chapters.find(c => c.id === selectedChapterId);

  return (
    <div className="space-y-6">
      {/* 阶段标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">章节大纲</h1>
          <p className="text-gray-600 mt-1">
            为每一章生成详细的章节大纲
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            onClick={() => onConfirm("outline")}
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            返回上一步
          </Button>
          <select
            className="h-10 px-3 rounded-md border border-input bg-background"
            value={selectedVolume}
            onChange={(e) => {
              const newVolume = parseInt(e.target.value);
              setSelectedVolume(newVolume);
              setSelectedChapterId(null);
            }}
          >
            {project.outline?.volumes.map(v => (
              <option key={v.id} value={v.number}>第 {v.number} 卷</option>
            ))}
          </select>
          <Button 
            variant="outline" 
            onClick={generateChapterOutlines}
            disabled={generating}
          >
            <Sparkles className="w-4 h-4 mr-2" />
            {generating ? "生成中..." : "生成本卷章节"}
          </Button>
          {chapters.length > 0 && (
            <Button onClick={handleConfirm}>
              确认并继续
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          )}
        </div>
      </div>

      {/* 主内容区：左侧章节列表 + 右侧详情 */}
      {currentVolumeChapters.length > 0 ? (
        <div className="flex gap-4 h-[calc(100vh-280px)] min-h-[500px]">
          {/* 左侧章节列表 */}
          <div className="w-64 flex flex-col gap-2">
            <div className="flex justify-between items-center px-1">
              <span className="text-sm font-medium text-muted-foreground">
                共 {currentVolumeChapters.length} 章
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={addChapter}
                className="h-7 px-2"
              >
                <Plus className="w-4 h-4 mr-1" />
                添加
              </Button>
            </div>
            
            <ScrollArea className="flex-1 border rounded-md">
              <div className="p-2 space-y-1">
                {currentVolumeChapters.map((chapter) => (
                  <div
                    key={chapter.id}
                    onClick={() => setSelectedChapterId(chapter.id)}
                    className={`group w-full text-left p-3 rounded-md transition-colors cursor-pointer flex items-center justify-between ${
                      selectedChapterId === chapter.id
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-muted"
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">
                        第 {chapter.chapterNumberInVolume} 章
                      </div>
                      <div className={`text-xs truncate ${
                        selectedChapterId === chapter.id
                          ? "text-primary-foreground/70"
                          : "text-muted-foreground"
                      }`}>
                        {chapter.title || "未命名"}
                      </div>
                    </div>
                    <div
                      role="button"
                      tabIndex={-1}
                      onClick={(e) => { e.stopPropagation(); removeChapter(chapter.id); }}
                      className={`ml-2 p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity ${
                        selectedChapterId === chapter.id
                          ? "hover:bg-primary-foreground/20"
                          : "hover:bg-muted-foreground/20"
                      }`}
                    >
                      <Trash2 className="w-3 h-3" />
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* 右侧章节详情 */}
          <div className="flex-1 overflow-auto">
            {selectedChapter ? (
              <Card className="h-full flex flex-col">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <Badge variant="outline">第 {selectedChapter.chapterNumberInVolume} 章</Badge>
                    <GenerateInput
                      fieldName={`第${selectedChapter.chapterNumberInVolume}章标题`}
                      fieldDescription="章节的标题，概括本章核心内容"
                      generateContext={buildContext()}
                      systemPrompt={systemPrompt}
                      value={selectedChapter.title}
                      onChange={(e) => updateChapter(selectedChapter.id, { title: e.target.value })}
                      className="font-semibold flex-1"
                      placeholder="章节标题"
                    />
                  </div>
                </CardHeader>
                <ScrollArea className="flex-1 h-[calc(100%-80px)]">
                  <CardContent className="space-y-6">
                  {/* 章节摘要 */}
                  <div className="space-y-2">
                    <Label>章节摘要</Label>
                    <GenerateTextarea
                      fieldName={`第${selectedChapter.chapterNumberInVolume}章摘要`}
                      fieldDescription="本章的内容概述，200字以内"
                      generateContext={buildContext()}
                      systemPrompt={systemPrompt}
                      value={selectedChapter.summary}
                      onChange={(e) => updateChapter(selectedChapter.id, { summary: e.target.value })}
                      rows={3}
                      placeholder="章节内容概述..."
                    />
                  </div>

                  {/* 开头钩子和结尾悬念 */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>开头钩子</Label>
                      <GenerateInput
                        fieldName={`第${selectedChapter.chapterNumberInVolume}章开头钩子`}
                        fieldDescription="如何吸引读者继续阅读"
                        generateContext={buildContext()}
                        systemPrompt={systemPrompt}
                        value={selectedChapter.openingHook}
                        onChange={(e) => updateChapter(selectedChapter.id, { openingHook: e.target.value })}
                        placeholder="开头如何吸引读者..."
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>结尾悬念</Label>
                      <GenerateInput
                        fieldName={`第${selectedChapter.chapterNumberInVolume}章结尾悬念`}
                        fieldDescription="本章结尾留下的悬念"
                        generateContext={buildContext()}
                        systemPrompt={systemPrompt}
                        value={selectedChapter.closingHook}
                        onChange={(e) => updateChapter(selectedChapter.id, { closingHook: e.target.value })}
                        placeholder="结尾留下什么悬念..."
                      />
                    </div>
                  </div>

                  {/* 关键事件 */}
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <Label>关键事件</Label>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => addKeyEvent(selectedChapter.id)}
                      >
                        <Sparkles className="w-3 h-3 mr-1" />
                        添加事件
                      </Button>
                    </div>
                    
                    {selectedChapter.keyEvents.length === 0 ? (
                      <div className="text-center py-4 text-muted-foreground text-sm border rounded-md">
                        点击"添加事件"按钮添加关键事件
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {selectedChapter.keyEvents.map((event, index) => (
                          <div key={index} className="p-3 border rounded-md space-y-2">
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary">事件 {event.order}</Badge>
                              <Input
                                value={event.description}
                                onChange={(e) => updateKeyEvent(selectedChapter.id, index, { description: e.target.value })}
                                placeholder="事件描述"
                                className="flex-1"
                              />
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => removeKeyEvent(selectedChapter.id, index)}
                                className="text-destructive h-8 w-8"
                              >
                                ×
                              </Button>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <Input
                                value={event.characters.join(", ")}
                                onChange={(e) => updateKeyEvent(selectedChapter.id, index, { characters: e.target.value.split(",").map(s => s.trim()) })}
                                placeholder="涉及人物（逗号分隔）"
                                className="text-sm"
                              />
                              <Input
                                value={event.emotionalBeat}
                                onChange={(e) => updateKeyEvent(selectedChapter.id, index, { emotionalBeat: e.target.value })}
                                placeholder="情感节奏（如：紧张、温馨）"
                                className="text-sm"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* 伏笔 */}
                  <div className="space-y-2">
                    <Label>伏笔</Label>
                    <GenerateTextarea
                      fieldName={`第${selectedChapter.chapterNumberInVolume}章伏笔`}
                      fieldDescription="本章埋下的伏笔或呼应的伏笔"
                      generateContext={buildContext()}
                      systemPrompt={systemPrompt}
                      value={selectedChapter.foreshadowing}
                      onChange={(e) => updateChapter(selectedChapter.id, { foreshadowing: e.target.value })}
                      rows={2}
                      placeholder="本章的伏笔设置..."
                    />
                  </div>

                  {/* 字数目标 */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>字数目标</Label>
                      <Input
                        type="number"
                        value={selectedChapter.wordCountTarget}
                        onChange={(e) => updateChapter(selectedChapter.id, { wordCountTarget: parseInt(e.target.value) || 0 })}
                      />
                    </div>
                  </div>
                </CardContent>
                </ScrollArea>
              </Card>
            ) : (
              <div className="border rounded-md h-full flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <p className="mb-4">点击左侧章节查看详情</p>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <Card className="text-center py-16">
          <CardContent>
            <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              生成章节大纲
            </h3>
            <p className="text-gray-500 mb-6">
              选择卷数，点击&quot;生成本卷章节&quot;按钮，AI 将为该卷生成详细的章节大纲
            </p>
            <Button onClick={generateChapterOutlines} disabled={generating}>
              <Sparkles className="w-4 h-4 mr-2" />
              {generating ? "生成中..." : "生成章节大纲"}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
