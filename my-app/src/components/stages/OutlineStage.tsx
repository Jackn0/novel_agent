"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, Sparkles, RotateCcw, AlertTriangle, Plus, Trash2, Wand2, BookOpen } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { NovelProject, NovelStage, NovelOutline, Volume } from "@/types/novel";
import { GenerateTextarea } from "@/components/ui/generate-textarea";
import { GenerateInput } from "@/components/ui/generate-input";

interface OutlineStageProps {
  project: NovelProject;
  onUpdate: (updates: Partial<NovelProject>) => Promise<boolean>;
  onConfirm: (nextStage: NovelStage, data?: { outline?: NovelOutline }) => Promise<boolean>;
}

// 卷配置项
interface VolumeConfig {
  wordCountTarget: number;
  chapterCount: number;
}

export default function OutlineStage({ project, onUpdate, onConfirm }: OutlineStageProps) {
  const [generating, setGenerating] = useState(false);
  const [outline, setOutline] = useState<NovelOutline | null>(project.outline);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [resetting, setResetting] = useState(false);
  
  // 生成配置对话框
  const [showGenerateConfigDialog, setShowGenerateConfigDialog] = useState(false);
  const [volumeCount, setVolumeCount] = useState(3);
  const [volumeConfigs, setVolumeConfigs] = useState<VolumeConfig[]>([
    { wordCountTarget: 100000, chapterCount: 50 },
    { wordCountTarget: 100000, chapterCount: 50 },
    { wordCountTarget: 100000, chapterCount: 50 },
  ]);
  
  // 删除卷确认对话框
  const [showDeleteVolumeDialog, setShowDeleteVolumeDialog] = useState(false);
  const [deletingVolumeIndex, setDeletingVolumeIndex] = useState<number | null>(null);

  // 打开生成配置对话框
  function openGenerateConfig() {
    // 如果已有大纲，使用现有的卷数作为默认值
    if (outline && outline.volumes.length > 0) {
      setVolumeCount(outline.volumes.length);
      setVolumeConfigs(outline.volumes.map(v => ({
        wordCountTarget: v.wordCountTarget,
        chapterCount: v.chapterCount
      })));
    } else {
      // 根据总字数目标计算默认值
      const totalWordCount = project.bible.meta.wordCountTarget || 300000;
      const defaultVolumeCount = 3;
      const wordsPerVolume = Math.floor(totalWordCount / defaultVolumeCount);
      setVolumeCount(defaultVolumeCount);
      setVolumeConfigs(Array(defaultVolumeCount).fill(null).map(() => ({
        wordCountTarget: wordsPerVolume,
        chapterCount: Math.floor(wordsPerVolume / 2000) // 默认每章2000字
      })));
    }
    setShowGenerateConfigDialog(true);
  }

  // 更新卷数
  function updateVolumeCount(count: number) {
    const newCount = Math.max(1, Math.min(10, count));
    setVolumeCount(newCount);
    
    // 调整配置数组
    setVolumeConfigs(prev => {
      const newConfigs = [...prev];
      if (newCount > prev.length) {
        // 添加新卷配置
        const lastConfig = prev[prev.length - 1] || { wordCountTarget: 100000, chapterCount: 50 };
        for (let i = prev.length; i < newCount; i++) {
          newConfigs.push({ ...lastConfig });
        }
      } else if (newCount < prev.length) {
        // 移除多余的卷配置
        newConfigs.splice(newCount);
      }
      return newConfigs;
    });
  }

  // 更新卷配置
  function updateVolumeConfig(index: number, updates: Partial<VolumeConfig>) {
    setVolumeConfigs(prev => {
      const newConfigs = [...prev];
      newConfigs[index] = { ...newConfigs[index], ...updates };
      return newConfigs;
    });
  }

  // 生成大纲（调用 AI）
  async function generateOutline() {
    setGenerating(true);
    setShowGenerateConfigDialog(false);
    
    try {
      const response = await fetch(`/api/projects/${project.id}/generate/outline`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          volumeCount,
          volumeConfigs
        }),
      });
      
      const result = await response.json();
      
      if (result.success) {
        setOutline(result.data);
        // 自动保存到项目
        await onUpdate({ outline: result.data });
      } else {
        alert(result.error || "生成大纲失败");
      }
    } catch (error) {
      console.error("Failed to generate outline:", error);
      alert("生成大纲失败，请检查 API 配置");
    } finally {
      setGenerating(false);
    }
  }

  // 生成单卷（添加新卷时）
  async function generateSingleVolume(volumeNumber: number) {
    if (!outline) return;
    
    setGenerating(true);
    try {
      const response = await fetch(`/api/projects/${project.id}/generate/outline/volume`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          volumeNumber,
          existingVolumes: outline.volumes,
          mainArc: outline.mainArc
        }),
      });
      
      const result = await response.json();
      
      if (result.success) {
        const newVolume = result.data;
        const newVolumes = [...outline.volumes, newVolume];
        const newOutline = { ...outline, volumes: newVolumes };
        setOutline(newOutline);
        await onUpdate({ outline: newOutline });
      } else {
        alert(result.error || "生成卷失败");
      }
    } catch (error) {
      console.error("Failed to generate volume:", error);
      alert("生成卷失败");
    } finally {
      setGenerating(false);
    }
  }

  // 生成故事主线
  async function generateMainArc() {
    setGenerating(true);
    try {
      const response = await fetch(`/api/projects/${project.id}/generate/outline/main-arc`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          existingOutline: outline
        }),
      });
      
      const result = await response.json();
      
      if (result.success) {
        const mainArc = result.data.mainArc;
        if (outline) {
          const newOutline = { ...outline, mainArc };
          setOutline(newOutline);
          await onUpdate({ outline: newOutline });
        } else {
          // 创建新的大纲对象
          const newOutline: NovelOutline = {
            mainArc,
            subplots: [],
            volumes: [],
            timeline: []
          };
          setOutline(newOutline);
          await onUpdate({ outline: newOutline });
        }
      } else {
        alert(result.error || "生成主线失败");
      }
    } catch (error) {
      console.error("Failed to generate main arc:", error);
      alert("生成主线失败");
    } finally {
      setGenerating(false);
    }
  }

  // 重新配置：重新生成大纲并重置章节和小节
  async function handleResetAndReconfigure() {
    setResetting(true);
    try {
      // 打开配置对话框
      setShowResetDialog(false);
      openGenerateConfig();
    } finally {
      setResetting(false);
    }
  }

  // 保存大纲并进入下一阶段
  async function handleConfirm() {
    if (outline) {
      await onConfirm("chapter_outlines", { outline });
    }
  }

  // 返回上一阶段
  async function handleBack() {
    if (outline) {
      await onUpdate({ outline });
    }
    await onConfirm("bible_climaxes");
  }

  // 更新卷信息
  function updateVolume(index: number, updates: Partial<Volume>) {
    if (!outline) return;
    const newVolumes = [...outline.volumes];
    newVolumes[index] = { ...newVolumes[index], ...updates };
    const newOutline = { ...outline, volumes: newVolumes };
    setOutline(newOutline);
    // 自动保存
    onUpdate({ outline: newOutline });
  }

  // 更新主线
  function updateMainArc(mainArc: string) {
    if (!outline) return;
    const newOutline = { ...outline, mainArc };
    setOutline(newOutline);
    onUpdate({ outline: newOutline });
  }

  // 添加新卷（手动）
  function addVolume() {
    if (!outline) return;
    
    const newVolumeNumber = outline.volumes.length + 1;
    const defaultWordCount = outline.volumes.length > 0 
      ? outline.volumes[outline.volumes.length - 1].wordCountTarget 
      : 100000;
    const defaultChapterCount = outline.volumes.length > 0
      ? outline.volumes[outline.volumes.length - 1].chapterCount
      : 50;
    
    const newVolume: Volume = {
      id: `volume_${Date.now()}`,
      number: newVolumeNumber,
      title: `第${newVolumeNumber}卷`,
      coreEvent: "",
      wordCountTarget: defaultWordCount,
      chapterCount: defaultChapterCount,
      summary: ""
    };
    
    const newOutline = { 
      ...outline, 
      volumes: [...outline.volumes, newVolume] 
    };
    setOutline(newOutline);
    onUpdate({ outline: newOutline });
  }

  // 删除卷
  function deleteVolume(index: number) {
    if (!outline) return;
    
    const newVolumes = outline.volumes.filter((_, i) => i !== index);
    // 重新编号
    const renumberedVolumes = newVolumes.map((v, i) => ({
      ...v,
      number: i + 1
    }));
    
    const newOutline = { ...outline, volumes: renumberedVolumes };
    setOutline(newOutline);
    onUpdate({ outline: newOutline });
    setShowDeleteVolumeDialog(false);
    setDeletingVolumeIndex(null);
  }

  // 打开删除确认对话框
  function confirmDeleteVolume(index: number) {
    setDeletingVolumeIndex(index);
    setShowDeleteVolumeDialog(true);
  }

  // 构建生成上下文
  const buildContext = () => {
    return `小说基本信息：
标题：${project.bible.meta.title}
题材：${project.bible.meta.genre}
基调：${project.bible.meta.tone}
简介：${project.bible.meta.synopsis}
核心主题：${project.bible.meta.themes.join(", ")}

人物设定：
${project.bible.characters.map(c => `- ${c.name}（${c.role}）：${c.personality?.slice(0, 50)}...`).join("\n")}

势力设定：
${project.bible.factions.map(f => `- ${f.name}：${f.goal?.slice(0, 50)}...`).join("\n")}

高潮场景：
${project.bible.climaxScenes.map(c => `- ${c.name}（${c.targetPosition}）`).join("\n")}`;
  };

  const systemPrompt = `你是一位专业的小说大纲规划专家，擅长基于小说预设创作完整的故事大纲。当前小说：${project.bible.meta.title}（${project.bible.meta.genre}）`;

  return (
    <div className="space-y-6">
      {/* 阶段标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">大纲规划</h1>
          <p className="text-gray-600 mt-1">
            规划小说的整体结构和故事走向
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            onClick={handleBack}
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            返回上一步
          </Button>
          {outline && (
            <Button 
              variant="outline" 
              onClick={() => setShowResetDialog(true)}
              disabled={generating || resetting}
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              重新配置
            </Button>
          )}
          <Button 
            variant="outline" 
            onClick={openGenerateConfig}
            disabled={generating}
          >
            <Sparkles className="w-4 h-4 mr-2" />
            {generating ? "生成中..." : "AI 生成大纲"}
          </Button>
          {outline && (
            <Button onClick={handleConfirm}>
              确认并继续
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          )}
        </div>
      </div>

      {/* 大纲编辑器 */}
      {outline ? (
        <div className="space-y-6">
          {/* 故事主线 */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle>故事主线</CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={generateMainArc}
                disabled={generating}
              >
                <Wand2 className="w-4 h-4 mr-2" />
                AI 生成主线
              </Button>
            </CardHeader>
            <CardContent>
              <GenerateTextarea
                fieldName="故事主线"
                fieldDescription="故事的核心主线，概括主角的目标、冲突和最终结局"
                generateContext={buildContext()}
                systemPrompt={systemPrompt}
                value={outline.mainArc}
                onChange={(e) => updateMainArc(e.target.value)}
                rows={5}
              />
            </CardContent>
          </Card>

          {/* 卷规划 */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">卷规划</h3>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={addVolume}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  添加新卷
                </Button>
              </div>
            </div>
            {outline.volumes.map((volume, index) => (
              <Card key={volume.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-500">第 {volume.number} 卷</span>
                    <GenerateInput
                      fieldName={`第${volume.number}卷标题`}
                      fieldDescription="卷的标题，概括本卷核心内容"
                      generateContext={buildContext()}
                      systemPrompt={systemPrompt}
                      value={volume.title}
                      onChange={(e) => updateVolume(index, { title: e.target.value })}
                      className="font-semibold flex-1"
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
                      onClick={() => confirmDeleteVolume(index)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>核心事件</Label>
                    <GenerateInput
                      fieldName={`第${volume.number}卷核心事件`}
                      fieldDescription="本卷发生的核心事件或转折点"
                      generateContext={buildContext()}
                      systemPrompt={systemPrompt}
                      value={volume.coreEvent}
                      onChange={(e) => updateVolume(index, { coreEvent: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>卷简介</Label>
                    <GenerateTextarea
                      fieldName={`第${volume.number}卷简介`}
                      fieldDescription="本卷的故事概要和发展脉络"
                      generateContext={buildContext()}
                      systemPrompt={systemPrompt}
                      value={volume.summary}
                      onChange={(e) => updateVolume(index, { summary: e.target.value })}
                      rows={3}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>目标字数</Label>
                      <Input
                        type="number"
                        value={volume.wordCountTarget}
                        onChange={(e) => updateVolume(index, { wordCountTarget: parseInt(e.target.value) || 0 })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>章节数</Label>
                      <Input
                        type="number"
                        value={volume.chapterCount}
                        onChange={(e) => updateVolume(index, { chapterCount: parseInt(e.target.value) || 0 })}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {outline.volumes.length === 0 && (
              <Card className="border-dashed border-2 border-gray-200">
                <CardContent className="py-8 text-center">
                  <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 mb-4">还没有添加任何卷</p>
                  <div className="flex items-center justify-center gap-2">
                    <Button variant="outline" onClick={addVolume}>
                      <Plus className="w-4 h-4 mr-2" />
                      手动添加
                    </Button>
                    <Button variant="outline" onClick={openGenerateConfig}>
                      <Sparkles className="w-4 h-4 mr-2" />
                      AI 生成
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      ) : (
        <Card className="text-center py-16">
          <CardContent>
            <Sparkles className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              开始生成大纲
            </h3>
            <p className="text-gray-500 mb-6">
              点击&quot;AI 生成大纲&quot;按钮，配置卷数和每卷目标后自动生成故事大纲
            </p>
            <Button onClick={openGenerateConfig} disabled={generating}>
              <Sparkles className="w-4 h-4 mr-2" />
              {generating ? "生成中..." : "AI 生成大纲"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* 生成配置对话框 */}
      <Dialog open={showGenerateConfigDialog} onOpenChange={setShowGenerateConfigDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>配置大纲生成参数</DialogTitle>
            <DialogDescription>
              设置卷数和每卷的目标字数、章节数，AI 将基于此配置生成大纲
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            {/* 总卷数 */}
            <div className="space-y-2">
              <Label>总卷数</Label>
              <div className="flex items-center gap-4">
                <Input
                  type="number"
                  min={1}
                  max={10}
                  value={volumeCount}
                  onChange={(e) => updateVolumeCount(parseInt(e.target.value) || 1)}
                  className="w-24"
                />
                <span className="text-sm text-gray-500">
                  建议 1-5 卷，最多 10 卷
                </span>
              </div>
            </div>

            {/* 每卷配置 */}
            <div className="space-y-4">
              <Label className="text-base font-semibold">各卷配置</Label>
              {volumeConfigs.map((config, index) => (
                <Card key={index} className="bg-gray-50">
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium">第 {index + 1} 卷</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <Label className="text-xs text-gray-500">目标字数</Label>
                        <Input
                          type="number"
                          min={1000}
                          step={1000}
                          value={config.wordCountTarget}
                          onChange={(e) => updateVolumeConfig(index, { 
                            wordCountTarget: parseInt(e.target.value) || 0 
                          })}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-gray-500">章节数</Label>
                        <Input
                          type="number"
                          min={1}
                          value={config.chapterCount}
                          onChange={(e) => updateVolumeConfig(index, { 
                            chapterCount: parseInt(e.target.value) || 0 
                          })}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* 统计信息 */}
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>总计：</strong>
                {volumeConfigs.reduce((sum, c) => sum + c.wordCountTarget, 0).toLocaleString()} 字，
                {volumeConfigs.reduce((sum, c) => sum + c.chapterCount, 0)} 章
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowGenerateConfigDialog(false)}>
              取消
            </Button>
            <Button 
              onClick={generateOutline}
              disabled={generating}
            >
              <Sparkles className="w-4 h-4 mr-2" />
              {generating ? "生成中..." : "开始生成"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 重新配置确认对话框 */}
      <Dialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-500" />
              确认重新配置
            </DialogTitle>
            <DialogDescription>
              重新配置将基于小说预设重新生成大纲，并<span className="text-red-500 font-semibold">清空所有已生成的章节大纲和小节列表</span>。此操作不可恢复，是否继续？
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowResetDialog(false)}>
              取消
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleResetAndReconfigure}
              disabled={resetting}
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              {resetting ? "重新配置中..." : "确认重新配置"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除卷确认对话框 */}
      <Dialog open={showDeleteVolumeDialog} onOpenChange={setShowDeleteVolumeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-500" />
              确认删除卷
            </DialogTitle>
            <DialogDescription>
              确定要删除第 {deletingVolumeIndex !== null ? deletingVolumeIndex + 1 : ""} 卷吗？此操作不可恢复。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowDeleteVolumeDialog(false)}>
              取消
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => deletingVolumeIndex !== null && deleteVolume(deletingVolumeIndex)}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              确认删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
