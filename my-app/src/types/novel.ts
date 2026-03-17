/**
 * 小说 AI Agent - 类型定义
 * 基于 novel_agent.md 设计文档
 */

// ==================== 阶段类型 ====================

export type NovelStage =
  | "bible_meta"          // 1.1 填写基本信息
  | "bible_characters"    // 1.2 填写人物
  | "bible_factions"      // 1.3 填写势力
  | "bible_instances"     // 1.4 填写副本/地点
  | "bible_climaxes"      // 1.5 填写高潮场景
  | "outline"             // 2. 大纲与时间线
  | "chapter_outlines"    // 3. 章节大纲
  | "section_lists"       // 4. 小节列表
  | "writing"             // 5. 正文写作
  | "completed"           // 完成
  // 续写流程阶段
  | "continuation_input"     // 6.1 读取输入文件
  | "continuation_analysis"  // 6.2 分析已有内容
  | "continuation_bible"     // 6.3 同步圣经设定
  | "continuation_outline"   // 6.4 生成续写大纲
  | "continuation_chapters"  // 6.5 续写章节规划
  | "continuation_writing";  // 6.6 续写正文

// ==================== 项目结构 ====================

export interface NovelProject {
  id: string;                      // UUID
  title: string;                   // 小说标题
  createdAt: string;               // ISO 8601
  updatedAt: string;               // ISO 8601
  currentStage: NovelStage;
  bible: NovelBible;
  outline: NovelOutline | null;
  chapters: Chapter[];
  settings: ProjectSettings;
  foreshadowings: Foreshadowing[]; // 伏笔列表
  
  // 续写相关
  continuation?: ContinuationContext;  // 续写上下文
  projectType: "original" | "continuation";  // 项目类型：原创/续写
  sourceMaterial?: SourceMaterial;  // 续写项目的源材料信息
  
  // 有声小说相关
  voiceConfig?: ProjectVoiceConfig;           // 语音配置
  audioTasks?: AudioGenerationTask[];         // 音频生成任务历史
  discoveredCharacters?: DiscoveredCharacter[]; // 发现的人物列表（自动收集）
}

// ==================== 续写功能 ====================

export interface ContinuationContext {
  isActive: boolean;              // 是否处于续写模式
  continuationNumber: number;     // 第几次续写
  inputFiles: InputFile[];        // 输入文件列表
  analysisResult?: AnalysisResult;  // AI分析结果
  previousWorkSummary?: string;   // 前作总结
}

export interface SourceMaterial {
  originalTitle: string;          // 原作标题
  originalAuthor?: string;        // 原作作者（可选）
  totalChapters?: number;         // 原作总章节数
  totalWordCount?: number;        // 原作总字数
  inputFiles: InputFile[];        // 输入文件列表
  importDate: string;             // 导入日期
}

export interface InputFile {
  id: string;
  filename: string;
  type: "txt" | "md";
  size: number;
  content: string;      // 文件内容（限制长度，完整内容存文件）
  uploadedAt: string;
  processed: boolean;
}

export interface AnalysisResult {
  // 整体分析结果
  worldSummary: string;
  characters: AnalyzedCharacter[];
  unresolvedPlots: string[];
  resolvedPlots: string[];
  factions: string[];
  keyLocations: string[];
  timeline: string[];
  themes: string[];
  tone: string;
  suggestedContinuation: string;
  analyzedAt: string;
  
  // 分层分析详情
  chunkAnalysis: ChunkAnalysis[];  // 章节/片段级分析
  summaryAnalysis: SummaryAnalysis; // 汇总分析
  processingStatus: "processing" | "completed" | "failed";
  progress: number;  // 分析进度 0-100
}

// 文本片段分析（章节或分段）
export interface ChunkAnalysis {
  id: string;
  index: number;           // 序号
  title?: string;          // 章节标题（如果有）
  content: string;         // 内容摘要（前500字）
  wordCount: number;       // 字数
  summary: string;         // AI生成的摘要
  characters: string[];    // 本章节出现的角色
  events: string[];        // 本章节的关键事件
  locations: string[];     // 本章节出现的地点
  foreshadowing: string[]; // 本章节埋下的伏笔
  emotionalTone: string;   // 情感基调
}

// 汇总分析
export interface SummaryAnalysis {
  totalChunks: number;           // 总片段数
  totalWordCount: number;        // 总字数
  mainPlot: string;              // 主线剧情
  characterArcs: CharacterArc[]; // 角色成长线
  plotThreads: PlotThread[];     // 剧情线索
  worldBuilding: WorldBuilding;  // 世界观构建
}

export interface CharacterArc {
  characterName: string;
  initialState: string;    // 初始状态
  finalState: string;      // 最终状态
  keyEvents: string[];     // 关键成长事件
  arcType: "growth" | "decline" | "flat" | "transformation";
}

export interface PlotThread {
  name: string;
  description: string;
  status: "resolved" | "unresolved" | "ongoing";
  relatedChunks: number[]; // 涉及的片段序号
  importance: "main" | "sub" | "minor";
}

