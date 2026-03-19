"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
  Headphones, 
  Play, 
  Pause, 
  Download, 
  AlertCircle, 
  CheckCircle2,
  Loader2,
  ChevronDown,
  ChevronRight,
  Music,
  Wand2,
  Users
} from "lucide-react";
import type { NovelProject, Chapter, Section, AudioGenerationTask } from "@/types/novel";

interface AudioGenerationPanelProps {
  project: NovelProject;
}

interface SectionSelection {
  chapterId: string;
  sectionId: string;
  title: string;
  volumeNumber: number;
  chapterNumber: number;
  sectionNumber: number;
}

export default function AudioGenerationPanel({ project }: AudioGenerationPanelProps) {
  const [selectedSections, setSelectedSections] = useState<Set<string>>(new Set());
  const [expandedChapters, setExpandedChapters] = useState<Set<string>>(new Set());
  const [generating, setGenerating] = useState(false);
  const [currentTask, setCurrentTask] = useState<{ 
    sectionId: string; 
    progress: number; 
    status: string;
  } | null>(null);
  const [completedSections, setCompletedSections] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [audioPlayer, setAudioPlayer] = useState<{
    sectionId: string;
    url: string;
    playing: boolean;
  } | null>(null);
  const [tasks, setTasks] = useState<AudioGenerationTask[]>(project.audioTasks || []);
  const [discoveredChars, setDiscoveredChars] = useState<Array<{
    id: string;
    name: string;
    gender: "male" | "female" | "unknown";
    characterType: "protagonist" | "supporting" | "antagonist" | "neutral";
    isNew: boolean;
  }> | null>(null);
  const [autoConfiguring, setAutoConfiguring] = useState(false);

  // 同步 project.audioTasks 变化
  useEffect(() => {
    setTasks(project.audioTasks || []);
    // 从已完成的任务中初始化 completedSections
    const completed = new Set<string>();
    for (const task of project.audioTasks || []) {
      if (task.status === "completed" && task.mergedAudioUrl) {
        completed.add(task.sectionId);
      }
    }
    setCompletedSections(completed);
  }, [project.audioTasks]);

  // 构建可选列表
  const getAllSections = (): SectionSelection[] => {
    const sections: SectionSelection[] = [];
    for (const chapter of project.chapters || []) {
      if (chapter.sections) {
        for (const sec of chapter.sections) {
          if (sec.content) {
            sections.push({
              chapterId: chapter.id,
              sectionId: sec.id,
              title: sec.title || `小节 ${sec.sectionNumber}`,
              volumeNumber: chapter.volumeNumber || 1,
              chapterNumber: chapter.chapterNumber,
              sectionNumber: sec.sectionNumber,
            });
          }
        }
      }
    }
    return sections;
  };

  const allSections = getAllSections();

  // 按章节分组
  const getSectionsByChapter = (chapterId: string) => {
    return allSections.filter(s => s.chapterId === chapterId);
  };

  // 检查章节是否全部选中
  const isChapterFullySelected = (chapterId: string) => {
    const chapterSections = getSectionsByChapter(chapterId);
    return chapterSections.length > 0 && chapterSections.every(s => selectedSections.has(s.sectionId));
  };

  // 检查章节是否部分选中
  const isChapterPartiallySelected = (chapterId: string) => {
    const chapterSections = getSectionsByChapter(chapterId);
    const selectedCount = chapterSections.filter(s => selectedSections.has(s.sectionId)).length;
    return selectedCount > 0 && selectedCount < chapterSections.length;
  };

  // 切换章节展开
  const toggleChapter = (chapterId: string) => {
    const next = new Set(expandedChapters);
    if (next.has(chapterId)) {
      next.delete(chapterId);
    } else {
      next.add(chapterId);
    }
    setExpandedChapters(next);
  };

  // 选择/取消选择章节下所有小节
  const toggleChapterSelection = (chapterId: string) => {
    const chapterSections = getSectionsByChapter(chapterId);
    const allSelected = isChapterFullySelected(chapterId);
    const next = new Set(selectedSections);
    
    for (const sec of chapterSections) {
      if (allSelected) {
        next.delete(sec.sectionId);
      } else {
        next.add(sec.sectionId);
      }
    }
    setSelectedSections(next);
  };

  // 选择/取消选择单个小节
  const toggleSection = (sectionId: string) => {
    const next = new Set(selectedSections);
    if (next.has(sectionId)) {
      next.delete(sectionId);
    } else {
      next.add(sectionId);
    }
    setSelectedSections(next);
  };

  // 生成音频
  const generateAudio = async () => {
    if (selectedSections.size === 0) return;
    
    setGenerating(true);
    setError(null);
    const sectionIds = Array.from(selectedSections);
    const completed = new Set<string>();

    try {
      for (let i = 0; i < sectionIds.length; i++) {
        const sectionId = sectionIds[i];
        const section = allSections.find(s => s.sectionId === sectionId);
        if (!section) continue;

        setCurrentTask({
          sectionId,
          progress: 0,
          status: `正在解析文本: ${section.title}`,
        });

        // 1. 解析文本
        const parseResponse = await fetch(`/api/projects/${project.id}/generate/audio-text-parse`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sectionId, chapterId: section.chapterId }),
        });
        const parseResult = await parseResponse.json();
        console.log("Parse result:", parseResult);
        
        if (!parseResult.success) {
          const errorMsg = parseResult.error || "未知错误";
          throw new Error(`文本解析失败: ${errorMsg}`);
        }
        
        if (!parseResult.data || !Array.isArray(parseResult.data) || parseResult.data.length === 0) {
          throw new Error("文本解析结果为空");
        }

        // 保存发现的角色（用于一键配置）
        if (parseResult.discoveredCharacters && parseResult.discoveredCharacters.length > 0) {
          const newChars = parseResult.discoveredCharacters.filter((c: { isNew: boolean }) => c.isNew);
          if (newChars.length > 0) {
            setDiscoveredChars(newChars);
          }
        }

        setCurrentTask({
          sectionId,
          progress: 30,
          status: `正在生成音频: ${section.title}`,
        });

        // 2. 生成音频片段
        const audioResponse = await fetch(`/api/projects/${project.id}/generate/audio`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sectionId,
            segments: parseResult.data,
          }),
        });
        const audioResult = await audioResponse.json();
        console.log("Audio generation result:", audioResult);

        if (!audioResult.success) {
          const errorMsg = audioResult.error || "未知错误";
          throw new Error(`音频生成失败: ${errorMsg}`);
        }

        if (!audioResult.data || !Array.isArray(audioResult.data)) {
          throw new Error("音频生成返回数据格式错误");
        }

        // 检查是否有失败的片段
        const failedSegments = audioResult.data.filter((r: { success: boolean }) => !r.success);
        if (failedSegments.length > 0) {
          console.error("Failed segments:", failedSegments);
          const firstError = failedSegments[0]?.error || "未知错误";
          throw new Error(`部分音频片段生成失败: ${firstError}`);
        }

        setCurrentTask({
          sectionId,
          progress: 70,
          status: `正在合并音频: ${section.title}`,
        });

        // 提取成功的音频文件路径
        const segmentAudioFiles = audioResult.data
          .filter((r: { success: boolean }) => r.success)
          .map((r: { audioUrl: string }) => r.audioUrl);

        if (segmentAudioFiles.length === 0) {
          throw new Error("没有成功生成任何音频片段");
        }

        // 3. 合并音频
        console.log("Merging audio files:", segmentAudioFiles);
        const mergeResponse = await fetch(`/api/projects/${project.id}/generate/audio-merge`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sectionId,
            chapterId: section.chapterId,
            segmentAudioFiles,
          }),
        });
        const mergeResult = await mergeResponse.json();
        console.log("Merge result:", mergeResult);

        if (!mergeResult.success) {
          const errorMsg = mergeResult.error || "未知错误";
          throw new Error(`音频合并失败: ${errorMsg}`);
        }

        completed.add(sectionId);
        setCompletedSections(new Set(completed));
        setCurrentTask({
          sectionId,
          progress: 100,
          status: `完成: ${section.title}`,
        });
      }
    } catch (err) {
      console.error("Generate audio error:", err);
      const errorMessage = err instanceof Error ? err.message : String(err) || "生成失败";
      setError(errorMessage);
    } finally {
      setGenerating(false);
      setCurrentTask(null);
    }
  };

  // 一键配置语音
  const autoConfigureVoice = async () => {
    if (!discoveredChars || discoveredChars.length === 0) return;
    
    setAutoConfiguring(true);
    try {
      const response = await fetch(`/api/projects/${project.id}/voice-config/auto`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          discoveredCharacters: discoveredChars,
          defaultService: project.voiceConfig?.defaultService || "edge",
        }),
      });
      
      const result = await response.json();
      if (result.success) {
        setDiscoveredChars(null); // 清除发现的角色提示
        alert(`自动配置成功！已添加 ${result.data.addedCharacters.length} 个角色语音配置。`);
      } else {
        throw new Error(result.error || "配置失败");
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(`自动配置失败: ${errorMessage}`);
    } finally {
      setAutoConfiguring(false);
    }
  };

  // 播放音频
  const playAudio = (sectionId: string) => {
    const task = tasks.find(t => t.sectionId === sectionId);
    if (!task?.mergedAudioUrl) return;

    // 构建音频文件访问 URL
    // mergedAudioUrl 格式: /output/有声小说-xxx/1-1-1.mp3
    const audioPath = task.mergedAudioUrl.replace(/^\/output\//, "");
    const audioUrl = `/api/audio-file?path=${encodeURIComponent(audioPath)}`;

    if (audioPlayer?.sectionId === sectionId) {
      // 切换播放/暂停
      setAudioPlayer({ ...audioPlayer, playing: !audioPlayer.playing });
    } else {
      // 新播放
      setAudioPlayer({
        sectionId,
        url: audioUrl,
        playing: true,
      });
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Headphones className="w-5 h-5" />
          音频生成
          <Badge variant="secondary">
            {selectedSections.size} 选中
          </Badge>
          {completedSections.size > 0 && (
            <Badge variant="default" className="bg-green-500">
              {completedSections.size} 已完成
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 发现新角色提示 */}
        {discoveredChars && discoveredChars.length > 0 && (
          <Card className="bg-blue-50 border-blue-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2 text-blue-800">
                <Users className="w-4 h-4" />
                发现新角色
              </CardTitle>
              <CardDescription className="text-xs text-blue-600">
                AI 识别到以下角色尚未配置语音，建议一键自动配置
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex flex-wrap gap-2 mb-3">
                {discoveredChars.map(char => (
                  <Badge key={char.id} variant="secondary" className="bg-white">
                    {char.name} 
                    <span className="text-gray-400 ml-1">
                      ({char.gender === "male" ? "男" : char.gender === "female" ? "女" : "未知"})
                    </span>
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  onClick={autoConfigureVoice}
                  disabled={autoConfiguring}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {autoConfiguring ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                      配置中...
                    </>
                  ) : (
                    <>
                      <Wand2 className="w-4 h-4 mr-1" />
                      一键配置语音
                    </>
                  )}
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => setDiscoveredChars(null)}
                >
                  忽略
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 章节/小节选择树 */}
        <div className="border rounded-md max-h-96 overflow-y-auto p-2">
          {/* 按卷分组显示章节 */}
          {(() => {
            // 按卷号分组章节
            const chaptersByVolume = new Map<number, typeof project.chapters>();
            for (const ch of project.chapters || []) {
              const volNum = ch.volumeNumber || 1;
              if (!chaptersByVolume.has(volNum)) {
                chaptersByVolume.set(volNum, []);
              }
              chaptersByVolume.get(volNum)!.push(ch);
            }
            
            // 获取卷标题
            const getVolumeTitle = (volNum: number) => {
              const vol = project.outline?.volumes?.find(v => v.number === volNum);
              return vol?.title || `第${volNum}卷`;
            };
            
            return Array.from(chaptersByVolume.entries())
              .sort(([a], [b]) => a - b)
              .map(([volNum, chapters]) => (
                <div key={volNum} className="mb-4">
                  <h4 className="text-sm font-semibold text-gray-500 mb-2 px-2">
                    第{volNum}卷: {getVolumeTitle(volNum)}
                  </h4>
                  {chapters
                    .sort((a, b) => a.chapterNumber - b.chapterNumber)
                    .map(chapter => {
                      const sections = getSectionsByChapter(chapter.id);
                      if (sections.length === 0) return null;
                      
                      const isExpanded = expandedChapters.has(chapter.id);
                      const isFullySelected = isChapterFullySelected(chapter.id);
                      const isPartiallySelected = isChapterPartiallySelected(chapter.id);
                      
                      return (
                        <div key={chapter.id} className="ml-2">
                          <div className="flex items-center gap-2 p-1 hover:bg-gray-50 rounded">
                            <button
                              onClick={() => toggleChapter(chapter.id)}
                              className="p-1 hover:bg-gray-200 rounded"
                            >
                              {isExpanded ? (
                                <ChevronDown className="w-4 h-4" />
                              ) : (
                                <ChevronRight className="w-4 h-4" />
                              )}
                            </button>
                            <Checkbox
                              id={`ch-${chapter.id}`}
                              checked={isFullySelected}
                              data-state={isPartiallySelected ? "indeterminate" : undefined}
                              onCheckedChange={() => toggleChapterSelection(chapter.id)}
                            />
                            <Label
                              htmlFor={`ch-${chapter.id}`}
                              className="text-sm font-medium cursor-pointer flex-1"
                            >
                              第{chapter.chapterNumber}章: {chapter.title}
                            </Label>
                            <Badge variant="outline" className="text-xs">
                              {sections.length} 小节
                            </Badge>
                          </div>
                          
                          {isExpanded && (
                            <div className="ml-8 space-y-1">
                              {sections.map(sec => {
                                const isCompleted = completedSections.has(sec.sectionId);
                                const task = tasks.find(t => t.sectionId === sec.sectionId);
                                
                                return (
                                  <div
                                    key={sec.sectionId}
                                    className="flex items-center gap-2 p-1 hover:bg-gray-50 rounded"
                                  >
                                    <Checkbox
                                      id={`sec-${sec.sectionId}`}
                                      checked={selectedSections.has(sec.sectionId)}
                                      onCheckedChange={() => toggleSection(sec.sectionId)}
                                      disabled={generating}
                                    />
                                    <Label
                                      htmlFor={`sec-${sec.sectionId}`}
                                      className="text-sm cursor-pointer flex-1"
                                    >
                                      {sec.sectionNumber}. {sec.title}
                                    </Label>
                                    
                                    {isCompleted && (
                                      <div className="flex items-center gap-1">
                                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                                        {task?.mergedAudioUrl && (
                                          <button
                                            onClick={() => playAudio(sec.sectionId)}
                                            className="p-1 hover:bg-gray-200 rounded"
                                            title="播放"
                                          >
                                            {audioPlayer?.sectionId === sec.sectionId && audioPlayer.playing ? (
                                              <Pause className="w-4 h-4" />
                                            ) : (
                                              <Play className="w-4 h-4" />
                                            )}
                                          </button>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              ));
          })()}
        </div>

        {/* 生成按钮 */}
        <div className="flex items-center gap-4">
          <Button
            onClick={generateAudio}
            disabled={generating || selectedSections.size === 0}
            className="flex-1"
          >
            {generating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                生成中...
              </>
            ) : (
              <>
                <Music className="w-4 h-4 mr-2" />
                生成音频 ({selectedSections.size})
              </>
            )}
          </Button>
        </div>

        {/* 进度显示 */}
        {generating && currentTask && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>{currentTask.status}</span>
              <span>{currentTask.progress}%</span>
            </div>
            <Progress value={currentTask.progress} className="h-2" />
          </div>
        )}

        {/* 错误提示 */}
        {error && (
          <div className="flex items-center gap-2 text-red-500 text-sm p-2 bg-red-50 rounded">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}

        {/* 音频播放器 */}
        {audioPlayer && (
          <audio
            src={audioPlayer.url}
            autoPlay={audioPlayer.playing}
            controls
            className="w-full"
            onEnded={() => setAudioPlayer(null)}
          />
        )}
      </CardContent>
    </Card>
  );
}
