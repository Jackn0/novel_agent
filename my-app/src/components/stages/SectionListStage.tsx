"use client";

import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight, Sparkles, ListTree, Zap, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { GenerateInput } from "@/components/ui/generate-input";
import { GenerateTextarea } from "@/components/ui/generate-textarea";
import type { NovelProject, NovelStage, Chapter, Section } from "@/types/novel";
import { v4 as uuidv4 } from "uuid";

interface SectionListStageProps {
  project: NovelProject;
  onUpdate: (updates: Partial<NovelProject>) => Promise<boolean>;
  onConfirm: (nextStage: NovelStage, data?: { chapters?: Chapter[] }) => Promise<boolean>;
}

export default function SectionListStage({ project, onUpdate, onConfirm }: SectionListStageProps) {
  const [generatingChapterId, setGeneratingChapterId] = useState<string | null>(null);
  const [generatingAll, setGeneratingAll] = useState(false);
  const [selectedChapterId, setSelectedChapterId] = useState<string | null>(null);

  // 从 project 直接读取数据，避免重复状态
  const chapters = project.chapters || [];
  const volumes = project.outline?.volumes || [];
  
  // 获取当前选中的卷（如果项目有卷数据，默认选第一卷）
  const [selectedVolume, setSelectedVolume] = useState<number>(() => {
    return volumes[0]?.number ?? 1;
  });

  // 获取当前卷的章节
  const currentVolumeChapters = useMemo(() => {
    return chapters
      .filter(c => c.volumeNumber === selectedVolume)
      .sort((a, b) => a.chapterNumberInVolume - b.chapterNumberInVolume);
  }, [chapters, selectedVolume]);

  // 获取当前选中的章节
  const selectedChapter = chapters.find(c => c.id === selectedChapterId);

  // 使用LLM生成单个章节的小节列表
  async function generateSections(chapterId: string) {
    setGeneratingChapterId(chapterId);
    try {
      const response = await fetch(`/api/projects/${project.id}/generate/sections`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chapterId }),
      });

      const result = await response.json();

      if (result.success) {
        const newSections: Section[] = result.data;
        
        // 直接更新 chapters
        const updatedChapters = chapters.map(c => {
          if (c.id === chapterId) {
            return { ...c, sections: newSections };
          }
          return c;
        });
        await onUpdate({ chapters: updatedChapters });
      } else {
        alert(result.error || "生成小节列表失败");
      }
    } catch (error) {
      console.error("Failed to generate sections:", error);
      alert("生成小节列表失败，请检查 API 配置");
    } finally {
      setGeneratingChapterId(null);
    }
  }

  // 一键生成当前卷所有章节的小节
  async function generateAllSections() {
    const chaptersWithoutSections = currentVolumeChapters.filter(
      c => !c.sections || c.sections.length === 0
    );
    
    if (chaptersWithoutSections.length === 0) {
      alert("当前卷所有章节已生成小节列表");
      return;
    }

    if (!confirm(`将为当前卷的 ${chaptersWithoutSections.length} 个章节生成小节列表，这可能需要一些时间。是否继续？`)) {
      return;
    }

    setGeneratingAll(true);
    let updatedChapters = [...chapters];
    
    for (const chapter of chaptersWithoutSections) {
      try {
        const response = await fetch(`/api/projects/${project.id}/generate/sections`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chapterId: chapter.id }),
        });

        const result = await response.json();

        if (result.success) {
          const newSections: Section[] = result.data;
          
          // 更新章节
          updatedChapters = updatedChapters.map(c => {
            if (c.id === chapter.id) {
              return { ...c, sections: newSections };
            }
            return c;
          });
        } else {
          console.error(`生成第 ${chapter.chapterNumberInVolume} 章小节失败:`, result.error);
        }
      } catch (error) {
        console.error(`生成第 ${chapter.chapterNumberInVolume} 章小节失败:`, error);
      }
    }
    
    // 统一保存
    await onUpdate({ chapters: updatedChapters });
    setGeneratingAll(false);
    alert("批量生成完成！");
  }

  // 更新小节
  async function updateSection(chapterId: string, sectionId: string, updates: Partial<Section>) {
    const updatedChapters = chapters.map(c => {
      if (c.id === chapterId) {
        return {
          ...c,
          sections: c.sections?.map(s => 
            s.id === sectionId ? { ...s, ...updates } : s
          ) || [],
        };
      }
      return c;
    });
    await onUpdate({ chapters: updatedChapters });
  }

  // 添加小节
  async function addSection(chapterId: string) {
    const chapter = chapters.find(c => c.id === chapterId);
    if (!chapter) return;
    
    const currentSections = chapter.sections || [];
    const newSection: Section = {
      id: uuidv4(),
      volumeNumber: chapter.volumeNumber,
      chapterNumber: chapter.chapterNumber,
      sectionNumber: currentSections.length + 1,
      title: "",
      sceneTime: "",
      sceneLocation: "",
      contentSummary: "",
      pov: "",
      emotionalBeat: "",
      wordCountTarget: Math.floor((chapter.wordCountTarget || 3000) / (currentSections.length + 1)),
      writingNotes: "",
      contentStatus: "pending",
    };
    
    const updatedChapters = chapters.map(c => {
      if (c.id === chapterId) {
        return {
          ...c,
          sections: [...currentSections, newSection],
        };
      }
      return c;
    });
    await onUpdate({ chapters: updatedChapters });
  }

  // 删除小节
  async function removeSection(chapterId: string, sectionId: string) {
    const chapter = chapters.find(c => c.id === chapterId);
    if (!chapter) return;
    
    const currentSections = chapter.sections || [];
    const section = currentSections.find(s => s.id === sectionId);
    if (!section) return;
    
    if (!confirm(`确定要删除第 ${section.sectionNumber} 节"${section.title || "未命名"}"吗？`)) {
      return;
    }
    
    // 删除小节并重新编号
    const filteredSections = currentSections.filter(s => s.id !== sectionId);
    const renumberedSections = filteredSections.map((s, index) => ({
      ...s,
      sectionNumber: index + 1,
    }));
    
    const updatedChapters = chapters.map(c => {
      if (c.id === chapterId) {
        return {
          ...c,
          sections: renumberedSections,
        };
      }
      return c;
    });
    await onUpdate({ chapters: updatedChapters });
  }

  // 删除章节（同步删除关联的小节）
  async function removeChapter(chapterId: string) {
    const chapter = chapters.find(c => c.id === chapterId);
    if (!chapter) return;
    
    const sectionCount = chapter.sections?.length || 0;
    const warningMsg = sectionCount > 0 
      ? `该章节包含 ${sectionCount} 个小节，删除章节将同时删除所有小节。` 
      : "";
    
    if (!confirm(`确定要删除第 ${chapter.chapterNumberInVolume} 章"${chapter.title || "未命名"}"吗？${warningMsg}`)) {
      return;
    }
    
    // 删除该章节并重新编号
    const filteredChapters = chapters.filter(c => c.id !== chapterId);
    
    // 重新编号同卷的章节
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
    
    await onUpdate({ chapters: updatedChapters });
    
    if (selectedChapterId === chapterId) {
      setSelectedChapterId(null);
    }
  }

  // 确认并进入下一阶段
  async function handleConfirm() {
    // Check if all chapters have sections
    const chaptersWithoutSections = chapters.filter(c => !c.sections || c.sections.length === 0);
    
    if (chaptersWithoutSections.length > 0) {
      const chapterNames = chaptersWithoutSections.map(c => `第${c.chapterNumber}章《${c.title}》`).join("、");
      alert(`以下章节还没有生成小节列表，请先生成后再继续：\n${chapterNames}`);
      return;
    }
    
    await onConfirm("writing", { chapters });
  }

  // 构建生成上下文
  const buildContext = () => {
    const chapter = selectedChapter;
    if (!chapter) return "";
    
    const volume = volumes.find(v => v.number === selectedVolume);
    return `小说基本信息：
标题：${project.bible.meta.title}
题材：${project.bible.meta.genre}

当前卷信息：
卷数：第 ${selectedVolume} 卷
标题：${volume?.title || ""}
核心事件：${volume?.coreEvent || ""}

当前章节信息：
章节：第 ${chapter.chapterNumberInVolume} 章
标题：${chapter.title}
摘要：${chapter.summary}
关键事件：${chapter.keyEvents.map(e => e.description).join("；")}`;
  };

  const systemPrompt = `你是一位专业的小说小节规划专家。当前小说：${project.bible.meta.title}（${project.bible.meta.genre}）`;

  // 检查当前卷是否有未生成小节的章节
  const hasChaptersWithoutSections = currentVolumeChapters.some(
    c => !c.sections || c.sections.length === 0
  );

  return (
    <div className="space-y-6">
      {/* 阶段标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">小节列表</h1>
          <p className="text-gray-600 mt-1">
            将每一章细分为若干小节，规划写作内容
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            onClick={() => onConfirm("chapter_outlines")}
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            返回上一步
          </Button>
          
          {volumes.length > 0 && (
            <select
              className="h-10 px-3 rounded-md border border-input bg-background"
              value={selectedVolume}
              onChange={(e) => {
                const newVolume = parseInt(e.target.value);
                setSelectedVolume(newVolume);
                setSelectedChapterId(null);
              }}
            >
              {volumes.map(v => (
                <option key={v.id} value={v.number}>第 {v.number} 卷</option>
              ))}
            </select>
          )}

          {/* 一键生成按钮 */}
          {hasChaptersWithoutSections && (
            <Button 
              variant="secondary"
              onClick={generateAllSections}
              disabled={generatingAll}
            >
              <Zap className="w-4 h-4 mr-2" />
              {generatingAll ? "批量生成中..." : "一键生成本卷所有小节"}
            </Button>
          )}

          {chapters.length > 0 && (
            <Button onClick={handleConfirm}>
              开始写作
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
                      <div className={`text-xs mt-1 ${
                        selectedChapterId === chapter.id
                          ? "text-primary-foreground/60"
                          : "text-muted-foreground"
                      }`}>
                        {chapter.sections && chapter.sections.length > 0 
                          ? `${chapter.sections.length} 小节` 
                          : "未生成"}
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

          {/* 右侧章节详情和小节列表 */}
          <div className="flex-1 overflow-auto">
            {selectedChapter ? (
              <Card className="h-full">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <Badge variant="outline">第 {selectedChapter.chapterNumberInVolume} 章</Badge>
                    <span className="font-semibold">{selectedChapter.title}</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    {selectedChapter.summary}
                  </p>
                </CardHeader>
                <ScrollArea className="flex-1 h-[calc(100%-120px)]">
                  <CardContent className="space-y-6">
                    {/* 生成按钮 */}
                    {!selectedChapter.sections || selectedChapter.sections.length === 0 ? (
                    <div className="text-center py-12 border rounded-lg">
                      <ListTree className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                      <p className="text-muted-foreground mb-4">该章节尚未生成小节列表</p>
                      <Button 
                        variant="outline" 
                        onClick={() => generateSections(selectedChapter.id)}
                        disabled={generatingChapterId === selectedChapter.id}
                      >
                        <Sparkles className="w-4 h-4 mr-2" />
                        {generatingChapterId === selectedChapter.id ? "生成中..." : "AI 生成小节列表"}
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <h3 className="font-medium">小节列表</h3>
                        <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => addSection(selectedChapter.id)}
                          >
                            <Plus className="w-4 h-4 mr-1" />
                            添加小节
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => generateSections(selectedChapter.id)}
                            disabled={generatingChapterId === selectedChapter.id}
                          >
                            <Sparkles className="w-4 h-4 mr-2" />
                            {generatingChapterId === selectedChapter.id ? "生成中..." : "重新生成"}
                          </Button>
                        </div>
                      </div>
                      
                      {selectedChapter.sections.map((section) => (
                        <Card key={section.id} className="border-l-4 border-l-primary">
                          <CardHeader className="pb-3">
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary">第 {section.sectionNumber} 节</Badge>
                              <GenerateInput
                                fieldName={`第${selectedChapter.chapterNumberInVolume}章第${section.sectionNumber}节标题`}
                                fieldDescription="小节的标题，概括本节核心内容"
                                generateContext={buildContext()}
                                systemPrompt={systemPrompt}
                                value={section.title || ""}
                                onChange={(e) => updateSection(selectedChapter.id, section.id, { title: e.target.value })}
                                className="flex-1"
                                placeholder="小节标题（可选）"
                              />
                              <div
                                role="button"
                                tabIndex={-1}
                                onClick={() => removeSection(selectedChapter.id, section.id)}
                                className="p-1 rounded opacity-60 hover:opacity-100 hover:bg-destructive/10 transition-opacity cursor-pointer"
                              >
                                <Trash2 className="w-4 h-4 text-destructive" />
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label className="text-xs">场景时间</Label>
                                <GenerateInput
                                  fieldName={`第${section.sectionNumber}节场景时间`}
                                  fieldDescription="该小节发生的具体时间"
                                  generateContext={buildContext()}
                                  systemPrompt={systemPrompt}
                                  value={section.sceneTime}
                                  onChange={(e) => updateSection(selectedChapter.id, section.id, { sceneTime: e.target.value })}
                                  placeholder="如：黄昏、三年后"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label className="text-xs">场景地点</Label>
                                <GenerateInput
                                  fieldName={`第${section.sectionNumber}节场景地点`}
                                  fieldDescription="该小节发生的地点"
                                  generateContext={buildContext()}
                                  systemPrompt={systemPrompt}
                                  value={section.sceneLocation}
                                  onChange={(e) => updateSection(selectedChapter.id, section.id, { sceneLocation: e.target.value })}
                                  placeholder="地点名称"
                                />
                              </div>
                            </div>
                            
                            <div className="space-y-2">
                              <Label className="text-xs">内容概要</Label>
                              <GenerateTextarea
                                fieldName={`第${section.sectionNumber}节内容概要`}
                                fieldDescription="该小节要写什么内容，2-3句话概括"
                                generateContext={buildContext()}
                                systemPrompt={systemPrompt}
                                value={section.contentSummary}
                                onChange={(e) => updateSection(selectedChapter.id, section.id, { contentSummary: e.target.value })}
                                placeholder="该小节要写什么，2-3句话..."
                                rows={2}
                              />
                            </div>
                            
                            <div className="grid grid-cols-3 gap-4">
                              <div className="space-y-2">
                                <Label className="text-xs">情感节拍</Label>
                                <GenerateInput
                                  fieldName={`第${section.sectionNumber}节情感节拍`}
                                  fieldDescription="该小节的情感基调"
                                  generateContext={buildContext()}
                                  systemPrompt={systemPrompt}
                                  value={section.emotionalBeat}
                                  onChange={(e) => updateSection(selectedChapter.id, section.id, { emotionalBeat: e.target.value })}
                                  placeholder="如：紧张、温馨"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label className="text-xs">视角角色 (POV)</Label>
                                <Input
                                  value={section.pov || ""}
                                  onChange={(e) => updateSection(selectedChapter.id, section.id, { pov: e.target.value })}
                                  placeholder="角色ID"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label className="text-xs">目标字数</Label>
                                <Input
                                  type="number"
                                  value={section.wordCountTarget}
                                  onChange={(e) => updateSection(selectedChapter.id, section.id, { wordCountTarget: parseInt(e.target.value) || 500 })}
                                />
                              </div>
                            </div>
                            
                            <div className="space-y-2">
                              <Label className="text-xs">写作要点</Label>
                              <GenerateInput
                                fieldName={`第${section.sectionNumber}节写作要点`}
                                fieldDescription="写作时需要特别注意的地方"
                                generateContext={buildContext()}
                                systemPrompt={systemPrompt}
                                value={section.writingNotes || ""}
                                onChange={(e) => updateSection(selectedChapter.id, section.id, { writingNotes: e.target.value })}
                                placeholder="特别需要注意的写法建议"
                              />
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                  </CardContent>
                </ScrollArea>
              </Card>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <ListTree className="w-12 h-12 mx-auto mb-4" />
                  <p>请在左侧选择一章查看小节详情</p>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="text-center py-12 border rounded-lg">
          <p className="text-muted-foreground">当前卷暂无章节，请先在"章节大纲"阶段生成章节</p>
          <Button 
            variant="outline" 
            className="mt-4"
            onClick={() => onConfirm("chapter_outlines")}
          >
            前往章节大纲
          </Button>
        </div>
      )}
    </div>
  );
}
