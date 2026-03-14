"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { 
  BookOpen, Users, Shield, MapPin, Zap, 
  FileText, List, PenTool, CheckCircle,
  ChevronLeft, Settings, X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { NovelProject, NovelStage, MemoryLevel } from "@/types/novel";

// 阶段定义
const stages: { id: NovelStage; label: string; icon: React.ReactNode; group: string }[] = [
  { id: "bible_meta", label: "基本信息", icon: <BookOpen className="w-4 h-4" />, group: "小说预设" },
  { id: "bible_characters", label: "人物设定", icon: <Users className="w-4 h-4" />, group: "小说预设" },
  { id: "bible_factions", label: "势力设定", icon: <Shield className="w-4 h-4" />, group: "小说预设" },
  { id: "bible_instances", label: "地点设定", icon: <MapPin className="w-4 h-4" />, group: "小说预设" },
  { id: "bible_climaxes", label: "高潮场景", icon: <Zap className="w-4 h-4" />, group: "小说预设" },
  { id: "outline", label: "大纲规划", icon: <FileText className="w-4 h-4" />, group: "大纲" },
  { id: "chapter_outlines", label: "章节大纲", icon: <List className="w-4 h-4" />, group: "章节" },
  { id: "section_lists", label: "小节列表", icon: <List className="w-4 h-4" />, group: "章节" },
  { id: "writing", label: "正文写作", icon: <PenTool className="w-4 h-4" />, group: "写作" },
  { id: "completed", label: "完成", icon: <CheckCircle className="w-4 h-4" />, group: "完成" },
  // 续写阶段
  { id: "continuation_input", label: "导入前作", icon: <FileText className="w-4 h-4" />, group: "续写" },
  { id: "continuation_analysis", label: "分析内容", icon: <Zap className="w-4 h-4" />, group: "续写" },
  { id: "continuation_bible", label: "同步设定", icon: <Settings className="w-4 h-4" />, group: "续写" },
  { id: "continuation_outline", label: "续写大纲", icon: <FileText className="w-4 h-4" />, group: "续写" },
  { id: "continuation_chapters", label: "续写章节", icon: <List className="w-4 h-4" />, group: "续写" },
  { id: "continuation_writing", label: "续写正文", icon: <PenTool className="w-4 h-4" />, group: "续写" },
];

// 动态导入阶段组件
import BibleStage from "@/components/stages/BibleStage";
import OutlineStage from "@/components/stages/OutlineStage";
import ChapterOutlineStage from "@/components/stages/ChapterOutlineStage";
import SectionListStage from "@/components/stages/SectionListStage";
import WritingStage from "@/components/stages/WritingStage";
import ContinuationInputStage from "@/components/stages/ContinuationInputStage";
import ContinuationAnalysisStage from "@/components/stages/ContinuationAnalysisStage";
import ContinuationBibleStage from "@/components/stages/ContinuationBibleStage";
import ContinuationOutlineStage from "@/components/stages/ContinuationOutlineStage";
import ContinuationChapterStage from "@/components/stages/ContinuationChapterStage";
import ContinuationWritingStage from "@/components/stages/ContinuationWritingStage";