export interface WorldBuilding {
  setting: string;         // 时空背景
  rules: string[];         // 世界规则
  organizations: string[]; // 组织势力
  keyItems: string[];      // 关键物品
}

export interface AnalyzedCharacter {
  name: string;
  role: "protagonist" | "supporting" | "antagonist";
  description: string;
  currentState: string;
  arcDirection: string;
}

/**
 * 记忆等级（上下文窗口控制）
 * Level 1: 基础记忆 - 节省Token，快速生成
 * Level 2: 标准记忆 - 平衡质量与速度
 * Level 3: 增强记忆 - 更好的连贯性
 * Level 4: 完整记忆 - 深度上下文理解
 * Level 5: 最强记忆 - 极致一致性体验
 */
export type MemoryLevel = 1 | 2 | 3 | 4 | 5;

export interface ProjectSettings {
  // 模型配置现在从环境变量读取，这里只保留只读信息
  settingModel: string;              // 设定模型（从环境变量读取）
  writingModel: string;              // 章节撰写模型（从环境变量读取）
  language: "zh" | "en";
  sectionWordCountMin: number;       // 默认 500
  sectionWordCountMax: number;       // 默认 1500
  autoSaveEnabled: boolean;
  streamingEnabled: boolean;
  memoryLevel: MemoryLevel;          // 记忆等级 1-5，控制上下文注入详细程度
  maxTokens: number;                 // 最大 Token 数（默认 4096）
}

// ==================== 小说预设 ====================

export interface NovelBible {
  meta: NovelMeta;
  characters: Character[];
  factions: Faction[];
  instances: NovelInstance[];
  climaxScenes: ClimaxScene[];
}

export interface NovelMeta {
  title: string;
  genre: string;
  tone: string;
  targetAudience: string;
  wordCountTarget: number;
  synopsis: string;
  themes: string[];
  writingStyleSample?: string;
}

export interface Character {
  id: string;
  name: string;
  role: "protagonist" | "supporting" | "antagonist" | "neutral";
  age?: string;
  gender?: string;
  appearance: string;
  personality: string;
  backstory: string;
  abilities: string;
  motivation: string;
  arc: string;
  relationships: Record<string, string>;  // characterId -> 关系描述
  currentState?: string;
}

export interface Faction {
  id: string;
  name: string;
  type: string;
  alignment: "good" | "evil" | "neutral" | "chaotic";
  scale: "small" | "medium" | "large" | "super";
  goal: string;
  characteristics: string;
  hierarchy: string;
  relations: Record<string, string>;  // factionId -> 关系描述
  keyMembers: string[];               // characterId 列表
}

export interface NovelInstance {
  id: string;
  name: string;
  type: string;
  location: string;
  features: string;
  resources: string;
  appearsInChapters?: string;
  relatedPlots: string;
}

export interface ClimaxScene {
  id: string;
  name: string;
  type: string;
  charactersInvolved: string[];  // characterId 列表
  location: string;              // instanceId
  emotionalTone: string;
  description: string;
  impact: string;
  targetPosition: string;        // 大概位置描述
}

// ==================== 大纲 ====================

export interface NovelOutline {
  mainArc: string;
  subplots: Subplot[];
  volumes: Volume[];
  timeline: TimelineEvent[];
}

export interface Subplot {
  id: string;
  name: string;
  description: string;
  relatedCharacters: string[];
  relatedFactions: string[];
}

export interface Volume {
  id: string;
  number: number;
  title: string;
  coreEvent: string;
  wordCountTarget: number;
  chapterCount: number;
  summary: string;
}

/**
 * 卷配置（用于生成大纲时指定各卷参数）
 */
export interface VolumeConfig {
  wordCountTarget: number;
  chapterCount: number;
}

export interface TimelineEvent {
  id: string;
  timePoint: string;
  eventName: string;
  description: string;
  characters: string[];   // characterId 列表
  location?: string;      // instanceId
  impact: string;
}

// ==================== 章节与小节 ====================

export interface Chapter {
  id: string;
  volumeNumber: number;
  chapterNumber: number;          // 全书章节序号
  chapterNumberInVolume: number;  // 卷内章节序号
  title: string;
  wordCountTarget: number;
  summary: string;
  keyEvents: ChapterKeyEvent[];
  openingHook: string;
  closingHook: string;
  foreshadowing: string;
  characterStateChanges: CharacterStateChange[];
  outlineStatus: "pending" | "generated" | "confirmed";
  sections: Section[];
}

export interface ChapterKeyEvent {
  order: number;
  description: string;
  characters: string[];
  location?: string;
  emotionalBeat: string;
}

export interface Section {
  id: string;
  volumeNumber: number;
  chapterNumber: number;
  sectionNumber: number;          // 章内小节序号
  title?: string;
  wordCountTarget: number;
  pov?: string;                   // characterId
  sceneTime: string;              // 场景时间
  sceneLocation: string;          // 场景地点
  contentSummary: string;
  emotionalBeat: string;
  writingNotes?: string;
  content?: string;               // 已生成/编辑的正文
  wordCount?: number;
  contentStatus: "pending" | "generating" | "generated" | "confirmed";
  generatedAt?: string;
  confirmedAt?: string;
}

