"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  Headphones, 
  Play, 
  Pause,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  Loader2,
  BookOpen,
  Volume2,
  Save,
  AlertCircle,
  RefreshCw,
  ArrowRight,
  ArrowLeft,
  FileText,
  Settings,
  Users,
  Mic,
  SkipForward,
  RotateCcw,
  Trash2
} from "lucide-react";
import type { 
  NovelProject, 
  AudiobookSegment, 
  MultiRoleParagraph,
  MultiRoleCharacter,
  MultiRoleChapter
} from "@/types/novel";

// ==================== 类型定义 ====================

interface EdgeVoice {
  id: string;
  name: string;
  gender: string;
  description: string;
}

interface VoiceSettings {
  ttsService: string;
  edgeTTSMode: "single" | "multi";
  edgeSingleVoiceId: string;
  pauseBetweenLines: number;
}

// 默认语音设置
const DEFAULT_SETTINGS: VoiceSettings = {
  ttsService: "edge",
  edgeTTSMode: "single",
  edgeSingleVoiceId: "zh-CN-YunjianNeural",
  pauseBetweenLines: 500,
};

// 百度 TTS 默认设置
const BAIDU_DEFAULT_SETTINGS: VoiceSettings = {
  ttsService: "baidu",
  edgeTTSMode: "single",
  edgeSingleVoiceId: "baidu-3", // 度逍遥，情感男声，适合小说旁白
  pauseBetweenLines: 500,
};

// 阶段定义
const STAGES: { id: string; label: string; icon: typeof FileText; hidden?: boolean }[] = [
  { id: "audiobook_content_review", label: "内容确认", icon: FileText },
  { id: "audiobook_voice_config", label: "语音配置", icon: Settings },
  { id: "audiobook_simple_generation", label: "简单生成", icon: Mic, hidden: true }, // 单一音色时显示
  { id: "audiobook_multi_role_setup", label: "多角色配音", icon: Users, hidden: true }, // 多角色时显示
];

// Edge TTS 音色列表 - 经过验证的可用音色
// 基于微软 Azure 语音服务官方文档：https://learn.microsoft.com/azure/cognitive-services/speech-service/language-support
const EDGE_VOICES = [
  // 男声（已验证稳定）
  { id: "zh-CN-YunjianNeural", name: "云健", gender: "male", description: "沉稳大气，适合旁白" },
  { id: "zh-CN-YunxiNeural", name: "云希", gender: "male", description: "年轻阳光，适合青年男性" },
  { id: "zh-CN-YunxiaNeural", name: "云夏", gender: "male", description: "活泼开朗，适合少年男性" },
  { id: "zh-CN-YunyangNeural", name: "云扬", gender: "male", description: "磁性低沉，适合中年男性" },
  // 女声（已验证稳定）
  { id: "zh-CN-XiaoxiaoNeural", name: "晓晓", gender: "female", description: "活泼自然，适合年轻女性" },
  { id: "zh-CN-XiaoyiNeural", name: "晓伊", gender: "female", description: "温柔知性，适合成熟女性" },
];

// 百度 TTS 音色列表 - 精简版（已验证）
// API文档: https://cloud.baidu.com/doc/SPEECH/s/Rluv3uq3d
const BAIDU_VOICES = [
  // ==================== 男声 ====================
  // 小说旁白推荐
  { id: "baidu-3", name: "度逍遥", gender: "male", category: "男声", description: "情感男声，适合小说旁白" },
  { id: "baidu-4003", name: "度逍遥(臻品)", gender: "male", category: "男声", description: "顶级音质情感男声" },
  // 专业播报
  { id: "baidu-106", name: "度博文", gender: "male", category: "男声", description: "专业男声，新闻播报" },
  { id: "baidu-4206", name: "度博文(臻品)", gender: "male", category: "男声", description: "臻品专业男声，权威稳重" },
  // 情感/治愈
  { id: "baidu-4179", name: "度泽言(温暖)", gender: "male", category: "男声", description: "温暖治愈男声" },
  { id: "baidu-4193", name: "度泽言(开朗)", gender: "male", category: "男声", description: "开朗阳光男声" },
  { id: "baidu-4195", name: "度怀安", gender: "male", category: "男声", description: "磁性男声" },
  { id: "baidu-4176", name: "度有为", gender: "male", category: "男声", description: "磁性魅力男声" },
  // 标准
  { id: "baidu-1", name: "度小宇", gender: "male", category: "男声", description: "标准男声，清晰稳重" },

  // ==================== 女声 ====================
  // 小说女主角推荐
  { id: "baidu-4", name: "度丫丫", gender: "female", category: "女声", description: "情感女声，适合女主角" },
  { id: "baidu-4117", name: "度小乔", gender: "female", category: "女声", description: "活泼女声，适合女主角" },
  { id: "baidu-4196", name: "度清影", gender: "female", category: "女声", description: "多情感甜美女声" },
  { id: "baidu-6567", name: "度小柔", gender: "female", category: "女声", description: "极致温柔女声" },
  // 甜美/可爱
  { id: "baidu-5", name: "度小娇", gender: "female", category: "女声", description: "娇美女声，甜美动人" },
  { id: "baidu-111", name: "度小萌", gender: "female", category: "女声", description: "萝莉女声，萌系风格" },
  { id: "baidu-5118", name: "度小鹿", gender: "female", category: "女声", description: "甜美女声，温柔可爱" },
  // 清澈
  { id: "baidu-4105", name: "度灵儿", gender: "female", category: "女声", description: "清澈女声，纯净动人" },
  // 专业播报
  { id: "baidu-4100", name: "度小雯", gender: "female", category: "女声", description: "活力女主播" },
  { id: "baidu-5147", name: "度常盈", gender: "female", category: "女声", description: "电台女主播" },
  // 标准
  { id: "baidu-0", name: "度小美", gender: "female", category: "女声", description: "标准女声，温柔标准" },

  // ==================== 童声 ====================
  { id: "baidu-110", name: "度小童", gender: "male", category: "童声", description: "纯真儿童声音" },
  { id: "baidu-5976", name: "度小皮", gender: "male", category: "童声", description: "萌娃童声" },

  // ==================== 方言 ====================
  // 粤语
  { id: "baidu-20100", name: "度小粤", gender: "female", category: "方言", description: "粤语女声" },
  // 四川
  { id: "baidu-4139", name: "度小蓉", gender: "female", category: "方言", description: "四川女声" },
  { id: "baidu-4257", name: "四川小哥", gender: "male", category: "方言", description: "四川男声" },
  // 东北
  { id: "baidu-4134", name: "度阿锦", gender: "female", category: "方言", description: "东北女声" },
];

