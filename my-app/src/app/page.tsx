"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, BookOpen, Clock, ChevronRight, Trash2, ArrowRight, FileInput, AlertTriangle, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import type { NovelProject } from "@/types/novel";

const stageLabels: Record<string, string> = {
  bible_meta: "基本信息",
  bible_characters: "人物设定",
  bible_factions: "势力设定",
  bible_instances: "地点设定",
  bible_climaxes: "高潮场景",
  outline: "大纲规划",
  chapter_outlines: "章节大纲",
  section_lists: "小节列表",
  writing: "正文写作",
  completed: "已完成",
  // 续写阶段
  continuation_input: "导入作品",
  continuation_analysis: "AI分析",
  continuation_bible: "同步设定",
  continuation_outline: "续写大纲",
  continuation_chapters: "章节规划",
  continuation_writing: "续写正文",
};

const projectTypeLabels: Record<string, string> = {
  original: "原创",
  continuation: "续写",
};

const stageColors: Record<string, string> = {
  bible_meta: "bg-blue-100 text-blue-800",
  bible_characters: "bg-purple-100 text-purple-800",
  bible_factions: "bg-indigo-100 text-indigo-800",
  bible_instances: "bg-teal-100 text-teal-800",
  bible_climaxes: "bg-orange-100 text-orange-800",
  outline: "bg-green-100 text-green-800",
  chapter_outlines: "bg-yellow-100 text-yellow-800",
  section_lists: "bg-pink-100 text-pink-800",
  writing: "bg-red-100 text-red-800",
  completed: "bg-gray-100 text-gray-800",
};

