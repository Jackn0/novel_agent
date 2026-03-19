"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Upload, 
  FileText, 
  Headphones, 
  ChevronRight,
  Loader2,
  CheckCircle2,
  BookOpen,
  Volume2
} from "lucide-react";
import { useDropzone } from "react-dropzone";
import type { AudiobookSegment, AudiobookSource } from "@/types/novel";

interface ParseResult {
  source: AudiobookSource;
  segments: AudiobookSegment[];
  stats: {
    totalVolumes: number;
    totalChapters: number;
    totalSegments: number;
    totalChars: number;
  };
}

export default function NewAudiobookPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [parsing, setParsing] = useState(false);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 文件上传
  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      setFile(file);
      // 自动提取文件名作为标题（去掉扩展名）
      const fileName = file.name.replace(/\.[^/.]+$/, "");
      if (!title) {
        setTitle(fileName);
      }
      setError(null);
    }
  }, [title]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/markdown': ['.md'],
      'text/plain': ['.txt'],
    },
    maxFiles: 1,
  });

  // 解析文件
  const parseFile = async () => {
    if (!file) return;
    
    setParsing(true);
    setError(null);
    
    try {
      const formData = new FormData();
      formData.append("file", file);
      
      const response = await fetch("/api/audiobook/parse", {
        method: "POST",
        body: formData,
      });
      
      const result = await response.json();
      if (result.success) {
        setParseResult(result.data);
        setStep(2);
      } else {
        throw new Error(result.error);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "解析失败");
    } finally {
      setParsing(false);
    }
  };

  // 创建项目
  const createProject = async () => {
    if (!parseResult || !title) return;
    
    setCreating(true);
    setError(null);
    
    try {
      const response = await fetch("/api/audiobook/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          source: parseResult.source,
          segments: parseResult.segments,
        }),
      });
      
      const result = await response.json();
      if (result.success) {
        setStep(3);
        // 延迟跳转到项目页面
        setTimeout(() => {
          router.push(`/audiobook/${result.data.projectId}`);
        }, 1500);
      } else {
        throw new Error(result.error);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "创建失败");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 顶部导航 */}
      <header className="bg-white border-b">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => router.push("/")}>
              ← 返回
            </Button>
            <h1 className="text-xl font-bold">新建有声小说</h1>
          </div>
        </div>
      </header>

      {/* 进度指示器 */}
      <div className="bg-white border-b">
        <div className="max-w-3xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                step >= 1 ? "bg-blue-600 text-white" : "bg-gray-200"
              }`}>
                <Upload className="w-4 h-4" />
              </div>
              <span className={`text-sm ${step >= 1 ? "text-blue-600 font-medium" : "text-gray-500"}`}>
                上传文件
              </span>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-400" />
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                step >= 2 ? "bg-blue-600 text-white" : "bg-gray-200"
              }`}>
                <FileText className="w-4 h-4" />
              </div>
              <span className={`text-sm ${step >= 2 ? "text-blue-600 font-medium" : "text-gray-500"}`}>
                确认分割
              </span>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-400" />
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                step >= 3 ? "bg-green-600 text-white" : "bg-gray-200"
              }`}>
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <span className={`text-sm ${step >= 3 ? "text-green-600 font-medium" : "text-gray-500"}`}>
                完成
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 主内容 */}
      <main className="max-w-3xl mx-auto px-4 py-8">
        {error && (
          <Card className="mb-6 border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <p className="text-red-600">{error}</p>
            </CardContent>
          </Card>
        )}

        {/* 步骤 1: 上传文件 */}
        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="w-5 h-5" />
                上传小说文件
              </CardTitle>
              <CardDescription>
                支持 .md 或 .txt 格式，文件会被自动解析并按卷、章、小节分割
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* 文件上传区 */}
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                  isDragActive ? "border-blue-500 bg-blue-50" : "border-gray-300 hover:border-gray-400"
                }`}
              >
                <input {...getInputProps()} />
                {file ? (
                  <div className="flex items-center justify-center gap-3">
                    <FileText className="w-8 h-8 text-blue-500" />
                    <div className="text-left">
                      <p className="font-medium">{file.name}</p>
                      <p className="text-sm text-gray-500">
                        {(file.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                  </div>
                ) : (
                  <div>
                    <Upload className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-600">
                      {isDragActive ? "松开以上传文件" : "拖放文件到此处，或点击选择"}
                    </p>
                    <p className="text-sm text-gray-400 mt-1">
                      支持 .md、.txt 格式
                    </p>
                  </div>
                )}
              </div>

              {/* 项目名称 */}
              <div>
                <Label htmlFor="title">有声小说名称</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="输入有声小说名称"
                  className="mt-1"
                />
              </div>

              {/* 操作按钮 */}
              <div className="flex justify-end">
                <Button
                  onClick={parseFile}
                  disabled={!file || !title || parsing}
                  className="w-full sm:w-auto"
                >
                  {parsing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      解析中...
                    </>
                  ) : (
                    <>
                      下一步：解析文件
                      <ChevronRight className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 步骤 2: 确认分割结果 */}
        {step === 2 && parseResult && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                解析结果确认
              </CardTitle>
              <CardDescription>
                AI 已自动识别文件结构，请确认分割结果
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* 统计信息 */}
              <div className="grid grid-cols-4 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg text-center">
                  <BookOpen className="w-6 h-6 text-blue-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-blue-600">
                    {parseResult.stats.totalVolumes}
                  </p>
                  <p className="text-xs text-blue-500">卷</p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg text-center">
                  <FileText className="w-6 h-6 text-green-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-green-600">
                    {parseResult.stats.totalChapters}
                  </p>
                  <p className="text-xs text-green-500">章</p>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg text-center">
                  <Headphones className="w-6 h-6 text-purple-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-purple-600">
                    {parseResult.stats.totalSegments}
                  </p>
                  <p className="text-xs text-purple-500">小节</p>
                </div>
                <div className="bg-orange-50 p-4 rounded-lg text-center">
                  <Volume2 className="w-6 h-6 text-orange-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-orange-600">
                    {(parseResult.stats.totalChars / 10000).toFixed(1)}万
                  </p>
                  <p className="text-xs text-orange-500">字符</p>
                </div>
              </div>

              {/* 结构预览 */}
              <div className="border rounded-lg p-4 max-h-[300px] overflow-y-auto">
                <h3 className="font-medium mb-3">结构预览</h3>
                <div className="space-y-2">
                  {/* 按卷分组显示 */}
                  {Array.from(
                    parseResult.segments.reduce((acc, seg) => {
                      if (!acc.has(seg.volumeNumber)) {
                        acc.set(seg.volumeNumber, { title: seg.volumeTitle, chapters: new Set() });
                      }
                      acc.get(seg.volumeNumber)!.chapters.add(seg.chapterNumber);
                      return acc;
                    }, new Map())
                  ).map(([volumeNum, data]: [number, { title: string; chapters: Set<number> }]) => (
                    <div key={volumeNum} className="text-sm">
                      <p className="font-medium text-gray-700">{data.title}</p>
                      <p className="text-gray-500 ml-4">
                        {data.chapters.size} 章
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* 操作按钮 */}
              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep(1)}>
                  上一步
                </Button>
                <Button
                  onClick={createProject}
                  disabled={creating}
                >
                  {creating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      创建中...
                    </>
                  ) : (
                    <>
                      创建有声小说项目
                      <ChevronRight className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 步骤 3: 完成 */}
        {step === 3 && (
          <Card className="border-green-200 bg-green-50">
            <CardContent className="pt-6 text-center">
              <CheckCircle2 className="w-16 h-16 text-green-600 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-green-800 mb-2">
                创建成功！
              </h2>
              <p className="text-green-600 mb-4">
                有声小说项目 "{title}" 已创建，即将跳转到项目页面...
              </p>
              <Progress value={100} className="w-full" />
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