export default function ProjectPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const [project, setProject] = useState<NovelProject | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 加载项目数据
  useEffect(() => {
    loadProject();
  }, [projectId]);

  async function loadProject() {
    try {
      setLoading(true);
      const response = await fetch(`/api/projects/${projectId}`);
      const result = await response.json();
      if (result.success) {
        setProject(result.data);
      } else {
        setError(result.error || "加载失败");
      }
    } catch (err) {
      setError("网络错误");
    } finally {
      setLoading(false);
    }
  }

  // 获取当前激活的阶段
  const currentStageIndex = stages.findIndex(s => s.id === project?.currentStage);
  
  // 阶段是否可访问（已完成或当前阶段）
  function isStageAccessible(stageIndex: number): boolean {
    if (!project) return false;
    return stageIndex <= currentStageIndex;
  }

  // 阶段是否已完成
  function isStageCompleted(stageIndex: number): boolean {
    if (!project) return false;
    return stageIndex < currentStageIndex;
  }

  // 切换阶段（仅用于浏览，实际需要通过确认操作推进）
  function handleStageClick(stageId: NovelStage, index: number) {
    // 阶段导航仅作为展示，实际内容根据项目 currentStage 显示
    // 这里可以添加浏览历史阶段的功能
  }

  // 确认阶段完成，进入下一阶段
  async function confirmStage(nextStage: NovelStage, data?: Record<string, unknown>) {
    try {
      const response = await fetch(`/api/projects/${projectId}/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nextStage, data }),
      });
      const result = await response.json();
      if (result.success) {
        setProject(result.data);
        return true;
      }
      return false;
    } catch (error) {
      console.error("Failed to confirm stage:", error);
      return false;
    }
  }

  // 更新项目数据
  async function updateProject(updates: Partial<NovelProject>) {
    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      const result = await response.json();
      if (result.success) {
        setProject(result.data);
        return true;
      }
      return false;
    } catch (error) {
      console.error("Failed to update project:", error);
      return false;
    }
  }

  // 设置对话框状态
  const [showSettings, setShowSettings] = useState(false);
  const [settingsForm, setSettingsForm] = useState({
    apiKey: "",
    baseUrl: "",
    settingModel: "",
    writingModel: "",
    maxTokens: 4096,
    memoryLevel: 3 as MemoryLevel,
  });
  
  // 重启确认对话框状态
  const [showRestartDialog, setShowRestartDialog] = useState(false);
  const [restartLoading, setRestartLoading] = useState(false);

  // 加载 .env.local 设置
  async function loadEnvSettings() {
    try {
      const response = await fetch("/api/settings/env");
      const result = await response.json();
      if (result.success) {
        setSettingsForm({
          apiKey: result.data.apiKey || "",
          baseUrl: result.data.baseUrl || "",
          settingModel: result.data.settingModel || "gpt-4-turbo",
          writingModel: result.data.writingModel || "gpt-4-turbo",
          maxTokens: result.data.maxTokens || 4096,
          memoryLevel: result.data.memoryLevel || 3,
        });
      }
    } catch (error) {
      console.error("Failed to load env settings:", error);
    }
  }

  // 打开设置对话框时初始化表单
  function openSettings() {
    loadEnvSettings();
    setShowSettings(true);
  }

  // 保存设置
  async function saveSettings() {
    try {
      // 保存到 .env.local
      const response = await fetch("/api/settings/env", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiKey: settingsForm.apiKey,
          baseUrl: settingsForm.baseUrl,
          settingModel: settingsForm.settingModel,
          writingModel: settingsForm.writingModel,
          maxTokens: settingsForm.maxTokens,
          memoryLevel: settingsForm.memoryLevel,
        }),
      });
      
      const result = await response.json();
      
      if (result.success) {
        setShowSettings(false);
        // 显示重启确认对话框
        setShowRestartDialog(true);
      } else {
        alert("保存失败: " + (result.error || "未知错误"));
      }
    } catch (error) {
      console.error("Failed to save settings:", error);
      alert("保存失败");
    }
  }

  // 渲染当前阶段的内容
  function renderStageContent() {
    if (!project) return null;

    switch (project.currentStage) {
      case "bible_meta":
      case "bible_characters":
      case "bible_factions":
      case "bible_instances":
      case "bible_climaxes":
        return (
          <BibleStage
            project={project}
            onUpdate={updateProject}
            onConfirm={confirmStage}
          />
        );
      case "outline":
        return (
          <OutlineStage
            project={project}
            onUpdate={updateProject}
            onConfirm={confirmStage}
          />
        );
      case "chapter_outlines":
        return (
          <ChapterOutlineStage
            project={project}
            onUpdate={updateProject}
            onConfirm={confirmStage}
          />
        );
      case "section_lists":
        return (
          <SectionListStage
            project={project}
            onUpdate={updateProject}
            onConfirm={confirmStage}
          />
        );
      case "writing":
      case "completed":
        return (
          <WritingStage
            project={project}
            onUpdate={updateProject}
            onConfirm={confirmStage}
          />
        );
      // 续写阶段
      case "continuation_input":
        return (
          <ContinuationInputStage
            project={project}
            onUpdate={updateProject}
            onConfirm={confirmStage}
          />
        );
      case "continuation_analysis":
        return (
          <ContinuationAnalysisStage
            project={project}
            onUpdate={updateProject}
            onConfirm={confirmStage}
          />
        );
      case "continuation_bible":
        return (
          <ContinuationBibleStage
            project={project}
            onUpdate={updateProject}
            onConfirm={confirmStage}
          />
        );
      case "continuation_outline":
        return (
          <ContinuationOutlineStage
            project={project}
            onUpdate={updateProject}
            onConfirm={confirmStage}
          />
        );
      case "continuation_chapters":
        return (
          <ContinuationChapterStage
            project={project}
            onUpdate={updateProject}
            onConfirm={confirmStage}
          />
        );
      case "continuation_writing":
        return (
          <ContinuationWritingStage
            project={project}
            onUpdate={updateProject}
            onConfirm={confirmStage}
          />
        );
      default:
        return <div>未知阶段</div>;
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-500">加载中...</p>
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error || "项目不存在"}</p>
          <Button onClick={() => router.push("/")}>返回首页</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* 左侧边栏 - 阶段导航 */}
      <aside className="w-64 bg-white border-r flex flex-col sticky top-0 h-screen">
        {/* 项目标题区 */}
        <div className="p-4 border-b">
          <Button
            variant="ghost"
            size="sm"
            className="mb-2 -ml-2"
            onClick={() => router.push("/")}
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            返回
          </Button>
          <h2 className="font-bold text-lg line-clamp-2" title={project.title}>
            {project.title}
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            {project.bible.meta.genre || "未设定题材"}
          </p>
        </div>

        {/* 阶段导航 */}
        <ScrollArea className="flex-1">
          <div className="p-2">
            {stages.map((stage, index) => {
              const isAccessible = isStageAccessible(index);
              const isCompleted = isStageCompleted(index);
              const isCurrent = project.currentStage === stage.id;

              return (
                <div key={stage.id}>
                  {/* 分组标题 */}
                  {(index === 0 || stages[index - 1].group !== stage.group) && (
                    <div className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider mt-2">
                      {stage.group}
                    </div>
                  )}
                  <button
                    onClick={() => handleStageClick(stage.id, index)}
                    disabled={!isAccessible}
                    className={`
                      w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors
                      ${isCurrent 
                        ? "bg-blue-50 text-blue-700 font-medium" 
                        : isCompleted
                        ? "text-gray-700 hover:bg-gray-50"
                        : "text-gray-400 cursor-not-allowed"
                      }
                    `}
                  >
                    <span className={isCompleted ? "text-green-500" : ""}>
                      {stage.icon}
                    </span>
                    <span className="flex-1 text-left">{stage.label}</span>
                    {isCompleted && (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    )}
                    {isCurrent && (
                      <Badge variant="secondary" className="text-xs">当前</Badge>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </ScrollArea>

        {/* 底部设置 */}
        <div className="p-4 border-t">
          <Button variant="ghost" size="sm" className="w-full justify-start" onClick={openSettings}>
            <Settings className="w-4 h-4 mr-2" />
            项目设置
          </Button>
        </div>
      </aside>

      {/* 设置对话框 */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>项目设置</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* API Key */}
            <div className="space-y-2">
              <Label htmlFor="apiKey">API Key</Label>
              <Input
                id="apiKey"
                type="password"
                placeholder="sk-..."
                value={settingsForm.apiKey}
                onChange={(e) => setSettingsForm({ ...settingsForm, apiKey: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                修改 API Key 需要重启服务才能生效
              </p>
            </div>

            {/* Base URL */}
            <div className="space-y-2">
              <Label htmlFor="baseUrl">API Base URL</Label>
              <Input
                id="baseUrl"
                placeholder="https://api.openai.com/v1"
                value={settingsForm.baseUrl}
                onChange={(e) => setSettingsForm({ ...settingsForm, baseUrl: e.target.value })}
              />
            </div>

            {/* 设定模型 */}
            <div className="space-y-2">
              <Label htmlFor="settingModel">设定模型</Label>
              <Input
                id="settingModel"
                placeholder="gpt-4-turbo"
                value={settingsForm.settingModel}
                onChange={(e) => setSettingsForm({ ...settingsForm, settingModel: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                用于生成大纲、人物、势力等设定类内容（如：gpt-4-turbo, claude-sonnet, deepseek-chat）
              </p>
            </div>

            {/* 写作模型 */}
            <div className="space-y-2">
              <Label htmlFor="writingModel">写作模型</Label>
              <Input
                id="writingModel"
                placeholder="gpt-4-turbo"
                value={settingsForm.writingModel}
                onChange={(e) => setSettingsForm({ ...settingsForm, writingModel: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                用于生成正文内容（如：gpt-4-turbo, claude-sonnet, deepseek-chat）
              </p>
            </div>

            {/* Max Tokens */}
            <div className="space-y-2">
              <Label htmlFor="maxTokens">Max Tokens</Label>
              <Input
                id="maxTokens"
                type="number"
                min={1000}
                step={1000}
                value={settingsForm.maxTokens}
                onChange={(e) => setSettingsForm({ ...settingsForm, maxTokens: parseInt(e.target.value) || 4096 })}
              />
              <p className="text-xs text-muted-foreground">
                生成内容的最大 Token 数（根据模型能力设置，如 4096, 8192, 32000 等）
              </p>
            </div>

            {/* 记忆等级 */}
            <div className="space-y-2">
              <Label htmlFor="memoryLevel">AI 记忆等级</Label>
              <Select
                value={String(settingsForm.memoryLevel)}
                onValueChange={(value) => setSettingsForm({ ...settingsForm, memoryLevel: parseInt(value || "3") as MemoryLevel })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择记忆等级" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 - 基础记忆（节省 Token）</SelectItem>
                  <SelectItem value="2">2 - 标准记忆</SelectItem>
                  <SelectItem value="3">3 - 增强记忆（推荐）</SelectItem>
                  <SelectItem value="4">4 - 完整记忆</SelectItem>
                  <SelectItem value="5">5 - 最强记忆</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                控制 AI 在创作时注入的上下文详细程度
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowSettings(false)}>
              取消
            </Button>
            <Button onClick={saveSettings}>
              保存设置
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 重启提示对话框 */}
      <Dialog open={showRestartDialog} onOpenChange={setShowRestartDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>需要手动重启服务</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <p className="text-sm text-muted-foreground">
              设置已保存到 <code className="bg-muted px-1 py-0.5 rounded">.env.local</code>。
              由于环境变量需要在服务重启后才能生效，请按以下步骤操作：
            </p>
            <div className="bg-amber-50 border border-amber-200 rounded-md p-4 text-sm text-amber-800 space-y-2">
              <p className="font-medium">📋 操作步骤</p>
              <ol className="list-decimal list-inside space-y-1 ml-1">
                <li>在命令行中按 <kbd className="bg-amber-100 px-1 rounded">Ctrl+C</kbd> 停止当前服务</li>
                <li>重新运行 <code className="bg-amber-100 px-1 rounded">npm run dev</code> 启动服务</li>
                <li>刷新浏览器页面</li>
              </ol>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-md p-3 text-sm text-blue-800">
              <p className="font-medium">💡 提示</p>
              <p>新的模型设置将在重启后生效。</p>
            </div>
          </div>
          <div className="flex justify-end">
            <Button 
              onClick={() => setShowRestartDialog(false)}
            >
              我知道了
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 主内容区 */}
      <main className="flex-1 overflow-auto">
        <div className="max-w-5xl mx-auto p-6">
          {renderStageContent()}
        </div>
      </main>
    </div>
  );
}
