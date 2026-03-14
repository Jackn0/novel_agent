"use client";

import { useState, useEffect } from "react";
import { 
  ArrowLeft, 
  ArrowRight, 
  Sparkles, 
  BookOpen, 
  Plus,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Volume2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import type { NovelProject, NovelStage, NovelOutline, Volume } from "@/types/novel";
import { v4 as uuidv4 } from "uuid";

interface ContinuationOutlineStageProps {
  project: NovelProject;
  onUpdate: (updates: Partial<NovelProject>) => Promise<boolean>;
  onConfirm: (nextStage: NovelStage) => Promise<boolean>;
}

// 从环境变量获取模型配置
const SETTING_MODEL = process.env.SETTING_MODEL || "";

export default function ContinuationOutlineStage({
  project,
  onUpdate,
  onConfirm,
}: ContinuationOutlineStageProps) {
  const analysisResult = project.continuation?.analysisResult;
  
  // 本地状态
  const [volumes, setVolumes] = useState<Volume[]>(project.outline?.volumes || []);
  const [generating, setGenerating] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // 如果没有大纲，自动生成建议
  useEffect(() => {
    if (volumes.length === 0 && analysisResult && !generating) {
      // 不自动生成，让用户手动创建或点击生成
    }
  }, []);

  // AI 生成续写大纲建议
  async function generateOutlineSuggestion() {
    if (!analysisResult) {
      alert("请先完成 AI 分析");
      return;
    }

    setGenerating(true);
    try {
      const response = await fetch(`/api/projects/${project.id}/generate/outline`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          isContinuation: true,
          previousAnalysis: analysisResult,
          continuationContext: {
            unresolvedPlots: analysisResult.unresolvedPlots,
            characterDirections: analysisResult.characters.map(c => ({
              name: c.name,
              direction: c.arcDirection
            })),
          }
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        // 调整卷号，接在原作之后
        const startVolumeNumber = 1; // 续写从第1卷开始（新作品）
        const newVolumes = result.data.volumes.map((v: Volume, idx: number) => ({
          ...v,
          id: uuidv4(),
          number: startVolumeNumber + idx,
        }));
        setVolumes(newVolumes);
        setHasChanges(true);
      } else {
        alert(result.error || "生成大纲失败");
      }
    } catch (error) {
      console.error("Failed to generate outline:", error);
      alert("生成大纲失败");
    } finally {
      setGenerating(false);
    }
  }

  // 添加新卷
  function addVolume() {
    const newVolume: Volume = {
      id: uuidv4(),
      number: volumes.length + 1,
      title: "",
      coreEvent: "",
      summary: "",
      chapterCount: 10,
      wordCountTarget: 100000,
    };
    setVolumes([...volumes, newVolume]);
    setHasChanges(true);
  }

  // 更新卷
  function updateVolume(id: string, updates: Partial<Volume>) {
    setVolumes(vols => 
      vols.map(v => v.id === id ? { ...v, ...updates } : v)
    );
    setHasChanges(true);
  }

  // 删除卷
  function removeVolume(id: string) {
    setVolumes(vols => {
      const filtered = vols.filter(v => v.id !== id);
      // 重新编号
      return filtered.map((v, idx) => ({ ...v, number: idx + 1 }));
    });
    setHasChanges(true);
  }

  // 保存到项目
  async function saveToProject() {
    const outline: NovelOutline = {
      volumes,
      timeline: [], // 续写大纲暂时不需要时间线
      mainArc: "续写部分主线剧情",
      subplots: [],
    };
    
    const success = await onUpdate({ outline });
    if (success) {
      setHasChanges(false);
    }
    return success;
  }

  // 进入下一阶段
  async function handleNext() {
    if (volumes.length === 0) {
      alert("请至少创建一卷");
      return;
    }
    
    if (hasChanges) {
      const saved = await saveToProject();
      if (!saved) {
        alert("保存失败，请重试");
        return;
      }
    }
    await onConfirm("continuation_chapters");
  }

  // 检查是否所有卷都有标题
  const allVolumesHaveTitles = volumes.every(v => v.title.trim() !== "");

  if (!analysisResult) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">续写大纲</h1>
            <p className="text-gray-600 mt-1">请先完成 AI 分析</p>
          </div>
        </div>
        <Card className="p-8 text-center">
          <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">没有可用的分析结果</p>
          <Button 
            className="mt-4" 
            onClick={() => onConfirm("continuation_analysis")}
          >
            返回分析
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 标题栏 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">续写大纲</h1>
          <p className="text-gray-600 mt-1">
            规划续写部分的整体结构
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => onConfirm("continuation_bible")}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            返回
          </Button>
          <Button onClick={handleNext} disabled={!allVolumesHaveTitles}>
            <ArrowRight className="w-4 h-4 mr-2" />
            下一步
          </Button>
        </div>
      </div>

      {/* 提示信息 */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <BookOpen className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <p className="text-sm text-blue-800">
                基于前作分析，规划续写部分的卷结构。建议考虑：
              </p>
              <ul className="text-sm text-blue-700 mt-2 list-disc list-inside">
                <li>回收前作伏笔的时机</li>
                <li>角色的成长和变化方向</li>
                <li>新剧情线的展开节奏</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 操作栏 */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="font-medium">卷规划</h3>
          <p className="text-sm text-gray-500">
            共 {volumes.length} 卷
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={generateOutlineSuggestion}
            disabled={generating}
          >
            <Sparkles className="w-4 h-4 mr-2" />
            {generating ? "生成中..." : "AI 生成大纲建议"}
          </Button>
          <Button onClick={addVolume}>
            <Plus className="w-4 h-4 mr-2" />
            添加卷
          </Button>
        </div>
      </div>

      {/* 卷列表 */}
      <ScrollArea className="h-[500px]">
        <div className="space-y-4 pr-4">
          {volumes.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Volume2 className="w-12 h-12 mx-auto mb-2 text-gray-300" />
              <p>暂无卷规划</p>
              <div className="flex gap-2 justify-center mt-4">
                <Button
                  variant="outline"
                  onClick={generateOutlineSuggestion}
                  disabled={generating}
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  AI 生成建议
                </Button>
                <Button onClick={addVolume}>
                  <Plus className="w-4 h-4 mr-2" />
                  手动添加
                </Button>
              </div>
            </div>
          ) : (
            volumes.map((volume) => (
              <Card key={volume.id}>
                <CardContent className="p-4 space-y-4">
                  {/* 卷标题行 */}
                  <div className="flex gap-3 items-start">
                    <Badge variant="secondary" className="mt-2">
                      第 {volume.number} 卷
                    </Badge>
                    <div className="flex-1">
                      <Label className="text-xs text-gray-500">卷标题</Label>
                      <Input
                        value={volume.title}
                        onChange={(e) => updateVolume(volume.id, { title: e.target.value })}
                        placeholder="例如：新的征程"
                        className="mt-1"
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeVolume(volume.id)}
                      className="text-red-500"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>

                  {/* 核心事件 */}
                  <div>
                    <Label className="text-xs text-gray-500">核心事件</Label>
                    <Input
                      value={volume.coreEvent}
                      onChange={(e) => updateVolume(volume.id, { coreEvent: e.target.value })}
                      placeholder="本卷最核心的剧情事件"
                      className="mt-1"
                    />
                  </div>

                  {/* 卷简介 */}
                  <div>
                    <Label className="text-xs text-gray-500">卷简介</Label>
                    <Textarea
                      value={volume.summary}
                      onChange={(e) => updateVolume(volume.id, { summary: e.target.value })}
                      placeholder="本卷的整体剧情概述..."
                      rows={2}
                      className="mt-1 resize-none"
                    />
                  </div>

                  {/* 章节数和字数 */}
                  <div className="flex gap-4">
                    <div className="w-32">
                      <Label className="text-xs text-gray-500">章节数</Label>
                      <Input
                        type="number"
                        value={volume.chapterCount}
                        onChange={(e) => updateVolume(volume.id, { 
                          chapterCount: parseInt(e.target.value) || 10 
                        })}
                        className="mt-1"
                        min={1}
                        max={100}
                      />
                    </div>
                    <div className="flex-1">
                      <Label className="text-xs text-gray-500">目标字数</Label>
                      <Input
                        type="number"
                        value={volume.wordCountTarget}
                        onChange={(e) => updateVolume(volume.id, { 
                          wordCountTarget: parseInt(e.target.value) || 100000 
                        })}
                        className="mt-1"
                        step={10000}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </ScrollArea>

      {/* 底部操作栏 */}
      <div className="flex justify-between items-center pt-4 border-t">
        <div className="flex items-center gap-2">
          {hasChanges && (
            <Badge variant="secondary">有未保存的更改</Badge>
          )}
          {!allVolumesHaveTitles && volumes.length > 0 && (
            <Badge variant="destructive">请填写所有卷标题</Badge>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={saveToProject}
            disabled={!hasChanges}
          >
            <CheckCircle2 className="w-4 h-4 mr-2" />
            保存大纲
          </Button>
          <Button onClick={handleNext} disabled={!allVolumesHaveTitles}>
            <ArrowRight className="w-4 h-4 mr-2" />
            下一步：章节规划
          </Button>
        </div>
      </div>
    </div>
  );
}
