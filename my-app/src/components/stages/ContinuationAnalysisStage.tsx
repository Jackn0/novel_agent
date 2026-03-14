"use client";

import { useState, useEffect } from "react";
import { ArrowRight, ArrowLeft, Sparkles, BookOpen, Users, MapPin, AlertCircle, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { NovelProject, NovelStage } from "@/types/novel";

interface ContinuationAnalysisStageProps {
  project: NovelProject;
  onUpdate: (updates: Partial<NovelProject>) => Promise<boolean>;
  onConfirm: (nextStage: NovelStage) => Promise<boolean>;
}

export default function ContinuationAnalysisStage({
  project,
  onUpdate,
  onConfirm,
}: ContinuationAnalysisStageProps) {
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(project.continuation?.analysisResult);
  const [error, setError] = useState<string | null>(null);

  // 自动开始分析（如果没有分析结果）
  useEffect(() => {
    if (!analysisResult && !analyzing && !error) {
      performAnalysis();
    }
  }, []);

  async function performAnalysis() {
    setAnalyzing(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/projects/${project.id}/continue/analyze`, {
        method: "POST",
      });
      
      const result = await response.json();
      
      if (result.success) {
        setAnalysisResult(result.analysis);
        // 刷新项目数据
        await onUpdate({});
      } else {
        setError(result.error || "分析失败");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "分析过程中出错");
    } finally {
      setAnalyzing(false);
    }
  }

  // 分析中状态
  if (analyzing || (!analysisResult && !error)) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">AI 分析中...</h1>
            <p className="text-gray-600 mt-1">
              正在采用分层分析策略处理您的作品
            </p>
          </div>
        </div>

        <Card className="p-12 text-center">
          <div className="animate-spin w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-6" />
          <h3 className="text-xl font-medium mb-2">正在分析作品</h3>
          <p className="text-gray-500 mb-4">
            采用智能分章 + 逐章分析 + 汇总归纳的策略
          </p>
          <div className="text-sm text-gray-400 space-y-1">
            <p>✓ 识别章节结构</p>
            <p>✓ 提取角色信息</p>
            <p>✓ 分析剧情线索</p>
            <p>✓ 汇总世界观</p>
            <p>⟳ 生成续写建议...</p>
          </div>
        </Card>
      </div>
    );
  }

  // 错误状态
  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">分析失败</h1>
            <p className="text-gray-600 mt-1">
              AI 分析过程中遇到了问题
            </p>
          </div>
        </div>

        <Card className="p-8 border-red-200 bg-red-50">
          <div className="flex items-start gap-4">
            <AlertCircle className="w-8 h-8 text-red-500 flex-shrink-0" />
            <div>
              <h3 className="font-medium text-red-900 mb-2">分析失败</h3>
              <p className="text-red-700 mb-4">{error}</p>
              <Button onClick={performAnalysis}>
                <Sparkles className="w-4 h-4 mr-2" />
                重新分析
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  // 分析完成状态
  return (
    <div className="space-y-6">
      {/* 标题栏 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">AI 分析结果</h1>
          <p className="text-gray-600 mt-1">
            已分析 {analysisResult?.summaryAnalysis.totalChunks} 个章节，
            共 {analysisResult?.summaryAnalysis.totalWordCount.toLocaleString()} 字
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => onConfirm("continuation_input")}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            返回
          </Button>
          <Button onClick={() => onConfirm("continuation_bible")}>
            <ArrowRight className="w-4 h-4 mr-2" />
            下一步
          </Button>
        </div>
      </div>

      {/* 分析内容 */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">整体概览</TabsTrigger>
          <TabsTrigger value="characters">角色分析</TabsTrigger>
          <TabsTrigger value="chapters">章节详情</TabsTrigger>
          <TabsTrigger value="plots">剧情线索</TabsTrigger>
        </TabsList>

        {/* 整体概览 */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 世界观总结 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <BookOpen className="w-4 h-4" />
                  世界观
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">
                  {analysisResult?.worldSummary}
                </p>
                <div className="mt-4">
                  <p className="text-xs text-gray-400 mb-2">时空背景</p>
                  <p className="text-sm">{analysisResult?.summaryAnalysis.worldBuilding.setting}</p>
                </div>
              </CardContent>
            </Card>

            {/* 整体基调 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  作品基调
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Badge variant="secondary" className="mb-2">
                  {analysisResult?.tone}
                </Badge>
                <p className="text-sm text-gray-600 mt-2">
                  主题：{analysisResult?.themes.join("、")}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* 续写建议 */}
          <Card className="border-blue-200 bg-blue-50">
            <CardHeader>
              <CardTitle className="text-sm font-medium text-blue-900">
                AI 续写建议
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-blue-800">
                {analysisResult?.suggestedContinuation}
              </p>
            </CardContent>
          </Card>

          {/* 主线剧情 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">主线剧情</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">
                {analysisResult?.summaryAnalysis.mainPlot}
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 角色分析 */}
        <TabsContent value="characters" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {analysisResult?.characters.map((char) => (
              <Card key={char.name}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{char.name}</CardTitle>
                    <Badge variant={char.role === "protagonist" ? "default" : "secondary"}>
                      {char.role === "protagonist" ? "主角" : char.role === "antagonist" ? "反派" : "配角"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="text-sm text-gray-600">{char.description}</p>
                  <div className="text-xs text-gray-400">
                    <p>当前状态：{char.currentState || "未知"}</p>
                    <p>发展方向：{char.arcDirection || "待发展"}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* 角色成长线 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">角色成长轨迹</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {analysisResult?.summaryAnalysis.characterArcs.map((arc) => (
                  <div key={arc.characterName} className="flex items-center gap-4 text-sm">
                    <span className="font-medium w-24">{arc.characterName}</span>
                    <span className="text-gray-500">{arc.initialState}</span>
                    <span className="text-gray-300">→</span>
                    <span className="text-gray-500">{arc.finalState}</span>
                    <Badge variant="outline" className="text-xs">
                      {arc.arcType}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 章节详情 */}
        <TabsContent value="chapters" className="h-[500px]">
          <ScrollArea className="h-full">
            <div className="space-y-3 pr-4">
              {analysisResult?.chunkAnalysis.map((chunk) => (
                <Card key={chunk.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm">
                        第 {chunk.index + 1} 章
                        {chunk.title && ` · ${chunk.title}`}
                      </CardTitle>
                      <Badge variant="outline" className="text-xs">
                        {chunk.wordCount.toLocaleString()} 字
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <p className="text-gray-600">{chunk.summary}</p>
                    <div className="flex flex-wrap gap-1">
                      {chunk.characters.map((char) => (
                        <Badge key={char} variant="secondary" className="text-xs">
                          {char}
                        </Badge>
                      ))}
                    </div>
                    {chunk.foreshadowing.length > 0 && (
                      <div className="mt-2">
                        <p className="text-xs text-orange-600 mb-1">伏笔：</p>
                        <ul className="text-xs text-orange-600 list-disc list-inside">
                          {chunk.foreshadowing.map((f, i) => (
                            <li key={i}>{f}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* 剧情线索 */}
        <TabsContent value="plots" className="space-y-4">
          {/* 未回收伏笔 */}
          <Card className="border-orange-200">
            <CardHeader>
              <CardTitle className="text-sm font-medium text-orange-900 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                待回收伏笔 ({analysisResult?.unresolvedPlots.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {analysisResult?.unresolvedPlots.map((plot, i) => (
                  <li key={i} className="text-sm text-orange-800 flex items-start gap-2">
                    <span className="text-orange-400">•</span>
                    {plot}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* 剧情线索 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {analysisResult?.summaryAnalysis.plotThreads.map((thread) => (
              <Card key={thread.name}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm">{thread.name}</CardTitle>
                    <Badge 
                      variant={thread.status === "resolved" ? "default" : "secondary"}
                      className="text-xs"
                    >
                      {thread.status === "resolved" ? "已解决" : thread.status === "ongoing" ? "进行中" : "未解决"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600">{thread.description}</p>
                  <p className="text-xs text-gray-400 mt-2">
                    涉及章节：{thread.relatedChunks.map(i => i + 1).join(", ")}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* 关键地点 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                关键地点
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {analysisResult?.keyLocations.map((location) => (
                  <Badge key={location} variant="outline">
                    {location}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
