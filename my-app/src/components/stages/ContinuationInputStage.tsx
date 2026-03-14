"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, FileText, Trash2, ArrowRight, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

import type { NovelProject, NovelStage, InputFile } from "@/types/novel";

interface ContinuationInputStageProps {
  project: NovelProject;
  onUpdate: (updates: Partial<NovelProject>) => Promise<boolean>;
  onConfirm: (nextStage: NovelStage) => Promise<boolean>;
}

export default function ContinuationInputStage({
  project,
  onUpdate,
  onConfirm,
}: ContinuationInputStageProps) {
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [previewFile, setPreviewFile] = useState<InputFile | null>(null);
  
  const inputFiles = project.continuation?.inputFiles || [];

  // 文件上传处理
  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;
    
    setUploading(true);
    
    try {
      for (const file of acceptedFiles) {
        const formData = new FormData();
        formData.append("file", file);
        
        const response = await fetch(`/api/projects/${project.id}/input-files`, {
          method: "POST",
          body: formData,
        });
        
        const result = await response.json();
        if (!result.success) {
          alert(`上传 ${file.name} 失败: ${result.error}`);
        }
      }
      
      // 刷新项目数据
      window.location.reload();
    } catch (error) {
      console.error("Upload failed:", error);
      alert("上传失败");
    } finally {
      setUploading(false);
    }
  }, [project.id]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/plain': ['.txt'],
      'text/markdown': ['.md'],
    },
    multiple: true,
    disabled: uploading,
  });

  // 删除文件
  async function handleDelete(fileId: string) {
    if (!confirm("确定要删除这个文件吗？")) return;
    
    setDeleting(fileId);
    try {
      const response = await fetch(`/api/projects/${project.id}/input-files/${fileId}`, {
        method: "DELETE",
      });
      
      const result = await response.json();
      if (result.success) {
        // 刷新项目数据
        window.location.reload();
      } else {
        alert(result.error || "删除失败");
      }
    } catch (error) {
      console.error("Delete failed:", error);
      alert("删除失败");
    } finally {
      setDeleting(null);
    }
  }

  // 格式化文件大小
  function formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  }

  return (
    <div className="space-y-6">
      {/* 标题栏 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            {project.projectType === "continuation" 
              ? "导入续写 - 上传原作" 
              : "续写 - 导入前作"}
          </h1>
          <p className="text-gray-600 mt-1">
            {project.sourceMaterial?.originalTitle 
              ? `为《${project.sourceMaterial.originalTitle}》创建续写，上传原作文件供 AI 分析`
              : "上传已有小说文件（txt/md），AI 将分析内容并帮助续写新篇章"}
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => onConfirm("completed")}
        >
          返回
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 左侧：文件上传和列表 */}
        <div className="space-y-4">
          {/* 上传区域 */}
          <Card>
            <CardContent className="pt-6">
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                  isDragActive
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-300 hover:border-gray-400"
                } ${uploading ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                <input {...getInputProps()} />
                <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                {uploading ? (
                  <p className="text-gray-600">上传中...</p>
                ) : isDragActive ? (
                  <p className="text-blue-600">释放文件以上传</p>
                ) : (
                  <>
                    <p className="text-gray-600 mb-2">
                      拖拽文件到此处，或点击选择文件
                    </p>
                    <p className="text-sm text-gray-400">
                      支持 .txt 和 .md 格式，单个文件最大 10MB
                    </p>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* 文件列表 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">
                已上传文件 ({inputFiles.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {inputFiles.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <FileText className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                  <p>还没有上传文件</p>
                </div>
              ) : (
                <ScrollArea className="h-[300px]">
                  <div className="space-y-2">
                    {inputFiles.map((file) => (
                      <div
                        key={file.id}
                        className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                          previewFile?.id === file.id
                            ? "border-blue-500 bg-blue-50"
                            : "hover:bg-gray-50"
                        }`}
                        onClick={() => setPreviewFile(file)}
                      >
                        <div className="flex items-center gap-3">
                          <FileText className="w-8 h-8 text-blue-500" />
                          <div>
                            <p className="font-medium text-sm">{file.filename}</p>
                            <p className="text-xs text-gray-500">
                              {formatFileSize(file.size)} · {file.type.toUpperCase()}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(file.id);
                          }}
                          disabled={deleting === file.id}
                          className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </div>

        {/* 右侧：文件预览和操作 */}
        <div className="space-y-4">
          {/* 预览区域 */}
          <Card className="h-[400px]">
            <CardHeader>
              <CardTitle className="text-sm font-medium">
                文件预览
              </CardTitle>
            </CardHeader>
            <CardContent>
              {previewFile ? (
                <ScrollArea className="h-[320px]">
                  <div className="text-sm text-gray-700 whitespace-pre-wrap font-mono">
                    {previewFile.content}
                    {previewFile.content.length >= 50000 && (
                      <p className="text-gray-400 mt-4 text-center">
                        ... （内容已截断，完整内容已保存）
                      </p>
                    )}
                  </div>
                </ScrollArea>
              ) : (
                <div className="h-full flex items-center justify-center text-gray-400">
                  <p>点击左侧文件预览内容</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 提示和操作 */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
            <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-700">
              建议上传完整的前作内容，AI 将分析世界观、角色、伏笔等信息。
              <br />
              支持上传多个文件，会自动合并分析。
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              onClick={() => onConfirm("continuation_analysis")}
              disabled={inputFiles.length === 0}
              size="lg"
            >
              <ArrowRight className="w-4 h-4 mr-2" />
              下一步：AI 分析
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
