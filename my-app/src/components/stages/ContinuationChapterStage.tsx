"use client";

import { useState, useMemo } from "react";
import { 
  ArrowLeft, 
  ArrowRight, 
  Sparkles, 
  Plus,
  Trash2,
  CheckCircle2,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Zap,
  ListTree
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import type { NovelProject, NovelStage, Chapter, ChapterKeyEvent, Section } from "@/types/novel";
import { v4 as uuidv4 } from "uuid";

interface ContinuationChapterStageProps {
  project: NovelProject;
  onUpdate: (updates: Partial<NovelProject>) => Promise<boolean>;
  onConfirm: (nextStage: NovelStage) => Promise<boolean>;
}

// 从环境变量获取模型配置
const SETTING_MODEL = process.env.SETTING_MODEL || "";

export default function ContinuationChapterStage({
  project,
  onUpdate,
  onConfirm,
}: ContinuationChapterStageProps) {
  const [chapters, setChapters] = useState<Chapter[]>(project.chapters || []);
  const [selectedVolume, setSelectedVolume] = useState<number>(1);
  const [selectedChapterId, setSelectedChapterId] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [generatingSections, setGeneratingSections] = useState<string | null>(null); // 正在生成小节的章节ID

  const volumes = project.outline?.volumes || [];
  const analysisResult = project.continuation?.analysisResult;

  // 获取当前卷的章节
  const currentVolumeChapters = useMemo(() => {
    return chapters
      .filter(c => c.volumeNumber === selectedVolume)
      .sort((a, b) => a.chapterNumberInVolume - b.chapterNumberInVolume);
  }, [chapters, selectedVolume]);

  // 获取当前选中的章节
  const selectedChapter = chapters.find(c => c.id === selectedChapterId);

  // 添加新章节
  function addChapter() {
    const volume = volumes.find(v => v.number === selectedVolume);
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
    
    setChapters([...chapters, newChapter]);
    setSelectedChapterId(newChapter.id);
  }

  // 更新章节
  function updateChapter(chapterId: string, updates: Partial<Chapter>) {
    setChapters(chs => 
      chs.map(c => c.id === chapterId ? { ...c, ...updates } : c)
    );
  }

  // 删除章节
  function removeChapter(chapterId: string) {
    const chapter = chapters.find(c => c.id === chapterId);
    if (!chapter) return;
    
    if (!confirm(`确定要删除第 ${chapter.chapterNumberInVolume} 章"${chapter.title || "未命名"}"吗？`)) {
      return;
    }
    
    const filteredChapters = chapters.filter(c => c.id !== chapterId);
    
    // 重新编号
    const updatedChapters = filteredChapters.map(c => {
      if (c.volumeNumber === chapter.volumeNumber) {
        const precedingChapters = filteredChapters.filter(
          pc => pc.volumeNumber === c.volumeNumber && pc.chapterNumber < c.chapterNumber
        );
        const newChapterNumberInVolume = precedingChapters.length + 1;
        const newChapterNumber = filteredChapters.filter(
          pc => pc.chapterNumber < c.chapterNumber
        ).length + 1;
        
        return {
          ...c,
          chapterNumberInVolume: newChapterNumberInVolume,
          chapterNumber: newChapterNumber,
        };
      }
      const newChapterNumber = filteredChapters.filter(
        pc => pc.chapterNumber < c.chapterNumber
      ).length + 1;
      return {
        ...c,
        chapterNumber: newChapterNumber,
      };
    });
    
    setChapters(updatedChapters);
    
    if (selectedChapterId === chapterId) {
      setSelectedChapterId(null);
    }
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
    newEvents.forEach((e, i) => e.order = i + 1);
    updateChapter(chapterId, { keyEvents: newEvents });
  }

  // AI 生成本卷章节大纲
  async function generateChapters() {
    if (!analysisResult) {
      alert("请先完成 AI 分析");
      return;
    }

    setGenerating(true);
    try {
      const response = await fetch(`/api/projects/${project.id}/generate/chapter-outlines`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          volumeNumber: selectedVolume,
          isContinuation: true,
          continuationContext: {
            previousAnalysis: analysisResult,
            existingChapters: currentVolumeChapters,
          }
        }),
      });

      const result = await response.json();

      if (result.success) {
        const newChapters: Chapter[] = result.data.map((ch: Chapter, idx: number) => ({
          ...ch,
          id: uuidv4(),
          volumeNumber: selectedVolume,
          chapterNumberInVolume: currentVolumeChapters.length + idx + 1,
          chapterNumber: chapters.length + idx + 1,
          outlineStatus: "generated" as const,
          sections: [],
        }));
        
        setChapters([...chapters, ...newChapters]);
        await onUpdate({ chapters: [...chapters, ...newChapters] });
      } else {
        alert(result.error || "生成章节大纲失败");
      }
    } catch (error) {
      console.error("Failed to generate chapters:", error);
      alert("生成章节大纲失败");
    } finally {
      setGenerating(false);
    }
  }

  // 为章节生成小节
  async function generateSections(chapterId: string) {
    const chapter = chapters.find(c => c.id === chapterId);
    if (!chapter) return;

    setGeneratingSections(chapterId);
    try {
      const response = await fetch(`/api/projects/${project.id}/generate/sections`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          chapterId,
          isContinuation: true,
          continuationContext: analysisResult,
        }),
      });

      const result = await response.json();

      if (result.success) {
        const newSections: Section[] = result.data.map((s: Section, idx: number) => ({
          ...s,
          id: uuidv4(),
          sectionNumber: idx + 1,
          volumeNumber: chapter.volumeNumber,
          chapterNumber: chapter.chapterNumber,
          contentStatus: "pending" as const,
        }));
        
        updateChapter(chapterId, { sections: newSections });
      } else {
        alert(result.error || "生成小节失败");
      }
    } catch (error) {
      console.error("Failed to generate sections:", error);
      alert("生成小节失败");
    } finally {
      setGeneratingSections(null);
    }
  }

  // 手动添加小节
  function addSection(chapterId: string) {
    const chapter = chapters.find(c => c.id === chapterId);
    if (!chapter) return;

    const newSection: Section = {
      id: uuidv4(),
      volumeNumber: chapter.volumeNumber,
      chapterNumber: chapter.chapterNumber,
      sectionNumber: (chapter.sections?.length || 0) + 1,
      title: "",
      sceneTime: "",
      sceneLocation: "",
      contentSummary: "",
      emotionalBeat: "",
      wordCountTarget: Math.floor(chapter.wordCountTarget / 3),
      contentStatus: "pending",
    };

    updateChapter(chapterId, { 
      sections: [...(chapter.sections || []), newSection] 
    });
  }

  // 更新小节
  function updateSection(chapterId: string, sectionId: string, updates: Partial<Section>) {
    const chapter = chapters.find(c => c.id === chapterId);
    if (!chapter) return;

    const updatedSections = chapter.sections?.map(s => 
      s.id === sectionId ? { ...s, ...updates } : s
    ) || [];

    updateChapter(chapterId, { sections: updatedSections });
  }

  // 删除小节
  function removeSection(chapterId: string, sectionId: string) {
    const chapter = chapters.find(c => c.id === chapterId);
    if (!chapter) return;

    const filteredSections = chapter.sections?.filter(s => s.id !== sectionId) || [];
    // 重新编号
    const renumberedSections = filteredSections.map((s, idx) => ({
      ...s,
      sectionNumber: idx + 1,
    }));

    updateChapter(chapterId, { sections: renumberedSections });
  }

  // 确认并进入下一阶段
  async function handleConfirm() {
    // 检查是否所有章节都有小节
    const chaptersWithoutSections = chapters.filter(c => !c.sections || c.sections.length === 0);
    if (chaptersWithoutSections.length > 0) {
      if (!confirm(`有 ${chaptersWithoutSections.length} 个章节尚未生成小节，是否继续？`)) {
        return;
      }
    }
    await onUpdate({ chapters });
    await onConfirm("continuation_writing");
  }

  // 构建生成上下文
  const buildContext = () => {
    const volume = volumes.find(v => v.number === selectedVolume);
    return `续写作品：${project.title}
原作：${project.sourceMaterial?.originalTitle || ""}

当前卷信息：
卷数：第 ${selectedVolume} 卷
标题：${volume?.title || ""}
核心事件：${volume?.coreEvent || ""}
卷简介：${volume?.summary || ""}

续写建议：
${analysisResult?.suggestedContinuation || ""}

已有章节：
${currentVolumeChapters.map(c => `- 第${c.chapterNumberInVolume}章：${c.title}`).join("\n")}`;
  };

  const systemPrompt = `你是一位专业的续写章节规划专家。当前续写作品：${project.title}`;

  if (volumes.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">章节规划</h1>
            <p className="text-gray-600 mt-1">请先完成续写大纲</p>
          </div>
          <Button variant="outline" onClick={() => onConfirm("continuation_outline")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            返回
          </Button>
        </div>
        <Card className="p-8 text-center">
          <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">暂无卷规划</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 标题栏 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">章节规划</h1>
          <p className="text-gray-600 mt-1">
            为续写部分规划详细的章节大纲
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => onConfirm("continuation_outline")}>
            <ChevronLeft className="w-4 h-4 mr-1" />
            返回
          </Button>
          <select
            className="h-10 px-3 rounded-md border border-input bg-background"
            value={selectedVolume}
            onChange={(e) => {
              setSelectedVolume(parseInt(e.target.value));
              setSelectedChapterId(null);
            }}
          >
            {volumes.map(v => (
              <option key={v.id} value={v.number}>第 {v.number} 卷</option>
            ))}
          </select>
          <Button 
            variant="outline" 
            onClick={generateChapters}
            disabled={generating}
          >
            <Sparkles className="w-4 h-4 mr-2" />
            {generating ? "生成中..." : "AI 生成本卷章节"}
          </Button>
          {chapters.length > 0 && (
            <Button onClick={handleConfirm}>
              确认并继续
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          )}
        </div>
      </div>

      {/* 主内容区 */}
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
                    <Input
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
                      <Textarea
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
                        <Input
                          value={selectedChapter.openingHook}
                          onChange={(e) => updateChapter(selectedChapter.id, { openingHook: e.target.value })}
                          placeholder="如何吸引读者..."
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>结尾悬念</Label>
                        <Input
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
                          <Plus className="w-3 h-3 mr-1" />
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
                      <Textarea
                        value={selectedChapter.foreshadowing}
                        onChange={(e) => updateChapter(selectedChapter.id, { foreshadowing: e.target.value })}
                        rows={2}
                        placeholder="本章的伏笔设置（回收旧伏笔或铺设新伏笔）..."
                      />
                    </div>

                    {/* 小节列表 */}
                    <div className="space-y-3 border-t pt-4">
                      <div className="flex justify-between items-center">
                        <Label className="flex items-center gap-2">
                          <ListTree className="w-4 h-4" />
                          小节列表 ({selectedChapter.sections?.length || 0})
                        </Label>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => generateSections(selectedChapter.id)}
                            disabled={generatingSections === selectedChapter.id}
                          >
                            <Sparkles className="w-3 h-3 mr-1" />
                            {generatingSections === selectedChapter.id ? "生成中..." : "AI 生成小节"}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => addSection(selectedChapter.id)}
                          >
                            <Plus className="w-3 h-3 mr-1" />
                            添加小节
                          </Button>
                        </div>
                      </div>

                      {(!selectedChapter.sections || selectedChapter.sections.length === 0) ? (
                        <div className="text-center py-4 text-muted-foreground text-sm border rounded-md">
                          暂无小节，点击"AI 生成小节"或"添加小节"按钮创建
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {selectedChapter.sections.map((section) => (
                            <Card key={section.id} className="border-l-4 border-l-primary">
                              <CardContent className="p-3 space-y-2">
                                <div className="flex items-center gap-2">
                                  <Badge variant="secondary">第 {section.sectionNumber} 节</Badge>
                                  <Input
                                    value={section.title || ""}
                                    onChange={(e) => updateSection(selectedChapter.id, section.id, { title: e.target.value })}
                                    placeholder="小节标题（可选）"
                                    className="flex-1 h-8"
                                  />
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => removeSection(selectedChapter.id, section.id)}
                                    className="text-red-500 h-8 w-8 p-0"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                  <Input
                                    value={section.sceneTime || ""}
                                    onChange={(e) => updateSection(selectedChapter.id, section.id, { sceneTime: e.target.value })}
                                    placeholder="场景时间"
                                    className="h-8 text-sm"
                                  />
                                  <Input
                                    value={section.sceneLocation || ""}
                                    onChange={(e) => updateSection(selectedChapter.id, section.id, { sceneLocation: e.target.value })}
                                    placeholder="场景地点"
                                    className="h-8 text-sm"
                                  />
                                </div>
                                <Textarea
                                  value={section.contentSummary || ""}
                                  onChange={(e) => updateSection(selectedChapter.id, section.id, { contentSummary: e.target.value })}
                                  placeholder="内容概要..."
                                  rows={2}
                                  className="text-sm resize-none"
                                />
                                <div className="flex gap-2">
                                  <Input
                                    value={section.emotionalBeat || ""}
                                    onChange={(e) => updateSection(selectedChapter.id, section.id, { emotionalBeat: e.target.value })}
                                    placeholder="情感节拍"
                                    className="h-8 text-sm flex-1"
                                  />
                                  <Input
                                    type="number"
                                    value={section.wordCountTarget || 500}
                                    onChange={(e) => updateSection(selectedChapter.id, section.id, { wordCountTarget: parseInt(e.target.value) || 500 })}
                                    placeholder="字数"
                                    className="h-8 text-sm w-24"
                                  />
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      )}
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
              点击"AI 生成本卷章节"按钮，AI 将基于前作分析生成章节大纲
            </p>
            <div className="flex gap-2 justify-center">
              <Button onClick={generateChapters} disabled={generating}>
                <Sparkles className="w-4 h-4 mr-2" />
                {generating ? "生成中..." : "AI 生成章节大纲"}
              </Button>
              <Button variant="outline" onClick={addChapter}>
                <Plus className="w-4 h-4 mr-2" />
                手动添加章节
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