export interface CharacterStateChange {
  characterId: string;
  changeDescription: string;
}

// ==================== 伏笔追踪 ====================

export interface Foreshadowing {
  id: string;
  content: string;                    // 伏笔内容描述
  plantedInChapter?: number;          // 埋下的章节号
  plantedInSection?: number;          // 埋下的小节号
  plantedAt: string;                  // 创建时间 ISO 8601
  resolvedInChapter?: number;         // 回收的章节号
  resolvedInSection?: number;         // 回收的小节号
  resolvedAt?: string;                // 回收时间 ISO 8601
  status: "planted" | "resolved" | "pending";  // 状态
  importance: "minor" | "major" | "critical";  // 重要程度
  notes?: string;                     // 备注
}

// ==================== API 请求/响应类型 ====================

export interface CreateProjectRequest {
  title: string;
  meta?: Partial<NovelMeta>;
}

export interface UpdateProjectRequest {
  title?: string;
  currentStage?: NovelStage;
  bible?: Partial<NovelBible>;
  outline?: NovelOutline;
  chapters?: Chapter[];
  settings?: Partial<ProjectSettings>;
}

export interface GenerateRequest {
  projectId: string;
  stage: NovelStage;
  context?: Record<string, unknown>;
}

export interface StreamingResponse {
  type: "text_delta" | "generation_start" | "generation_end" | "error";
  data: {
    delta?: string;
    fullText?: string;
    parsedData?: unknown;
    error?: string;
  };
}

// ==================== 写作上下文 ====================

export interface SectionWritingContext {
  section: Section;
  previousSectionEnding?: string;
  previousSections?: Section[];  // 前序小节完整内容（用于Level 4+记忆）
  chapterProgress: string;
  povCharacter?: Character;
  involvedCharacters: Character[];
  location?: NovelInstance;
  bible: NovelBible;
  chapter: Chapter;
  writingStyleSample?: string;
}

// ==================== 有声小说功能 ====================

/**
 * 支持的TTS服务商
 */
export type TTSService = 
  | "elevenlabs" 
  | "openai" 
  | "aliyun" 
  | "baidu" 
  | "tencent" 
  | "edge";

/**
 * 音色选项
 */
export interface VoiceOption {
  id: string;
  name: string;
  gender: "male" | "female" | "neutral";
  language: string[];
  description?: string;
  previewUrl?: string;
}

/**
 * 角色声音配置
 */
export interface CharacterVoice {
  characterId: string;           // 角色ID，"narrator"表示旁白
  characterName: string;         // 角色名称显示
  characterType: "narrator" | "hero" | "heroine" | "supporting" | "villain" | "other";
  
  // TTS配置
  service: TTSService;           // 使用的TTS服务
  voiceId: string;               // 音色ID（各服务商定义）
  
  // 声音参数
  speed?: number;                // 语速: 0.5-2.0 (默认1.0)
  pitch?: number;                // 音调: -10 to 10 (默认0)
  volume?: number;               // 音量: 0-100 (默认100)
  
  // 情感/风格（服务商支持）
  emotion?: string;              // 情感: calm, excited, sad, angry等
  style?: string;                // 风格描述
}

/**
 * 项目语音配置
 */
export interface ProjectVoiceConfig {
  maxCharacters: number;         // 最大角色数 (5-15，默认10)
  characters: CharacterVoice[];  // 角色声音配置列表
  defaultService: TTSService;    // 默认TTS服务
  pauseBetweenLines: number;     // 段落间隔(ms，默认500)
}

/**
 * 发现的人物（写作阶段自动收集）
 */
export interface DiscoveredCharacter {
  id: string;
  name: string;
  firstAppearChapter?: number;
  firstAppearSection?: number;
  mentionCount: number;
}

/**
 * 解析后的音频段落
 */
export interface ParsedAudioSegment {
  id: string;
  order: number;                 // 顺序
  characterId: string;           // 角色ID
  characterName: string;         // 角色名称
  type: "narration" | "dialogue"; // 旁白或对话
  text: string;                  // 原文
  processedText: string;         // 处理后文本（用于TTS）
}

/**
 * 音频生成任务
 */
export interface AudioGenerationTask {
  id: string;
  projectId: string;
  chapterId: string;
  sectionId: string;
  
  // 输入
  parsedSegments: ParsedAudioSegment[];
  
  // 输出
  segmentAudioFiles: {          // 各段落音频文件
    segmentId: string;
    audioUrl: string;
    duration: number;
  }[];
  
  // 合并后
  mergedAudioUrl?: string;      // 合并后的完整音频
  totalDuration?: number;       // 总时长(秒)
  
  // 状态
  status: "pending" | "parsing" | "generating" | "merging" | "completed" | "failed";
  progress: number;             // 0-100
  error?: string;
  
  createdAt: string;
  updatedAt: string;
}