export default function HomePage() {
  const router = useRouter();
  const [projects, setProjects] = useState<NovelProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newProjectType, setNewProjectType] = useState<"original" | "continuation">("original");
  const [newProjectTitle, setNewProjectTitle] = useState("");
  const [originalTitle, setOriginalTitle] = useState("");
  const [creating, setCreating] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<NovelProject | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [continueDialogOpen, setContinueDialogOpen] = useState(false);
  const [projectToContinue, setProjectToContinue] = useState<NovelProject | null>(null);
  const [continuing, setContinuing] = useState(false);
  
  // API 配置检查
  const [apiConfig, setApiConfig] = useState<{
    checked: boolean;
    hasApiKey: boolean;
    hasBaseUrl: boolean;
    showWarning: boolean;
  }>({
    checked: false,
    hasApiKey: false,
    hasBaseUrl: false,
    showWarning: false,
  });

  // 加载项目列表和检查 API 配置
  useEffect(() => {
    loadProjects();
    checkApiConfig();
  }, []);

  // 检查 API 配置
  async function checkApiConfig() {
    try {
      const response = await fetch("/api/settings/env");
      const result = await response.json();
      if (result.success) {
        const { apiKey, baseUrl } = result.data;
        const hasApiKey = !!apiKey && apiKey.trim() !== "" && !apiKey.startsWith("sk-");
        const hasBaseUrl = !!baseUrl && baseUrl.trim() !== "";
        // 如果配置了 API Key（且不是默认值），则认为配置正确
        // Anthropic API Key 以 sk-ant- 开头，OpenAI 以 sk- 开头
        const isConfigured = apiKey && (
          apiKey.startsWith("sk-") || apiKey.length > 10
        );
        setApiConfig({
          checked: true,
          hasApiKey: !!isConfigured,
          hasBaseUrl: hasBaseUrl,
          showWarning: !isConfigured,
        });
      }
    } catch (error) {
      console.error("Failed to check API config:", error);
      setApiConfig({
        checked: true,
        hasApiKey: false,
        hasBaseUrl: false,
        showWarning: true,
      });
    }
  }

  async function loadProjects() {
    try {
      const response = await fetch("/api/projects");
      const result = await response.json();
      if (result.success) {
        setProjects(result.data);
      }
    } catch (error) {
      console.error("Failed to load projects:", error);
    } finally {
      setLoading(false);
    }
  }

  // 创建新项目
  async function handleCreateProject() {
    if (!newProjectTitle.trim()) return;
    
    // 续写项目需要原作标题
    if (newProjectType === "continuation" && !originalTitle.trim()) {
      alert("请输入原作标题");
      return;
    }

    setCreating(true);
    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          title: newProjectTitle,
          projectType: newProjectType,
          originalTitle: newProjectType === "continuation" ? originalTitle : undefined,
        }),
      });
      const result = await response.json();
      if (result.success) {
        router.push(`/projects/${result.data.id}`);
      }
    } catch (error) {
      console.error("Failed to create project:", error);
    } finally {
      setCreating(false);
      setCreateDialogOpen(false);
      // 重置表单
      setNewProjectTitle("");
      setOriginalTitle("");
    }
  }

  // 格式化日期
  function formatDate(dateString: string) {
    const date = new Date(dateString);
    return date.toLocaleDateString("zh-CN", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  // 删除项目
  async function handleDeleteProject() {
    if (!projectToDelete) return;
    
    setDeleting(true);
    try {
      const response = await fetch(`/api/projects/${projectToDelete.id}/delete`, {
        method: "POST",
      });
      const result = await response.json();
      if (result.success) {
        await loadProjects();
        setDeleteDialogOpen(false);
        setProjectToDelete(null);
      } else {
        alert(result.error || "删除失败");
      }
    } catch (error) {
      console.error("Failed to delete project:", error);
      alert("删除项目失败");
    } finally {
      setDeleting(false);
    }
  }

  // 开始续写
  async function handleStartContinuation() {
    if (!projectToContinue) return;
    
    setContinuing(true);
    try {
      // 更新项目为续写模式
      const response = await fetch(`/api/projects/${projectToContinue.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentStage: "continuation_input",
          continuation: {
            ...projectToContinue.continuation,
            isActive: true,
            continuationNumber: (projectToContinue.continuation?.continuationNumber || 0) + 1,
          },
        }),
      });
      const result = await response.json();
      if (result.success) {
        router.push(`/projects/${projectToContinue.id}`);
      } else {
        alert(result.error || "启动续写失败");
      }
    } catch (error) {
      console.error("Failed to start continuation:", error);
      alert("启动续写失败");
    } finally {
      setContinuing(false);
      setContinueDialogOpen(false);
      setProjectToContinue(null);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 顶部导航 */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-blue-600" />
            <h1 className="text-xl font-bold">小说 AI Agent</h1>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => {
                setNewProjectType("continuation");
                setCreateDialogOpen(true);
              }}
            >
              <FileInput className="w-4 h-4 mr-2" />
              导入续写
            </Button>
            <Button onClick={() => {
              setNewProjectType("original");
              setCreateDialogOpen(true);
            }}>
              <Plus className="w-4 h-4 mr-2" />
              新建项目
            </Button>
          </div>
        </div>
      </header>

      {/* API 配置警告横幅 */}
      {apiConfig.showWarning && (
        <div className="bg-amber-50 border-b border-amber-200">
          <div className="max-w-6xl mx-auto px-4 py-3">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-amber-900">
                  API 配置未完成
                </p>
                <p className="text-sm text-amber-700 mt-1">
                  检测到 API Key 未配置或配置不正确。AI 生成功能将无法使用。
                  请先在 <code className="bg-amber-100 px-1.5 py-0.5 rounded text-amber-800 font-mono text-xs">my-app/.env.local</code> 文件中配置 API Key 和 Base URL。
                </p>
                <div className="mt-2 flex items-center gap-4 text-xs text-amber-600">
                  <span className="flex items-center gap-1">
                    <span className={`w-2 h-2 rounded-full ${apiConfig.hasApiKey ? "bg-green-500" : "bg-red-500"}`} />
                    API Key: {apiConfig.hasApiKey ? "已配置" : "未配置"}
                  </span>
                  <span className="flex items-center gap-1">
                    <span className={`w-2 h-2 rounded-full ${apiConfig.hasBaseUrl ? "bg-green-500" : "bg-amber-400"}`} />
                    Base URL: {apiConfig.hasBaseUrl ? "已配置" : "使用默认值"}
                  </span>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="flex-shrink-0 border-amber-300 text-amber-700 hover:bg-amber-100 hover:text-amber-800"
                onClick={() => {
                  // 打开配置说明或刷新检查
                  checkApiConfig();
                }}
              >
                <Settings className="w-4 h-4 mr-1" />
                检查配置
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 主内容区 */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-2">我的小说项目</h2>
          <p className="text-gray-600">
            使用 AI 辅助创作，从世界观构建到正文写作，全流程支持
          </p>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-gray-500">加载中...</p>
          </div>
        ) : projects.length === 0 ? (
          <Card className="text-center py-16">
            <CardContent>
              <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                还没有小说项目
              </h3>
              <p className="text-gray-500 mb-6">
                点击右上角的"新建项目"开始你的创作之旅
              </p>
              <Button onClick={() => setCreateDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                创建第一个项目
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => (
              <Card
                key={project.id}
                className="hover:shadow-lg transition-shadow group relative"
              >
                <div onClick={() => router.push(`/projects/${project.id}`)} className="cursor-pointer">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex gap-2">
                        <Badge className={stageColors[project.currentStage] || "bg-gray-100 text-gray-800"}>
                          {stageLabels[project.currentStage] || project.currentStage}
                        </Badge>
                        {/* 项目类型标签 */}
                        <Badge 
                          variant="outline" 
                          className={project.projectType === "continuation" 
                            ? "border-purple-300 text-purple-700" 
                            : "border-blue-300 text-blue-700"
                          }
                        >
                          {projectTypeLabels[project.projectType] || "原创"}
                        </Badge>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-gray-500 transition-colors" />
                    </div>
                    <CardTitle className="text-lg line-clamp-1">
                      {project.title}
                    </CardTitle>
                    <CardDescription className="line-clamp-2">
                      {project.projectType === "continuation" && project.sourceMaterial ? (
                        <span className="text-purple-600">
                          续写《{project.sourceMaterial.originalTitle}》
                        </span>
                      ) : (
                        project.bible.meta.synopsis || "暂无简介"
                      )}
                    </CardDescription>
                  </CardHeader>
                </div>
                <CardContent>
                  <Separator className="mb-4" />
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1 text-sm text-gray-500">
                      <Clock className="w-4 h-4" />
                      <span>{formatDate(project.updatedAt)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {/* 续写按钮 - 已完成项目或正在进行续写的项目显示 */}
                      {(project.currentStage === "completed" || project.projectType === "continuation") && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (project.projectType === "continuation") {
                              // 续写项目直接进入
                              router.push(`/projects/${project.id}`);
                            } else {
                              // 原创项目需要确认
                              setProjectToContinue(project);
                              setContinueDialogOpen(true);
                            }
                          }}
                        >
                          <ArrowRight className="w-3 h-3 mr-1" />
                          {project.projectType === "continuation" ? "继续" : "续写"}
                        </Button>
                      )}
                      {/* 删除按钮 */}
                      <button
                        className="p-1.5 rounded text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          setProjectToDelete(project);
                          setDeleteDialogOpen(true);
                        }}
                        title="删除项目"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  {/* 源作品信息（续写项目） */}
                  {project.projectType === "continuation" && project.sourceMaterial && (
                    <div className="mt-2 text-xs text-purple-600">
                      导入 {project.sourceMaterial.inputFiles.length} 个文件
                      {project.continuation?.analysisResult && " · 已分析"}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* 创建项目对话框 */}
      <Dialog open={createDialogOpen} onOpenChange={(open) => {
        setCreateDialogOpen(open);
        if (!open) {
          // 关闭时重置表单
          setNewProjectTitle("");
          setOriginalTitle("");
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {newProjectType === "continuation" ? "导入续写项目" : "新建小说项目"}
            </DialogTitle>
            <DialogDescription>
              {newProjectType === "continuation" 
                ? "导入已有小说文件，AI 将分析内容并帮助续写新篇章" 
                : "创建全新小说项目，从世界观构建开始"}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            {/* 项目类型切换 */}
            <div className="flex gap-2">
              <Button
                type="button"
                variant={newProjectType === "original" ? "default" : "outline"}
                className="flex-1"
                onClick={() => setNewProjectType("original")}
              >
                <Plus className="w-4 h-4 mr-2" />
                原创
              </Button>
              <Button
                type="button"
                variant={newProjectType === "continuation" ? "default" : "outline"}
                className="flex-1"
                onClick={() => setNewProjectType("continuation")}
              >
                <FileInput className="w-4 h-4 mr-2" />
                续写
              </Button>
            </div>
            
            {/* 新项目标题 */}
            <div>
              <Label htmlFor="title">
                {newProjectType === "continuation" ? "续写作品名称" : "小说标题"}
              </Label>
              <Input
                id="title"
                placeholder={newProjectType === "continuation" ? "例如：斗破苍穹之第二部" : "例如：斗破苍穹"}
                value={newProjectTitle}
                onChange={(e) => setNewProjectTitle(e.target.value)}
                className="mt-2"
              />
            </div>
            
            {/* 续写项目：原作标题 */}
            {newProjectType === "continuation" && (
              <div>
                <Label htmlFor="originalTitle">原作标题</Label>
                <Input
                  id="originalTitle"
                  placeholder="例如：斗破苍穹"
                  value={originalTitle}
                  onChange={(e) => setOriginalTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !creating) {
                      handleCreateProject();
                    }
                  }}
                  className="mt-2"
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCreateDialogOpen(false)}
              disabled={creating}
            >
              取消
            </Button>
            <Button
              onClick={handleCreateProject}
              disabled={!newProjectTitle.trim() || (newProjectType === "continuation" && !originalTitle.trim()) || creating}
            >
              {creating ? "创建中..." : (newProjectType === "continuation" ? "创建并导入" : "创建")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除项目对话框 */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>删除项目</DialogTitle>
            <DialogDescription>
              确定要删除项目《{projectToDelete?.title}》吗？
              <br />
              <span className="text-red-500 font-medium">
                此操作将删除项目的所有数据，但导出的文件会保留。
              </span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false);
                setProjectToDelete(null);
              }}
              disabled={deleting}
            >
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteProject}
              disabled={deleting}
            >
              {deleting ? "删除中..." : "确认删除"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 续写项目对话框 */}
      <Dialog open={continueDialogOpen} onOpenChange={setContinueDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>开始续写</DialogTitle>
            <DialogDescription>
              为《{projectToContinue?.title}》创建续写内容
              <br />
              <span className="text-blue-600">
                续写流程将引导你导入已发表内容并生成后续章节。
              </span>
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-3">
            <div className="text-sm text-gray-600">
              <p className="font-medium mb-2">续写流程包括：</p>
              <ul className="list-disc list-inside space-y-1 text-gray-500">
                <li>导入前作文件（txt/md）</li>
                <li>AI分析已有内容</li>
                <li>同步/更新角色设定</li>
                <li>生成续写大纲和章节</li>
                <li>继续创作新内容</li>
              </ul>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setContinueDialogOpen(false);
                setProjectToContinue(null);
              }}
              disabled={continuing}
            >
              取消
            </Button>
            <Button
              onClick={handleStartContinuation}
              disabled={continuing}
            >
              {continuing ? "启动中..." : "开始续写"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