export default function AudiobookProjectPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;
  
  // ==================== 状态 ====================
  const [project, setProject] = useState<NovelProject | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // 阶段控制
  const [currentStage, setCurrentStage] = useState("audiobook_content_review");
  
  // 内容确认阶段
  const [expandedVolumes, setExpandedVolumes] = useState<Set<number>>(new Set());
  
  // 语音配置阶段
  const [voiceSettings, setVoiceSettings] = useState<VoiceSettings>(DEFAULT_SETTINGS);
  const [savingSettings, setSavingSettings] = useState(false);
  
  // 试听状态
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewPlaying, setPreviewPlaying] = useState(false);
  const previewAudioRef = React.useRef<HTMLAudioElement | null>(null);
  // 多角色配音试听
  const [charPreviewLoading, setCharPreviewLoading] = useState<string | null>(null);
  const [charPreviewPlaying, setCharPreviewPlaying] = useState<string | null>(null);
  const charPreviewAudioRef = React.useRef<HTMLAudioElement | null>(null);
  
  // 简单生成阶段
  const [generatingChapter, setGeneratingChapter] = useState<string | null>(null);
  
  // 多角色配音阶段
  const [selectedChapter, setSelectedChapter] = useState<{volume: number, chapter: number} | null>(null);
  const [chapterDialogOpen, setChapterDialogOpen] = useState(false);
  const [processingChapter, setProcessingChapter] = useState(false);
  const [chapterParagraphs, setChapterParagraphs] = useState<MultiRoleParagraph[]>([]);
  const [chapterCharacters, setChapterCharacters] = useState<MultiRoleCharacter[]>([]);
  const [dubbingChapter, setDubbingChapter] = useState(false);
  const [dubbingProgress, setDubbingProgress] = useState({ current: 0, total: 0, currentText: "" });
  const [failedSegments, setFailedSegments] = useState<{index: number; error: string; retryable: boolean}[]>([]);
  const [segmentResults, setSegmentResults] = useState<Map<number, string>>(new Map());
  
  // ==================== 加载项目 ====================
  useEffect(() => {
    loadProject();
  }, [projectId]);
  
  const loadProject = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/projects/${projectId}`);
      const result = await response.json();
      if (result.success) {
        const projectData = result.data;
        setProject(projectData);
        
        // 恢复当前阶段（兼容旧项目）
        let stage = projectData.currentStage || "audiobook_content_review";
        // 旧项目阶段映射
        if (stage === "audiobook_created") stage = "audiobook_content_review";
        if (stage === "audiobook_generating") stage = "audiobook_simple_generation";
        setCurrentStage(stage);
        
        // 恢复语音配置
        if (projectData.voiceConfig) {
          setVoiceSettings({
            ttsService: projectData.voiceConfig.defaultService || "edge",
            edgeTTSMode: projectData.voiceConfig.edgeTTSMode || "single",
            edgeSingleVoiceId: projectData.voiceConfig.edgeSingleVoiceId || "zh-CN-YunjianNeural",
            pauseBetweenLines: projectData.voiceConfig.pauseBetweenLines || 500,
          });
        }
      } else {
        setError(result.error || "加载失败");
      }
    } catch (err) {
      setError("加载项目失败");
    } finally {
      setLoading(false);
    }
  };
  
  // ==================== 阶段推进 ====================
  const advanceStage = async (nextStage: string) => {
    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentStage: nextStage }),
      });
      
      if (response.ok) {
        setCurrentStage(nextStage);
        await loadProject();
      }
    } catch (err) {
      console.error("推进阶段失败:", err);
    }
  };
  
  // ==================== 语音配置保存 ====================
  const saveVoiceSettings = async () => {
    setSavingSettings(true);
    try {
      const response = await fetch("/api/audiobook/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings: voiceSettings }),
      });
      
      if (response.ok) {
        // 同时保存到项目
        await fetch(`/api/projects/${projectId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            voiceConfig: {
              defaultService: voiceSettings.ttsService,
              edgeTTSMode: voiceSettings.edgeTTSMode,
              edgeSingleVoiceId: voiceSettings.edgeSingleVoiceId,
              pauseBetweenLines: voiceSettings.pauseBetweenLines,
              maxCharacters: 15,
              characters: [{
                characterId: "narrator",
                characterName: "旁白",
                characterType: "narrator",
                service: voiceSettings.ttsService,
                voiceId: voiceSettings.edgeSingleVoiceId,
              }],
            }
          }),
        });
        
        // 根据模式决定下一阶段
        if (voiceSettings.ttsService === "edge" && voiceSettings.edgeTTSMode === "single") {
          await advanceStage("audiobook_simple_generation");
        } else {
          await advanceStage("audiobook_multi_role_setup");
        }
      }
    } catch (err) {
      setError("保存配置失败");
    } finally {
      setSavingSettings(false);
    }
  };
  
  // ==================== 试听功能 ====================
  const playPreviewVoice = async () => {
    if (previewPlaying && previewAudioRef.current) {
      previewAudioRef.current.pause();
      previewAudioRef.current.currentTime = 0;
      setPreviewPlaying(false);
      return;
    }
    
    setPreviewLoading(true);
    try {
      const response = await fetch("/api/audiobook/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ voiceId: voiceSettings.edgeSingleVoiceId }),
      });
      
      if (!response.ok) throw new Error("试听生成失败");
      
      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      
      if (previewAudioRef.current) {
        URL.revokeObjectURL(previewAudioRef.current.src);
      }
      
      const audio = new Audio(audioUrl);
      previewAudioRef.current = audio;
      
      audio.onended = () => setPreviewPlaying(false);
      audio.onerror = () => {
        setPreviewPlaying(false);
        setError("音频播放失败");
      };
      
      await audio.play();
      setPreviewPlaying(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "试听失败");
    } finally {
      setPreviewLoading(false);
    }
  };
  
  // ==================== 简单生成 - 整章生成 ====================
  const generateChapterAudio = async (volumeNumber: number, chapterNumber: number) => {
    const chapterKey = `${volumeNumber}-${chapterNumber}`;
    setGeneratingChapter(chapterKey);
    setError(null);
    
    try {
      const response = await fetch(`/api/projects/${projectId}/generate/audiobook-chapter`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ volumeNumber, chapterNumber }),
      });
      
      const result = await response.json();
      if (result.success) {
        await loadProject();
      } else {
        throw new Error(result.error);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "生成失败");
    } finally {
      setGeneratingChapter(null);
    }
  };
  
  // ==================== 多角色 - 处理章节 ====================
  const processChapterWithAI = async (volume: number, chapter: number) => {
    setProcessingChapter(true);
    setError(null);
    
    try {
      // 调用AI分析API
      const response = await fetch(`/api/projects/${projectId}/generate/multirole-process`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ volumeNumber: volume, chapterNumber: chapter }),
      });
      
      const result = await response.json();
      if (result.success) {
        setChapterParagraphs(result.data.paragraphs);
        // API已经处理好isNew标记：
        // - 上一章的现有角色会保留isNew标记
        // - 本章节新检测的角色会标记isNew=true
        // - 不需要在前端清除标记，由API决定
        setChapterCharacters(result.data.characters);
        setChapterDialogOpen(true);
      } else {
        throw new Error(result.error);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "处理失败");
    } finally {
      setProcessingChapter(false);
    }
  };
  
  // ==================== 多角色 - 试听角色音色 ====================
  const playCharacterPreview = async (charId: string, voiceId: string) => {
    // 如果正在播放，先停止
    if (charPreviewPlaying === charId && charPreviewAudioRef.current) {
      charPreviewAudioRef.current.pause();
      charPreviewAudioRef.current.currentTime = 0;
      setCharPreviewPlaying(null);
      return;
    }
    
    // 如果正在播放其他角色，先停止
    if (charPreviewAudioRef.current) {
      charPreviewAudioRef.current.pause();
      URL.revokeObjectURL(charPreviewAudioRef.current.src);
      charPreviewAudioRef.current = null;
    }
    
    setCharPreviewLoading(charId);
    try {
      const response = await fetch("/api/audiobook/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ voiceId }),
      });
      
      if (!response.ok) throw new Error("试听生成失败");
      
      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      
      const audio = new Audio(audioUrl);
      charPreviewAudioRef.current = audio;
      
      audio.onended = () => setCharPreviewPlaying(null);
      audio.onerror = () => {
        setCharPreviewPlaying(null);
        setError("音频播放失败");
      };
      
      await audio.play();
      setCharPreviewPlaying(charId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "试听失败");
    } finally {
      setCharPreviewLoading(null);
    }
  };
  
  // ==================== 多角色 - 开始配音（带进度） ====================
  const startDubbing = async (retryIndices?: number[]) => {
    if (!selectedChapter) return;
    
    // 确定要处理的段落索引
    let indicesToProcess: number[];
    let isRetry: boolean;
    
    if (retryIndices) {
      // 明确指定重试某些段落
      indicesToProcess = retryIndices;
      isRetry = true;
    } else if (segmentResults.size > 0) {
      // 继续模式：只处理尚未成功的段落
      indicesToProcess = chapterParagraphs
        .map((_, i) => i)
        .filter(i => !segmentResults.has(i));
      isRetry = false;
    } else {
      // 全新开始
      indicesToProcess = chapterParagraphs.map((_, i) => i);
      isRetry = false;
    }
    
    setDubbingChapter(true);
    setError(null);
    if (!isRetry) {
      setFailedSegments([]);
      setSegmentResults(new Map());
    }
    
    const total = chapterParagraphs.length;
    const newFailed: {index: number; error: string; retryable: boolean}[] = [];
    const newResults = new Map(segmentResults);
    
    // 如果所有段落都已生成，直接合并
    if (indicesToProcess.length === 0 && newResults.size === total) {
      console.log("[Dubbing] All segments already generated, merging...");
    }
    
    try {
      for (const i of indicesToProcess) {
        const para = chapterParagraphs[i];
        setDubbingProgress({ 
          current: i + 1, 
          total, 
          currentText: `${para.characterName}: ${para.originalText.slice(0, 20)}...` 
        });
        
        // 查找角色对应的音色
        const character = chapterCharacters.find(c => c.id === para.characterId);
        const voiceId = character?.voiceId || (para.characterId === "narrator" ? "zh-CN-YunjianNeural" : "zh-CN-XiaoxiaoNeural");
        
        // 调用API生成单段音频（带3次重试）
        let success = false;
        let lastError = "";
        let retryable = false;
        
        for (let attempt = 1; attempt <= 3; attempt++) {
          try {
            const response = await fetch(`/api/projects/${projectId}/generate/multirole-segment`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                volumeNumber: selectedChapter.volume,
                chapterNumber: selectedChapter.chapter,
                segmentIndex: i,
                text: para.processedText,
                voiceId,
              }),
            });
            
            if (!response.ok) {
              const errorData = await response.json();
              throw new Error(errorData.error || `第 ${i + 1} 段生成失败`);
            }
            
            const result = await response.json();
            newResults.set(i, result.data.audioUrl);
            success = true;
            break;
          } catch (err) {
            lastError = err instanceof Error ? err.message : "生成失败";
            const errorData = err instanceof Error && 'retryable' in err ? (err as any).retryable : true;
            retryable = errorData;
            
            if (attempt < 3) {
              console.log(`[Dubbing] 第 ${i + 1} 段第 ${attempt} 次尝试失败，${retryable ? '1秒后重试' : '不重试'}...`);
              if (retryable) {
                await new Promise(r => setTimeout(r, 1000));
              } else {
                break;
              }
            }
          }
        }
        
        if (!success) {
          newFailed.push({ index: i, error: lastError, retryable });
        }
      }
      
      // 更新失败列表和结果
      if (isRetry) {
        // 重试模式：从失败列表中移除成功的，保留仍然失败的
        setFailedSegments(prev => {
          const remaining = prev.filter(f => !indicesToProcess.includes(f.index) || newFailed.find(nf => nf.index === f.index));
          return remaining;
        });
      } else {
        setFailedSegments(newFailed);
      }
      setSegmentResults(newResults);
      
      // 如果本次处理的段落中还有失败的，显示提示
      if (newFailed.length > 0) {
        setError(`${newFailed.length} 个段落生成失败，可点击"重试失败段落"重新生成`);
      }
      
      // 检查是否所有段落都已生成
      if (newResults.size < total) {
        // 还有段落未生成成功，不合并
        setDubbingChapter(false);
        return;
      }
      
      // 合并所有音频
      setDubbingProgress({ current: total, total, currentText: "合并音频文件..." });
      
      // 按顺序组装 audioUrls
      const audioUrls: string[] = [];
      for (let i = 0; i < total; i++) {
        const url = newResults.get(i);
        if (!url) {
          throw new Error(`第 ${i + 1} 段音频缺失`);
        }
        audioUrls.push(url);
      }
      
      const mergeResponse = await fetch(`/api/projects/${projectId}/generate/multirole-merge`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          volumeNumber: selectedChapter.volume,
          chapterNumber: selectedChapter.chapter,
          audioUrls,
          characters: chapterCharacters,
        }),
      });
      
      const mergeResult = await mergeResponse.json();
      if (mergeResult.success) {
        setChapterDialogOpen(false);
        setFailedSegments([]);
        setSegmentResults(new Map());
        await loadProject();
      } else {
        throw new Error(mergeResult.error);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "配音失败");
    } finally {
      setDubbingChapter(false);
      setDubbingProgress({ current: 0, total: 0, currentText: "" });
    }
  };
  
  // ==================== 获取统计 ====================
  const getStats = () => {
    if (!project?.audiobookSegments) return null;
    const segments = project.audiobookSegments;
    const completed = segments.filter(s => s.status === "completed").length;
    
    return {
      totalVolumes: new Set(segments.map(s => s.volumeNumber)).size,
      totalChapters: new Set(segments.map(s => `${s.volumeNumber}-${s.chapterNumber}`)).size,
      totalSegments: segments.length,
      completedSegments: completed,
    };
  };
  
  const stats = getStats();
  
  // 按卷章分组
  const getGroupedSegments = () => {
    if (!project?.audiobookSegments) return new Map();
    const groups = new Map<number, Map<number, AudiobookSegment[]>>();
    
    for (const segment of project.audiobookSegments) {
      if (!groups.has(segment.volumeNumber)) {
        groups.set(segment.volumeNumber, new Map());
      }
      const volume = groups.get(segment.volumeNumber)!;
      
      if (!volume.has(segment.chapterNumber)) {
        volume.set(segment.chapterNumber, []);
      }
      volume.get(segment.chapterNumber)!.push(segment);
    }
    return groups;
  };
  
  const groupedSegments = getGroupedSegments();
  
  // 按性别分组音色
  const maleVoices = EDGE_VOICES.filter(v => v.gender === "male");
  const femaleVoices = EDGE_VOICES.filter(v => v.gender === "female");
  
  // ==================== 渲染 ====================
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p>加载中...</p>
        </div>
      </div>
    );
  }
  
  if (error || !project) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center text-red-500">
          <p>{error || "项目不存在"}</p>
          <Button onClick={() => window.location.href = "/"} className="mt-4">
            返回首页
          </Button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* 左侧阶段导航 */}
      <aside className="w-64 bg-white border-r sticky top-0 h-screen">
        <div className="p-4 border-b">
          <h1 className="font-bold text-lg truncate">{project.title}</h1>
          <p className="text-xs text-gray-500">有声小说项目</p>
        </div>
        
        <nav className="p-4 space-y-2">
          {STAGES.filter(s => {
            // 基础阶段始终显示
            if (!s.hidden) return true;
            // 隐藏阶段根据配置显示
            const mode = voiceSettings.edgeTTSMode || project?.voiceConfig?.edgeTTSMode || "single";
            if (s.id === "audiobook_simple_generation" && mode === "single") return true;
            if (s.id === "audiobook_multi_role_setup" && mode === "multi") return true;
            return false;
          }).map((stage) => {
            const Icon = stage.icon;
            const isActive = currentStage === stage.id;
            // 计算是否为已完成阶段（索引小于当前阶段的索引）
            const currentIdx = STAGES.findIndex(s => s.id === currentStage);
            const stageIdx = STAGES.findIndex(s => s.id === stage.id);
            const isPast = currentIdx > stageIdx;
            // 第一阶段可点击
            const isClickable = isPast || stage.id === "audiobook_content_review";
            
            return (
              <button
                key={stage.id}
                className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors ${
                  isActive ? "bg-blue-50 text-blue-700 border border-blue-200" :
                  isPast ? "text-gray-700 hover:bg-gray-50" : 
                  stage.id === "audiobook_content_review" ? "text-gray-700 hover:bg-gray-50" :
                  "text-gray-400"
                }`}
                disabled={!isClickable && !isActive}
                onClick={() => {
                  if (isClickable) setCurrentStage(stage.id);
                }}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  isActive ? "bg-blue-600 text-white" :
                  isPast ? "bg-green-500 text-white" : 
                  stage.id === "audiobook_content_review" ? "bg-blue-100 text-blue-600" :
                  "bg-gray-200"
                }`}>
                  {isPast ? <CheckCircle2 className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                </div>
                <span className="font-medium">{stage.label}</span>
              </button>
            );
          })}
        </nav>
        
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t bg-white">
          <Button variant="ghost" className="w-full" onClick={() => window.location.href = "/"}>
            ← 返回首页
          </Button>
        </div>
      </aside>
      
      {/* 主内容区域 */}
      <main className="flex-1 p-6 overflow-auto">
        {/* 错误提示 */}
        {error && (
          <Alert className="mb-4 border-red-200 bg-red-50">
            <AlertCircle className="w-4 h-4 text-red-600" />
            <AlertDescription className="text-red-700">{error}</AlertDescription>
          </Alert>
        )}
        
        {/* ========== 阶段1: 内容确认 ========== */}
        {currentStage === "audiobook_content_review" && (
          <div className="max-w-4xl mx-auto space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>内容确认</span>
                  <Button variant="outline" onClick={() => window.location.reload()}>
                    <RotateCcw className="w-4 h-4 mr-2" />
                    重新读取
                  </Button>
                </CardTitle>
                <CardDescription>
                  确认小说结构是否正确，如有问题请点击"重新读取"
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* 统计信息 */}
                  <div className="grid grid-cols-4 gap-4 mb-6">
                    <div className="bg-blue-50 p-4 rounded-lg text-center">
                      <p className="text-2xl font-bold text-blue-600">{stats?.totalVolumes}</p>
                      <p className="text-sm text-blue-500">卷</p>
                    </div>
                    <div className="bg-green-50 p-4 rounded-lg text-center">
                      <p className="text-2xl font-bold text-green-600">{stats?.totalChapters}</p>
                      <p className="text-sm text-green-500">章</p>
                    </div>
                    <div className="bg-purple-50 p-4 rounded-lg text-center">
                      <p className="text-2xl font-bold text-purple-600">{stats?.totalSegments}</p>
                      <p className="text-sm text-purple-500">小节</p>
                    </div>
                    <div className="bg-orange-50 p-4 rounded-lg text-center">
                      <p className="text-2xl font-bold text-orange-600">
                        {(project.audiobookSource?.totalChars || 0 / 10000).toFixed(1)}
                      </p>
                      <p className="text-sm text-orange-500">万字</p>
                    </div>
                  </div>
                  
                  {/* 章节树 */}
                  <div className="border rounded-lg">
                    <div className="bg-gray-50 p-3 border-b">
                      <span className="font-medium">章节结构</span>
                    </div>
                    <div className="p-2 space-y-1 max-h-[400px] overflow-y-auto">
                      {Array.from(groupedSegments.entries()).map(([volumeNum, chapters]) => (
                        <div key={volumeNum} className="border rounded">
                          <button
                            className="w-full flex items-center gap-2 p-2 bg-gray-100 hover:bg-gray-200"
                            onClick={() => {
                              const next = new Set(expandedVolumes);
                              if (next.has(volumeNum)) next.delete(volumeNum);
                              else next.add(volumeNum);
                              setExpandedVolumes(next);
                            }}
                          >
                            {expandedVolumes.has(volumeNum) ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                            <span className="font-medium">第{volumeNum}卷</span>
                            <Badge variant="secondary" className="ml-auto">{chapters.size} 章</Badge>
                          </button>
                          
                          {expandedVolumes.has(volumeNum) && (
                            <div className="p-2 space-y-1">
                              {(Array.from(chapters.entries()) as [number, AudiobookSegment[]][]).map(([chapterNum, segs]) => (
                                <div key={chapterNum} className="pl-6 py-1 text-sm text-gray-600 flex justify-between">
                                  <span>{segs[0]?.chapterTitle || `第${chapterNum}章`}</span>
                                  <span className="text-gray-400">{segs.reduce((sum, s) => sum + s.content.length, 0)} 字</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* 下一步按钮 */}
            <div className="flex justify-end">
              <Button size="lg" onClick={() => advanceStage("audiobook_voice_config")}>
                确认内容，进入语音配置
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        )}
        
        {/* ========== 阶段2: 语音配置 ========== */}
        {currentStage === "audiobook_voice_config" && (
          <div className="max-w-3xl mx-auto">
            <Card>
              <CardHeader>
                <CardTitle>语音配置</CardTitle>
                <CardDescription>选择配音服务和音色配置</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* 配音服务 */}
                <div className="space-y-3">
                  <Label className="text-base font-medium">配音服务</Label>
                  <RadioGroup
                    value={voiceSettings.ttsService}
                    onValueChange={(value) => {
                      // 切换到百度TTS时，自动设置为多角色模式
                      const newMode = value === "baidu" ? "multi" : voiceSettings.edgeTTSMode;
                      setVoiceSettings({ 
                        ...voiceSettings, 
                        ttsService: value,
                        edgeTTSMode: newMode,
                        // 切换到百度时，如果没有百度音色，设置默认百度音色
                        edgeSingleVoiceId: value === "baidu" && !voiceSettings.edgeSingleVoiceId?.startsWith("baidu-") 
                          ? "baidu-3" 
                          : voiceSettings.edgeSingleVoiceId
                      });
                    }}
                    className="grid grid-cols-2 gap-4"
                  >
                    <div className="flex items-center space-x-2 border rounded-lg p-4 cursor-pointer hover:bg-gray-50">
                      <RadioGroupItem value="edge" id="edge" />
                      <Label htmlFor="edge" className="cursor-pointer flex-1">
                        <div className="font-medium">Edge TTS</div>
                        <div className="text-xs text-gray-500">微软免费在线TTS</div>
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2 border rounded-lg p-4 cursor-pointer hover:bg-gray-50">
                      <RadioGroupItem value="baidu" id="baidu" />
                      <Label htmlFor="baidu" className="cursor-pointer flex-1">
                        <div className="font-medium">百度 TTS</div>
                        <div className="text-xs text-gray-500">百度智能云语音合成</div>
                      </Label>
                    </div>
                  </RadioGroup>
                </div>
                
                {/* Edge TTS 模式 */}
                {voiceSettings.ttsService === "edge" && (
                  <div className="space-y-3 pt-4 border-t">
                    <Label className="text-base font-medium">配音模式</Label>
                    <RadioGroup
                      value={voiceSettings.edgeTTSMode}
                      onValueChange={(value: "single" | "multi") => setVoiceSettings({ ...voiceSettings, edgeTTSMode: value })}
                      className="grid grid-cols-2 gap-4"
                    >
                      <div className="flex items-center space-x-2 border rounded-lg p-4 cursor-pointer hover:bg-gray-50">
                        <RadioGroupItem value="single" id="single" />
                        <Label htmlFor="single" className="cursor-pointer flex-1">
                          <div className="font-medium">单一音色</div>
                          <div className="text-xs text-gray-500">全书使用同一个音色朗读</div>
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2 border rounded-lg p-4 cursor-pointer hover:bg-gray-50">
                        <RadioGroupItem value="multi" id="multi" />
                        <Label htmlFor="multi" className="cursor-pointer flex-1">
                          <div className="font-medium">多角色配音</div>
                          <div className="text-xs text-gray-500">自动识别角色分配不同音色</div>
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>
                )}
                
                {/* Edge TTS 音色选择与试听 - 独立于配音模式 */}
                {voiceSettings.ttsService === "edge" && (
                  <div className="space-y-3 pt-4 border-t">
                    <Label className="text-base font-medium">默认音色</Label>
                    <div className="text-xs text-gray-500 mb-2">
                      {voiceSettings.edgeTTSMode === "single" 
                        ? "全书将使用此音色朗读" 
                        : "旁白和默认角色将使用此音色，其他角色可在配音时单独设置"}
                    </div>
                    <Select
                      value={voiceSettings.edgeSingleVoiceId}
                      onValueChange={(value) => setVoiceSettings({ ...voiceSettings, edgeSingleVoiceId: value || EDGE_VOICES[0].id })}
                    >
                      <SelectTrigger>
                        <span className="text-sm">
                          {EDGE_VOICES.find(v => v.id === voiceSettings.edgeSingleVoiceId)?.name || "选择音色"}
                          {voiceSettings.edgeSingleVoiceId && (
                            <span className="text-gray-400 text-xs ml-2">
                              ({EDGE_VOICES.find(v => v.id === voiceSettings.edgeSingleVoiceId)?.description})
                            </span>
                          )}
                        </span>
                      </SelectTrigger>
                      <SelectContent className="max-h-[300px] w-[400px]">
                        <div className="px-2 py-1.5 text-xs font-semibold text-gray-500">男声</div>
                        {EDGE_VOICES.filter(v => v.gender === "male").map((voice) => (
                          <SelectItem key={voice.id} value={voice.id}>
                            {voice.name} - {voice.description}
                          </SelectItem>
                        ))}
                        <div className="px-2 py-1.5 text-xs font-semibold text-gray-500 mt-2">女声</div>
                        {EDGE_VOICES.filter(v => v.gender === "female").map((voice) => (
                          <SelectItem key={voice.id} value={voice.id}>
                            {voice.name} - {voice.description}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    
                    <div className="flex items-center gap-2 pt-2">
                      <Button variant="outline" size="sm" onClick={playPreviewVoice} disabled={previewLoading}>
                        {previewLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : previewPlaying ? "■ 停止" : "▶ 试听"}
                      </Button>
                    </div>
                  </div>
                )}
                
                {/* 百度 TTS 默认音色选择 */}
                {voiceSettings.ttsService === "baidu" && (
                  <div className="space-y-3 pt-4 border-t">
                    <Label className="text-base font-medium">旁白音色</Label>
                    <div className="text-xs text-gray-500 mb-2">
                      百度 TTS 仅支持多角色配音模式。旁白使用此音色，其他角色可在配音时单独设置
                    </div>
                    <Select
                      value={voiceSettings.edgeSingleVoiceId}
                      onValueChange={(value) => setVoiceSettings({ ...voiceSettings, edgeSingleVoiceId: value || BAIDU_VOICES[0].id })}
                    >
                      <SelectTrigger>
                        <span className="text-sm">
                          {BAIDU_VOICES.find(v => v.id === voiceSettings.edgeSingleVoiceId)?.name || "选择音色"}
                          {voiceSettings.edgeSingleVoiceId && (
                            <span className="text-gray-400 text-xs ml-2">
                              ({BAIDU_VOICES.find(v => v.id === voiceSettings.edgeSingleVoiceId)?.description})
                            </span>
                          )}
                        </span>
                      </SelectTrigger>
                      <SelectContent className="max-h-[400px] w-[450px]">
                        <div className="px-2 py-1.5 text-xs font-semibold text-amber-600">⭐ 推荐（适合小说）</div>
                        {BAIDU_VOICES.filter(v => ["baidu-3", "baidu-4", "baidu-4003", "baidu-4117", "baidu-4196"].includes(v.id)).map((voice) => (
                          <SelectItem key={voice.id} value={voice.id}>
                            {voice.name} - {voice.description}
                          </SelectItem>
                        ))}
                        <div className="px-2 py-1.5 text-xs font-semibold text-blue-600 mt-2">🎙️ 男声</div>
                        {BAIDU_VOICES.filter(v => v.category === "男声" && !["baidu-3", "baidu-4003"].includes(v.id)).map((voice) => (
                          <SelectItem key={voice.id} value={voice.id}>
                            {voice.name} - {voice.description}
                          </SelectItem>
                        ))}
                        <div className="px-2 py-1.5 text-xs font-semibold text-pink-600 mt-2">🎙️ 女声</div>
                        {BAIDU_VOICES.filter(v => v.category === "女声" && !["baidu-4", "baidu-4117", "baidu-4196"].includes(v.id)).map((voice) => (
                          <SelectItem key={voice.id} value={voice.id}>
                            {voice.name} - {voice.description}
                          </SelectItem>
                        ))}
                        <div className="px-2 py-1.5 text-xs font-semibold text-green-600 mt-2">👶 童声</div>
                        {BAIDU_VOICES.filter(v => v.category === "童声").map((voice) => (
                          <SelectItem key={voice.id} value={voice.id}>
                            {voice.name} - {voice.description}
                          </SelectItem>
                        ))}
                        <div className="px-2 py-1.5 text-xs font-semibold text-purple-600 mt-2">🗣️ 方言</div>
                        {BAIDU_VOICES.filter(v => v.category === "方言").map((voice) => (
                          <SelectItem key={voice.id} value={voice.id}>
                            {voice.name} - {voice.description}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    
                    <div className="flex items-center gap-2 pt-2">
                      <Button variant="outline" size="sm" onClick={playPreviewVoice} disabled={previewLoading}>
                        {previewLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : previewPlaying ? "■ 停止" : "▶ 试听"}
                      </Button>
                    </div>
                  </div>
                )}
                
                {/* 段落间隔 */}
                <div className="space-y-3 pt-4 border-t">
                  <Label className="text-base font-medium">段落间隔</Label>
                  <div className="flex items-center gap-4">
                    <Input
                      type="number"
                      value={voiceSettings.pauseBetweenLines}
                      onChange={(e) => setVoiceSettings({ ...voiceSettings, pauseBetweenLines: parseInt(e.target.value) || 500 })}
                      className="w-32"
                      min={0}
                      max={2000}
                      step={100}
                    />
                    <span className="text-sm text-gray-500">毫秒</span>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <div className="flex justify-between mt-6">
              <Button variant="outline" onClick={() => setCurrentStage("audiobook_content_review")}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                返回
              </Button>
              <Button size="lg" onClick={saveVoiceSettings} disabled={savingSettings}>
                {savingSettings ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                保存并进入下一步
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        )}
        
        {/* ========== 阶段3a: 简单生成 ========== */}
        {currentStage === "audiobook_simple_generation" && (
          <div className="max-w-4xl mx-auto">
            <Card>
              <CardHeader>
                <CardTitle>简单语音生成</CardTitle>
                <CardDescription>使用 {EDGE_VOICES.find(v => v.id === voiceSettings.edgeSingleVoiceId)?.name} 音色为章节配音</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Array.from(groupedSegments.entries()).map(([volumeNum, chapters]) => (
                    <div key={volumeNum} className="border rounded-lg">
                      <div className="bg-gray-50 p-3 font-medium">第{volumeNum}卷</div>
                      <div className="p-2 space-y-1">
                        {(Array.from(chapters.entries()) as [number, AudiobookSegment[]][]).map(([chapterNum, segs]) => {
                          const chapterKey = `${volumeNum}-${chapterNum}`;
                          const isCompleted = segs.every(s => s.status === "completed");
                          
                          return (
                            <div key={chapterNum} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded">
                              <div className="flex items-center gap-3">
                                {isCompleted ? (
                                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                                ) : (
                                  <div className="w-5 h-5 rounded-full border-2 border-gray-300" />
                                )}
                                <span>{segs[0]?.chapterTitle || `第${chapterNum}章`}</span>
                                <span className="text-sm text-gray-400">
                                  {segs.reduce((sum, s) => sum + s.content.length, 0)} 字
                                </span>
                              </div>
                              
                              {isCompleted ? (
                                <Button variant="ghost" size="sm" onClick={() => window.open(segs[0]?.audioUrl, '_blank')}>
                                  <Play className="w-4 h-4" />
                                </Button>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  disabled={generatingChapter === chapterKey}
                                  onClick={() => generateChapterAudio(volumeNum, chapterNum)}
                                >
                                  {generatingChapter === chapterKey ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <><Mic className="w-4 h-4 mr-1" /> 配音</>
                                  )}
                                </Button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
        
        {/* ========== 阶段3b: 多角色配音 ========== */}
        {currentStage === "audiobook_multi_role_setup" && (
          <div className="max-w-4xl mx-auto">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>多角色配音</CardTitle>
                  <CardDescription>逐章处理，AI将自动识别角色并分配音色</CardDescription>
                  <div className="mt-2 text-xs text-amber-600 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    点击"进入配音"后，AI需要1-2分钟分析章节内容，请耐心等待
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={async () => {
                    if (!confirm("确定要重置所有配音吗？这将清除所有已生成的音频和角色配置，需要重新配置。")) {
                      return;
                    }
                    try {
                      // 重置所有分段状态
                      const resetSegments = project?.audiobookSegments?.map(s => ({
                        ...s,
                        status: "pending" as const,
                        audioUrl: undefined,
                        duration: undefined,
                      }));
                      
                      // 重置多角色配置中的章节状态，并清空角色列表
                      const resetMultiRoleConfig = {
                        characters: [] as MultiRoleCharacter[], // 清空角色列表
                        chapters: project?.multiRoleConfig?.chapters.map(c => ({
                          ...c,
                          status: "pending" as const,
                          audioUrl: undefined,
                          duration: undefined,
                        })) || [],
                      };
                      
                      // 保存到服务器
                      const response = await fetch(`/api/projects/${projectId}`, {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          audiobookSegments: resetSegments,
                          multiRoleConfig: resetMultiRoleConfig,
                        }),
                      });
                      
                      if (response.ok) {
                        await loadProject();
                        setError(null);
                      } else {
                        throw new Error("重置失败");
                      }
                    } catch (err) {
                      setError("重置配音失败");
                    }
                  }}
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  重置所有配音
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Array.from(groupedSegments.entries()).map(([volumeNum, chapters]) => (
                    <div key={volumeNum} className="border rounded-lg">
                      <div className="bg-gray-50 p-3 font-medium">第{volumeNum}卷</div>
                      <div className="p-2 space-y-1">
                        {(Array.from(chapters.entries()) as [number, AudiobookSegment[]][]).map(([chapterNum, segs]) => {
                          const isCompleted = segs.every(s => s.status === "completed");
                          
                          return (
                            <div key={chapterNum} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded">
                              <div className="flex items-center gap-3">
                                {isCompleted ? (
                                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                                ) : (
                                  <div className="w-5 h-5 rounded-full border-2 border-gray-300" />
                                )}
                                <span>{segs[0]?.chapterTitle || `第${chapterNum}章`}</span>
                              </div>
                              
                              {isCompleted ? (
                                <div className="flex items-center gap-2">
                                  <Button variant="ghost" size="sm" onClick={() => window.open(segs[0]?.audioUrl, '_blank')}>
                                    <Play className="w-4 h-4" />
                                  </Button>
                                  <Button 
                                    size="sm" 
                                    variant="outline"
                                    onClick={() => {
                                      setSelectedChapter({ volume: volumeNum, chapter: chapterNum });
                                      processChapterWithAI(volumeNum, chapterNum);
                                    }}
                                    disabled={processingChapter}
                                    title="AI将自动分析章节内容，识别对话和角色"
                                  >
                                    {processingChapter && selectedChapter?.volume === volumeNum && selectedChapter?.chapter === chapterNum ? (
                                      <>
                                        <Loader2 className="w-4 h-4 animate-spin mr-1" />
                                        分析中...
                                      </>
                                    ) : (
                                      <>
                                        <RotateCcw className="w-4 h-4 mr-1" />
                                        重新配音
                                      </>
                                    )}
                                  </Button>
                                  <Badge variant="secondary">已完成</Badge>
                                </div>
                              ) : (
                                <Button
                                  size="sm"
                                  onClick={() => {
                                    setSelectedChapter({ volume: volumeNum, chapter: chapterNum });
                                    processChapterWithAI(volumeNum, chapterNum);
                                  }}
                                  disabled={processingChapter}
                                  title="AI将自动分析章节内容，识别对话和角色"
                                >
                                  {processingChapter && selectedChapter?.volume === volumeNum && selectedChapter?.chapter === chapterNum ? (
                                    <>
                                      <Loader2 className="w-4 h-4 animate-spin mr-1" />
                                      分析中...
                                    </>
                                  ) : (
                                    <>
                                      <Users className="w-4 h-4 mr-1" />
                                      进入配音
                                    </>
                                  )}
                                </Button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
      
      {/* 多角色配音弹窗 */}
      <Dialog open={chapterDialogOpen} onOpenChange={setChapterDialogOpen}>
        <DialogContent className="w-[1800px] h-[95vh] flex flex-col p-0 overflow-hidden" style={{ maxWidth: '95vw' }}>
          <DialogHeader className="px-4 py-2 border-b shrink-0">
            <DialogTitle className="text-base">
              章节配音 - 第{selectedChapter?.volume}卷 第{selectedChapter?.chapter}章
            </DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 flex overflow-hidden">
            {/* 左侧：处理后的文本 - 占更大比例 */}
            <div className="flex-[3] flex flex-col border-r min-w-0">
              <div className="bg-gray-50 px-4 py-2 border-b flex items-center justify-between">
                <span className="font-medium">小说内容（点击文本可编辑，点击人物标记可修改角色）</span>
                <span className="text-xs text-gray-500">{chapterParagraphs.length} 段</span>
              </div>
              <ScrollArea className="flex-1 h-0">
                <div className="p-4 space-y-4">
                  {chapterParagraphs.map((para, idx) => (
                    <div key={para.id} className="group relative">
                      <div className="p-3 bg-gray-50 rounded hover:bg-gray-100 transition-colors border-l-4 border-transparent hover:border-blue-400">
                        {/* 段落操作按钮 - 右上角 */}
                        <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 bg-white/80 rounded p-1 shadow-sm">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 text-blue-500 hover:text-blue-700"
                            onClick={() => {
                              const newPara: MultiRoleParagraph = {
                                id: `p-new-${Date.now()}`,
                                order: idx,
                                characterId: "narrator",
                                characterName: "旁白",
                                type: "narration",
                                originalText: "",
                                processedText: "",
                              };
                              setChapterParagraphs(prev => [
                                ...prev.slice(0, idx),
                                newPara,
                                ...prev.slice(idx).map((p, i) => ({ ...p, order: p.order + 1 }))
                              ]);
                            }}
                            title="在上方插入"
                          >
                            ↑
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                            onClick={() => {
                              if (chapterParagraphs.length <= 1) {
                                setError("至少保留一个段落");
                                return;
                              }
                              setChapterParagraphs(prev => prev.filter((_, i) => i !== idx).map((p, i) => ({ ...p, order: i })));
                            }}
                            title="删除"
                          >
                            ×
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 text-blue-500 hover:text-blue-700"
                            onClick={() => {
                              const newPara: MultiRoleParagraph = {
                                id: `p-new-${Date.now()}`,
                                order: idx + 1,
                                characterId: "narrator",
                                characterName: "旁白",
                                type: "narration",
                                originalText: "",
                                processedText: "",
                              };
                              setChapterParagraphs(prev => [
                                ...prev.slice(0, idx + 1),
                                newPara,
                                ...prev.slice(idx + 1).map((p, i) => ({ ...p, order: p.order + 1 }))
                              ]);
                            }}
                            title="在下方插入"
                          >
                          ↓
                          </Button>
                        </div>
                        
                        {/* 人物选择 */}
                        <div className="flex items-center gap-2 mb-2">
                          <Select
                            value={para.characterId}
                            onValueChange={(value) => {
                              if (!value) return;
                              const char = chapterCharacters.find(c => c.id === value);
                              setChapterParagraphs(prev => prev.map((p, i) => 
                                i === idx ? { 
                                  ...p, 
                                  characterId: value,
                                  characterName: char?.name || p.characterName
                                } : p
                              ));
                            }}
                          >
                            <SelectTrigger className="w-auto min-w-[120px] h-7 text-xs">
                              <Badge variant={para.type === "dialogue" ? "default" : "secondary"} className="mr-2">
                                {para.type === "narration" ? "旁白" : para.type === "dialogue" ? "对话" : "独白"}
                              </Badge>
                              <span className="truncate">{para.characterName}</span>
                            </SelectTrigger>
                            <SelectContent>
                              <div className="px-2 py-1 text-xs font-semibold text-gray-500">选择角色</div>
                              {chapterCharacters.map(char => (
                                <SelectItem key={char.id} value={char.id} className="text-xs">
                                  {char.name} ({char.gender === "male" ? "男" : char.gender === "female" ? "女" : "未知"})
                                </SelectItem>
                              ))}
                              <Separator className="my-1" />
                              <div className="px-2 py-1 text-xs font-semibold text-gray-500">快速设置</div>
                              <SelectItem value="narrator" className="text-xs">设为旁白</SelectItem>
                            </SelectContent>
                          </Select>
                          
                          <Select
                            value={para.type}
                            onValueChange={(value) => {
                              if (!value) return;
                              setChapterParagraphs(prev => prev.map((p, i) => 
                                i === idx ? { ...p, type: value as "narration" | "dialogue" | "monologue" } : p
                              ));
                            }}
                          >
                            <SelectTrigger className="w-[100px] h-7 text-xs">
                              <span className="text-xs">
                                {para.type === "narration" ? "旁白" : para.type === "dialogue" ? "对话" : "独白"}
                              </span>
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="narration" className="text-xs">旁白</SelectItem>
                              <SelectItem value="dialogue" className="text-xs">对话</SelectItem>
                              <SelectItem value="monologue" className="text-xs">独白</SelectItem>
                            </SelectContent>
                          </Select>
                          
                          <span className="text-xs text-gray-400 ml-auto">段落 {idx + 1}</span>
                        </div>
                        
                        {/* 可编辑文本 */}
                        <textarea
                          value={para.originalText}
                          onChange={(e) => {
                            setChapterParagraphs(prev => prev.map((p, i) => 
                              i === idx ? { 
                                ...p, 
                                originalText: e.target.value,
                                processedText: e.target.value.replace(/["""']/g, '')
                              } : p
                            ));
                          }}
                          className="w-full min-h-[60px] p-2 text-sm bg-white border rounded resize-y focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                          placeholder="输入文本内容..."
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
            
            {/* 右侧：人物配置 */}
            <div className="w-[320px] flex flex-col bg-gray-50/50 shrink-0 border-l">
              <div className="bg-gray-50 px-4 py-2 border-b flex items-center justify-between">
                <span className="font-medium">人物配置（可编辑）</span>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-7 text-xs"
                  onClick={() => {
                    // 添加新人物 - 预设旁白音色并标记为新人物
                    const newId = `char-custom-${Date.now()}`;
                    // 获取旁白的音色作为默认值（如果没有旁白则使用第一个可用音色）
                    const narratorVoice = chapterCharacters.find(c => c.id === "narrator")?.voiceId;
                    const defaultVoice = narratorVoice || EDGE_VOICES[0]?.id;
                    setChapterCharacters(prev => [...prev, {
                      id: newId,
                      name: "新角色",
                      type: "supporting",
                      gender: "unknown",
                      description: "",
                      firstAppearChapter: selectedChapter?.chapter || 1,
                      voiceId: defaultVoice,
                      isNew: true,  // 标记为新人物
                    }]);
                  }}
                >
                  + 添加角色
                </Button>
              </div>
              <ScrollArea className="flex-1 h-0">
                <div className="p-4 space-y-3">
                  {/* 旁白角色始终显示在最上方 */}
                  {!chapterCharacters.find(c => c.id === "narrator") && (
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded shadow-sm">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-medium text-blue-900">旁白</span>
                        <Badge variant="secondary" className="text-xs">叙述者</Badge>
                      </div>
                      <div className="text-xs text-blue-700 mb-3">
                        旁白是故事的叙述者，用于描述场景、动作和心理活动。
                      </div>
                      <Select
                        value=""
                        onValueChange={(value) => {
                          if (!value) return;
                          // 添加旁白角色
                          setChapterCharacters(prev => [{
                            id: "narrator",
                            name: "旁白",
                            type: "narrator",
                            gender: "unknown",
                            description: "故事叙述",
                            firstAppearChapter: selectedChapter?.chapter || 1,
                            voiceId: value,
                          }, ...prev]);
                        }}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <span className="text-gray-500">选择旁白音色（必须）</span>
                        </SelectTrigger>
                        <SelectContent className="max-h-[300px] w-[380px]">
                          <div className="px-2 py-1 text-xs font-semibold text-gray-500">男声</div>
                          {maleVoices.map(v => (
                            <SelectItem key={v.id} value={v.id} className="text-xs py-2">
                              <span className="font-medium">{v.name}</span>
                              <span className="text-gray-500 ml-2">{v.description}</span>
                            </SelectItem>
                          ))}
                          <div className="px-2 py-1 text-xs font-semibold text-gray-500 mt-1">女声</div>
                          {femaleVoices.map(v => (
                            <SelectItem key={v.id} value={v.id} className="text-xs py-2">
                              <span className="font-medium">{v.name}</span>
                              <span className="text-gray-500 ml-2">{v.description}</span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  
                  {/* 按顺序显示角色（旁白在前，已有角色保持顺序，新角色在后） */}
                  {[...chapterCharacters]
                    .map((char, originalIndex) => ({ char, originalIndex }))
                    .sort((a, b) => {
                      // 旁白始终在最前
                      if (a.char.id === "narrator") return -1;
                      if (b.char.id === "narrator") return 1;
                      // 新角色排在最后
                      if (a.char.isNew && !b.char.isNew) return 1;
                      if (!a.char.isNew && b.char.isNew) return -1;
                      // 已有角色保持原有顺序（按原始索引）
                      return a.originalIndex - b.originalIndex;
                    })
                    .map(({ char }, idx) => (
                    <div key={char.id} className={`p-3 border rounded shadow-sm ${char.id === "narrator" ? "bg-blue-50 border-blue-200" : "bg-white"}`}>
                      {/* 旁白特殊标记 */}
                      {char.id === "narrator" && (
                        <div className="flex items-center gap-2 mb-2">
                          <Badge className="bg-blue-600 text-white">旁白</Badge>
                          <span className="text-xs text-blue-700">故事叙述者（必须配置音色）</span>
                        </div>
                      )}
                      
                      {/* 人物名称（可编辑） */}
                      <div className="flex items-center gap-2 mb-2">
                        <div className="flex-1 relative">
                          <Input
                            value={char.name}
                            onChange={(e) => {
                              setChapterCharacters(prev => prev.map((c, i) => 
                                i === idx ? { ...c, name: e.target.value } : c
                              ));
                              // 同步更新段落中的人物名称
                              setChapterParagraphs(prev => prev.map(p => 
                                p.characterId === char.id ? { ...p, characterName: e.target.value } : p
                              ));
                            }}
                            className={`h-8 font-medium ${char.id === "narrator" ? "bg-blue-100/50 border-blue-200" : char.isNew ? "border-orange-300 bg-orange-50/30" : ""}`}
                            placeholder="角色名称"
                            disabled={char.id === "narrator"}
                          />
                          {/* 新人物标签 */}
                          {char.isNew && (
                            <Badge className="absolute right-2 top-1/2 -translate-y-1/2 bg-orange-500 text-white text-[10px] px-1.5 py-0">
                              新
                            </Badge>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-red-500"
                          onClick={() => {
                            setChapterCharacters(prev => prev.filter((c) => c.id !== char.id));
                          }}
                          disabled={char.id === "narrator"}
                        >
                          ×
                        </Button>
                      </div>
                      
                      {/* 性别和角色类型 */}
                      <div className="grid grid-cols-2 gap-2 mb-3">
                        <Select
                          value={char.gender}
                          onValueChange={(value) => {
                            if (!value) return;
                            setChapterCharacters(prev => prev.map((c) => 
                              c.id === char.id ? { ...c, gender: value as "male" | "female" | "unknown" } : c
                            ));
                          }}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <span>{char.gender === "male" ? "男" : char.gender === "female" ? "女" : "未知"}</span>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="male" className="text-xs">男</SelectItem>
                            <SelectItem value="female" className="text-xs">女</SelectItem>
                            <SelectItem value="unknown" className="text-xs">未知</SelectItem>
                          </SelectContent>
                        </Select>
                        
                        <Select
                          value={char.type}
                          onValueChange={(value) => {
                            if (!value) return;
                            setChapterCharacters(prev => prev.map((c) => 
                              c.id === char.id ? { ...c, type: value as "narrator" | "protagonist" | "supporting" | "antagonist" | "other" } : c
                            ));
                          }}
                          disabled={char.id === "narrator"}
                        >
                          <SelectTrigger className={`h-8 text-xs ${char.id === "narrator" ? "bg-blue-100/50" : ""}`}>
                            <span>
                              {char.type === "narrator" ? "旁白" : 
                               char.type === "protagonist" ? "主角" : 
                               char.type === "supporting" ? "配角" : 
                               char.type === "antagonist" ? "反派" : "其他"}
                            </span>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="narrator" className="text-xs">旁白</SelectItem>
                            <SelectItem value="protagonist" className="text-xs">主角</SelectItem>
                            <SelectItem value="supporting" className="text-xs">配角</SelectItem>
                            <SelectItem value="antagonist" className="text-xs">反派</SelectItem>
                            <SelectItem value="other" className="text-xs">其他</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      {/* 音色选择和试听 */}
                      <div className="flex items-center gap-2">
                        <Select
                          value={char.voiceId || ""}
                          onValueChange={(value) => {
                            setChapterCharacters(prev => prev.map((c) => 
                              c.id === char.id ? { ...c, voiceId: value || undefined } : c
                            ));
                          }}
                        >
                          <SelectTrigger className={`h-8 text-xs flex-1 ${char.id === "narrator" && !char.voiceId ? "border-red-300 bg-red-50" : ""}`}>
                            <span className={`${char.id === "narrator" ? "text-blue-600 font-medium" : "text-gray-500"}`}>
                              {char.id === "narrator" ? "旁白音色" : "音色"}: 
                            </span>
                            <span className={`ml-1 ${!char.voiceId ? "text-red-500" : ""}`}>
                              {(project?.voiceConfig?.defaultService === "baidu" ? BAIDU_VOICES : EDGE_VOICES).find(v => v.id === char.voiceId)?.name || (char.id === "narrator" ? "【必须选择】" : "未选择")}
                            </span>
                          </SelectTrigger>
                        <SelectContent className="max-h-[400px] w-[420px]">
                          {project?.voiceConfig?.defaultService === "baidu" ? (
                            // 百度 TTS 音色列表
                            <>
                              <div className="px-2 py-1 text-xs font-semibold text-amber-600">⭐ 推荐（适合小说）</div>
                              {BAIDU_VOICES.filter(v => ["baidu-3", "baidu-4", "baidu-4003", "baidu-4117", "baidu-4196"].includes(v.id)).map(v => (
                                <SelectItem key={v.id} value={v.id} className="text-xs py-2">
                                  <span className="font-medium">{v.name}</span>
                                  <span className="text-gray-500 ml-2">{v.description}</span>
                                </SelectItem>
                              ))}
                              <div className="px-2 py-1 text-xs font-semibold text-blue-600 mt-1">🎙️ 男声</div>
                              {BAIDU_VOICES.filter(v => v.category === "男声" && !["baidu-3", "baidu-4003"].includes(v.id)).map(v => (
                                <SelectItem key={v.id} value={v.id} className="text-xs py-2">
                                  <span className="font-medium">{v.name}</span>
                                  <span className="text-gray-500 ml-2">{v.description}</span>
                                </SelectItem>
                              ))}
                              <div className="px-2 py-1 text-xs font-semibold text-pink-600 mt-1">🎙️ 女声</div>
                              {BAIDU_VOICES.filter(v => v.category === "女声" && !["baidu-4", "baidu-4117", "baidu-4196"].includes(v.id)).map(v => (
                                <SelectItem key={v.id} value={v.id} className="text-xs py-2">
                                  <span className="font-medium">{v.name}</span>
                                  <span className="text-gray-500 ml-2">{v.description}</span>
                                </SelectItem>
                              ))}
                              <div className="px-2 py-1 text-xs font-semibold text-green-600 mt-1">👶 童声</div>
                              {BAIDU_VOICES.filter(v => v.category === "童声").map(v => (
                                <SelectItem key={v.id} value={v.id} className="text-xs py-2">
                                  <span className="font-medium">{v.name}</span>
                                  <span className="text-gray-500 ml-2">{v.description}</span>
                                </SelectItem>
                              ))}
                              <div className="px-2 py-1 text-xs font-semibold text-purple-600 mt-1">🗣️ 方言</div>
                              {BAIDU_VOICES.filter(v => v.category === "方言").map(v => (
                                <SelectItem key={v.id} value={v.id} className="text-xs py-2">
                                  <span className="font-medium">{v.name}</span>
                                  <span className="text-gray-500 ml-2">{v.description}</span>
                                </SelectItem>
                              ))}
                            </>
                          ) : (
                            // Edge TTS 音色列表
                            <>
                              <div className="px-2 py-1 text-xs font-semibold text-gray-500">男声</div>
                              {EDGE_VOICES.filter(v => v.gender === "male").map(v => (
                                <SelectItem key={v.id} value={v.id} className="text-xs py-2">
                                  <span className="font-medium">{v.name}</span>
                                  <span className="text-gray-500 ml-2">{v.description}</span>
                                </SelectItem>
                              ))}
                              <div className="px-2 py-1 text-xs font-semibold text-gray-500 mt-1">女声</div>
                              {EDGE_VOICES.filter(v => v.gender === "female").map(v => (
                                <SelectItem key={v.id} value={v.id} className="text-xs py-2">
                                  <span className="font-medium">{v.name}</span>
                                  <span className="text-gray-500 ml-2">{v.description}</span>
                                </SelectItem>
                              ))}
                            </>
                          )}
                        </SelectContent>
                        </Select>
                        {/* 试听按钮 */}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          disabled={!char.voiceId || charPreviewLoading === char.id}
                          onClick={() => char.voiceId && playCharacterPreview(char.id, char.voiceId)}
                          title={char.voiceId ? "试听音色" : "请先选择音色"}
                        >
                          {charPreviewLoading === char.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : charPreviewPlaying === char.id ? (
                            <Pause className="w-4 h-4 text-blue-600" />
                          ) : (
                            <Play className="w-4 h-4 text-gray-500" />
                          )}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
              
              <div className="p-4 border-t bg-white space-y-3">
                {/* 进度条 */}
                {(dubbingChapter || dubbingProgress.total > 0) && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">
                        {dubbingChapter ? "正在生成" : "生成进度"}: {dubbingProgress.current} / {dubbingProgress.total}
                      </span>
                      <span className="text-blue-600 font-medium">
                        {Math.round((dubbingProgress.current / dubbingProgress.total) * 100)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                      <div 
                        className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                        style={{ width: `${(dubbingProgress.current / dubbingProgress.total) * 100}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-500 truncate" title={dubbingProgress.currentText}>
                      {dubbingProgress.currentText}
                    </p>
                  </div>
                )}
                
                {/* 失败段落列表 */}
                {failedSegments.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-sm font-medium text-red-600 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      {failedSegments.length} 个段落生成失败
                    </div>
                    <div className="max-h-32 overflow-y-auto space-y-1 text-xs">
                      {failedSegments.map((seg) => (
                        <div key={seg.index} className="flex items-center justify-between p-2 bg-red-50 rounded">
                          <div className="flex-1 min-w-0">
                            <span className="font-medium">段落 {seg.index + 1}</span>
                            <span className="text-gray-500 ml-2 truncate block" title={seg.error}>
                              {seg.error.substring(0, 50)}...
                            </span>
                          </div>
                          {seg.retryable && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 text-xs text-blue-600"
                              onClick={() => startDubbing([seg.index])}
                              disabled={dubbingChapter}
                            >
                              重试
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                    {failedSegments.some(s => s.retryable) && (
                      <Button
                        className="w-full"
                        variant="outline"
                        size="sm"
                        onClick={() => startDubbing(failedSegments.filter(s => s.retryable).map(s => s.index))}
                        disabled={dubbingChapter}
                      >
                        <RotateCcw className="w-4 h-4 mr-1" />
                        重试所有失败段落
                      </Button>
                    )}
                  </div>
                )}
                
                <Button 
                  className="w-full" 
                  onClick={() => startDubbing()} 
                  disabled={dubbingChapter || failedSegments.length === chapterParagraphs.length} 
                  size="lg"
                >
                  {dubbingChapter ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Mic className="w-4 h-4 mr-2" />}
                  {dubbingChapter ? "配音中..." : failedSegments.length > 0 ? "继续配音" : "开始配音"}
                </Button>
                <Button variant="outline" className="w-full" onClick={() => setChapterDialogOpen(false)} disabled={dubbingChapter}>
                  返回章节列表
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
