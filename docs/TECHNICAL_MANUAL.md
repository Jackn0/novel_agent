# Novel AI Agent 技术手册

> **版本**: v1.0  
> **最后更新**: 2026-03-17  
> **作者**: @Jackno

---

## 📑 目录

1. [项目概述](#1-项目概述)
2. [系统架构](#2-系统架构)
3. [核心模块详解](#3-核心模块详解)
4. [数据模型](#4-数据模型)
5. [API 参考](#5-api-参考)
6. [配置指南](#6-配置指南)
7. [部署指南](#7-部署指南)
8. [开发指南](#8-开发指南)
9. [故障排除](#9-故障排除)

---

## 1. 项目概述

### 1.1 项目简介

Novel AI Agent 是一个面向中文网络文学作者的 AI 辅助创作平台，提供从**世界观构建**到**有声书制作**的全流程解决方案。

### 1.2 设计理念

- **AI 先行，用户审校**: 每阶段由 AI 生成初稿，用户确认后进入下一阶段
- **渐进式创作**: 从宏观到微观，降低创作门槛
- **一致性优先**: 通过"小说预设"系统维护人物、地点、伏笔的一致性
- **功能整合**: 写作与有声书制作无缝衔接

### 1.3 功能矩阵

| 功能模块 | 子功能 | 状态 |
|---------|--------|------|
| **小说创作** | 五阶段渐进创作 | ✅ |
| | 多角色有声书 | ✅ |
| | 智能续写 | ✅ |
| | 5级 AI 记忆 | ✅ |
| | 导出功能 | 🚧 |
| **有声书** | Edge TTS | ✅ |
| | 百度 TTS | ✅ |
| | 多角色配音 | ✅ |
| | 音频合并 | ✅ |
| | 阿里云 CosyVoice | 🚧 |

---

## 2. 系统架构

### 2.1 架构图

```
┌─────────────────────────────────────────────────────────────┐
│                        前端层 (Next.js)                      │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────────────────┐ │
│  │ 项目管理页   │ │  创作编辑页  │ │     有声书制作页        │ │
│  └─────────────┘ └─────────────┘ └─────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                       API 路由层                             │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────────────────┐ │
│  │ 项目 API    │ │  LLM API    │ │      TTS API            │ │
│  │ /projects   │ │  /generate  │ │   /generate/multirole   │ │
│  └─────────────┘ └─────────────┘ └─────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                      服务层 (Services)                       │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────────────────┐ │
│  │ LLM Service │ │  TTS Service│ │    Project Service      │ │
│  │ (多模型支持) │ │ (多引擎支持) │ │   (JSON 文件存储)       │ │
│  └─────────────┘ └─────────────┘ └─────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                       外部服务                              │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐            │
│  │ Anthropic   │ │ DeepSeek/   │ │ 百度/阿里   │            │
│  │ Claude API  │ │ Moonshot    │ │ TTS API     │            │
│  └─────────────┘ └─────────────┘ └─────────────┘            │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 技术栈

| 层级 | 技术 | 版本 | 用途 |
|-----|------|------|------|
| 前端框架 | Next.js | 16.1.6 | React 全栈框架 |
| UI 框架 | React | 18+ | 组件库 |
| 样式 | Tailwind CSS | 3.x | 原子化 CSS |
| 组件 | shadcn/ui | latest | 基础组件库 |
| 语言 | TypeScript | 5.x | 类型安全 |
| 后端 | Next.js API Routes | 16.1.6 | RESTful API |
| 存储 | 文件系统 | - | JSON 文件存储 |
| 音频处理 | FFmpeg | 5.x+ | 音频合并、格式转换 |
| TTS | edge-tts | latest | 本地 TTS 生成 |

### 2.3 目录结构

```
my-app/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/                # API 路由
│   │   │   └── projects/
│   │   │       └── [id]/
│   │   │           ├── generate/
│   │   │           │   ├── outline/route.ts      # 大纲生成
│   │   │           │   ├── chapters/route.ts     # 章节生成
│   │   │           │   ├── subsections/route.ts  # 小节生成
│   │   │           │   ├── body/route.ts         # 正文生成
│   │   │           │   ├── multirole-segment/route.ts  # 音频分段
│   │   │           │   └── multirole-merge/route.ts    # 音频合并
│   │   │           └── route.ts                  # 项目 CRUD
│   │   ├── projects/           # 项目管理页面
│   │   ├── project/[id]/       # 创作编辑页面
│   │   ├── audiobook/[id]/     # 有声书制作页面
│   │   └── settings/           # 设置页面
│   ├── components/             # 共享组件
│   │   ├── ui/                 # shadcn/ui 组件
│   │   └── ...                 # 业务组件
│   ├── lib/                    # 工具库
│   │   ├── llm/                # LLM 服务封装
│   │   │   ├── index.ts        # 主入口
│   │   │   ├── anthropic.ts    # Claude 支持
│   │   │   ├── openai.ts       # OpenAI 兼容 API
│   │   │   └── deepseek.ts     # DeepSeek 特定处理
│   │   ├── tts/                # TTS 服务封装
│   │   │   ├── index.ts        # 统一接口
│   │   │   ├── edge.ts         # Edge TTS
│   │   │   └── baidu.ts        # 百度 TTS
│   │   └── utils.ts            # 通用工具
│   └── types/                  # TypeScript 类型定义
│       └── index.ts            # 全局类型
├── data/                       # 数据存储（运行时生成）
│   └── projects/               # 项目 JSON 文件
├── output/                     # 音频输出目录
│   └── 有声小说-{title}/       # 按项目组织
├── public/                     # 静态资源
└── package.json                # 依赖配置
```

---

## 3. 核心模块详解

### 3.1 小说创作模块

#### 3.1.1 五阶段创作流程

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  1. 小说预设  │ ──▶ │  2. 大纲规划  │ ──▶ │  3. 章节目录  │
│   (Bible)    │     │   (Outline)  │     │  (Chapters)  │
└──────────────┘     └──────────────┘     └──────────────┘
                                                   │
┌──────────────┐     ┌──────────────┐              │
│  5. 正文写作  │ ◀── │ 4. 小节列表   │ ◀─────────────┘
│   (Body)     │     │(Subsections) │
└──────────────┘     └──────────────┘
```

**各阶段说明**:

| 阶段 | 输入 | 输出 | AI 角色 |
|-----|------|------|---------|
| 1. 小说预设 | 用户填写 | Bible JSON | 提供模板建议 |
| 2. 大纲规划 | Bible | 故事大纲 | 生成完整大纲 |
| 3. 章节目录 | 大纲 | 章节列表 | 规划章节结构 |
| 4. 小节列表 | 章节 | 小节列表 | 细化每章内容 |
| 5. 正文写作 | 小节信息 | 正文段落 | 逐段生成正文 |

#### 3.1.2 AI 记忆等级系统

```typescript
// lib/llm/index.ts
export interface MemoryLevel {
  level: 1 | 2 | 3 | 4 | 5;
  maxCharacters: number;
  description: string;
  cost: '低' | '中低' | '中' | '中高' | '高';
}

export const MEMORY_LEVELS: MemoryLevel[] = [
  { level: 1, maxCharacters: 2000, description: "基础记忆", cost: "低" },
  { level: 2, maxCharacters: 5000, description: "进阶记忆", cost: "中低" },
  { level: 3, maxCharacters: 10000, description: "标准记忆", cost: "中" },
  { level: 4, maxCharacters: 20000, description: "高级记忆", cost: "中高" },
  { level: 5, maxCharacters: 40000, description: "最强记忆", cost: "高" },
];
```

**记忆内容包含**:
- 小说预设（Bible）完整内容
- 已完成章节的概要
- 关键人物当前状态
- 伏笔回收状态
- 当前章节上下文

### 3.2 有声书模块

#### 3.2.1 多角色配音流程

```
┌────────────────────────────────────────────────────────────┐
│                     多角色配音流程                          │
└────────────────────────────────────────────────────────────┘
                              │
                    ┌─────────┴─────────┐
                    ▼                   ▼
          ┌─────────────────┐  ┌─────────────────┐
          │  文本预处理      │  │   角色识别      │
          │  分段/清洗      │  │  匹配角色库     │
          └─────────────────┘  └─────────────────┘
                    │                   │
                    └─────────┬─────────┘
                              ▼
                    ┌─────────────────┐
                    │   角色音色分配   │
                    │ 旁白/角色 → 音色 │
                    └─────────────────┘
                              │
                              ▼
            ┌─────────────────────────────────┐
            │        并行音频生成              │
            │  ┌─────────┐ ┌─────────┐       │
            │  │ 段落 1  │ │ 段落 2  │ ...   │
            │  │ Voice A │ │ Voice B │       │
            │  └─────────┘ └─────────┘       │
            └─────────────────────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │   FFmpeg 合并    │
                    │ +0.2s 间隔静音  │
                    └─────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │   输出 MP3       │
                    │ 24kHz / 48kbps  │
                    └─────────────────┘
```

#### 3.2.2 角色识别与分配

```typescript
// types/index.ts
export interface Character {
  id: string;
  name: string;              // 角色名（如"萧炎"）
  aliases: string[];         // 别名（如"岩枭"）
  voiceId: string;           // 分配的音色ID
  isNew?: boolean;           // 是否为新增角色
  previewAudio?: string;     // 试听音频URL
}

export interface MultiRoleConfig {
  enabled: boolean;
  narratorVoiceId: string;   // 旁白色
  characters: Character[];   // 角色列表
  autoDetect: boolean;       // 自动识别新角色
}
```

**角色排序逻辑**:
1. 旁白（narrator）始终排在第一位
2. 已有角色按原始顺序排列
3. 新增角色（isNew=true）排在最后，带有"New"徽章

#### 3.2.3 TTS 服务抽象层

```typescript
// lib/tts/index.ts
export interface TTSGenerateParams {
  text: string;
  voiceId: string;
  service?: 'edge' | 'baidu' | 'aliyun' | 'elevenlabs' | 'openai';
  outputPath: string;
}

export interface TTSGenerateResult {
  success: boolean;
  filePath: string;
  duration?: number;
  error?: string;
}

// 统一接口
export async function generateTTS(params: TTSGenerateParams): Promise<TTSGenerateResult>;

// 自动检测服务
function detectService(voiceId: string): TTSProvider {
  if (voiceId.startsWith('baidu-')) return 'baidu';
  if (voiceId.startsWith('aliyun-')) return 'aliyun';
  // ...
  return 'edge';
}
```

### 3.3 LLM 服务模块

#### 3.3.1 多模型支持架构

```typescript
// lib/llm/index.ts
export type LLMProvider = 'anthropic' | 'openai' | 'deepseek' | 'moonshot';

export interface LLMConfig {
  apiKey: string;
  baseUrl?: string;
  model: string;
  maxTokens: number;
  temperature: number;
}

export interface GenerateParams {
  prompt: string;
  systemPrompt?: string;
  context?: string[];
  bible?: NovelBible;
}

// 工厂模式获取对应 provider
export function getLLMService(provider: LLMProvider): LLMService {
  switch (provider) {
    case 'anthropic': return new AnthropicService();
    case 'openai': return new OpenAIService();
    case 'deepseek': return new DeepSeekService();
    // ...
  }
}
```

#### 3.3.2 提示词工程

**系统提示词模板**（以正文写作为例）:

```typescript
// lib/llm/prompts/body.ts
export const BODY_SYSTEM_PROMPT = `你是一位专业的网络小说作家，正在创作小说《{title}》。

## 小说预设
{bibleContext}

## 当前章节
{chapterTitle}: {chapterSummary}

## 本节信息
{subsectionInfo}

## 上下文要求
- 已出场人物状态: {characterStates}
- 待回收伏笔: {pendingHooks}
- 前文摘要: {previousSummary}

## 输出要求
1. 按正文章节格式输出，使用【场景切换】或【段落分隔】标记场景变化
2. 对话使用"人物说：\"内容\""格式
3. 保持人物言行一致
4. 控制节奏，每段不宜过长
5. 自然融入伏笔回收或新伏笔铺垫

请根据以上信息，生成本节正文内容。`;
```

### 3.4 存储模块

#### 3.4.1 JSON 文件结构

```typescript
// data/projects/{projectId}.json
{
  "id": "uuid",
  "title": "斗破苍穹",
  "type": "original",  // or "continuation"
  
  // 小说预设（Bible）
  "bible": {
    "setting": "斗气大陆...",
    "characters": [
      { "name": "萧炎", "description": "...", "personality": "...", "currentStatus": "..." }
    ],
    "forces": [...],
    "locations": [...],
    "items": [...],
    "hooks": [...],
    "style": {...}
  },
  
  // 大纲
  "outline": "## 第一卷...",
  
  // 章节结构
  "chapters": [
    {
      "id": "uuid",
      "number": 1,
      "title": "陨落的天才",
      "summary": "...",
      "subsections": [
        { "id": "uuid", "number": 1, "title": "...", "summary": "...", "content": "..." }
      ]
    }
  ],
  
  // 有声书配置
  "multiRoleConfig": {
    "enabled": true,
    "narratorVoiceId": "zh-CN-YunxiNeural",
    "characters": [...]
  },
  
  // 元数据
  "createdAt": "2026-03-17T10:00:00Z",
  "updatedAt": "2026-03-17T14:30:00Z"
}
```

---

## 4. 数据模型

### 4.1 核心类型定义

```typescript
// types/index.ts

// ==================== 项目类型 ====================
export type ProjectType = 'original' | 'continuation';

export interface Project {
  id: string;
  title: string;
  type: ProjectType;
  bible?: NovelBible;
  outline?: string;
  chapters: Chapter[];
  multiRoleConfig?: MultiRoleConfig;
  continuationMeta?: ContinuationMeta;
  createdAt: string;
  updatedAt: string;
}

// ==================== Bible 结构 ====================
export interface NovelBible {
  setting: string;           // 世界观/背景设定
  characters: BibleCharacter[];
  forces: Force[];           // 势力/阵营
  locations: Location[];     // 地点/地图
  items: Item[];             // 重要物品
  hooks: Hook[];             // 伏笔
  style: WritingStyle;       // 文风设定
}

export interface BibleCharacter {
  name: string;
  aliases?: string[];
  description: string;
  personality: string;
  currentStatus: string;
  relationships?: Relationship[];
}

export interface Hook {
  id: string;
  description: string;
  plantedIn: string;         // 在哪个章节/位置埋下
  targetResolve: string;     // 计划在何处回收
  status: 'pending' | 'resolved' | 'abandoned';
}

export interface WritingStyle {
  narrative: string;         // 叙事风格（第一人称/第三人称）
  tone: string;              // 基调（严肃/轻松/黑暗等）
  pacing: string;            // 节奏（快节奏/慢热等）
  dialogueRatio: number;     // 对话比例 0-1
  descriptionStyle: string;  // 描写风格
}

// ==================== 章节结构 ====================
export interface Chapter {
  id: string;
  number: number;
  title: string;
  summary: string;
  subsections: Subsection[];
  createdAt: string;
  updatedAt: string;
}

export interface Subsection {
  id: string;
  number: number;
  title: string;
  summary: string;
  content?: string;          // 正文内容
  wordCount?: number;
  status: 'pending' | 'generated' | 'edited';
}

// ==================== 有声书配置 ====================
export interface MultiRoleConfig {
  enabled: boolean;
  narratorVoiceId: string;
  characters: Character[];
  autoDetect: boolean;
}

export interface Character {
  id: string;
  name: string;
  aliases: string[];
  voiceId: string;
  isNew?: boolean;
  previewAudio?: string;
}

// ==================== 续写元数据 ====================
export interface ContinuationMeta {
  sourceFile: string;        // 原始文件名
  totalChapters: number;     // 总章节数
  analyzedAt: string;        // 分析时间
  originalAuthor?: string;   // 原作者（如有）
}

// ==================== API 请求/响应 ====================
export interface GenerateOutlineRequest {
  bible: NovelBible;
  volumeRange?: { start: number; end: number };
}

export interface GenerateBodyRequest {
  chapterId: string;
  subsectionId: string;
  bible: NovelBible;
  context: string[];
  memoryLevel: number;
}

export interface GenerateSegmentRequest {
  text: string;
  voiceId: string;
  segmentIndex: number;
  characterName?: string;
}

export interface GenerateSegmentResponse {
  success: boolean;
  audioUrl: string;
  duration: number;
  error?: string;
}

export interface MergeAudioRequest {
  chapterId: string;
  audioSegments: string[];
}
```

---

## 5. API 参考

### 5.1 项目管理 API

#### 获取项目列表
```
GET /api/projects

Response: Project[]
```

#### 创建项目
```
POST /api/projects

Body: { title: string, type: ProjectType }

Response: Project
```

#### 获取项目详情
```
GET /api/projects/:id

Response: Project
```

#### 更新项目
```
PATCH /api/projects/:id

Body: Partial<Project>

Response: Project
```

#### 删除项目
```
DELETE /api/projects/:id

Response: { success: boolean }
```

### 5.2 生成 API

#### 生成大纲
```
POST /api/projects/:id/generate/outline

Body: { bible: NovelBible }

Response: { outline: string }
```

#### 生成章节
```
POST /api/projects/:id/generate/chapters

Body: { outline: string, volumeNumber: number }

Response: { chapters: Chapter[] }
```

#### 生成小节
```
POST /api/projects/:id/generate/subsections

Body: { chapterId: string }

Response: { subsections: Subsection[] }
```

#### 生成正文
```
POST /api/projects/:id/generate/body

Body: {
  chapterId: string,
  subsectionId: string,
  memoryLevel: number
}

Response: { content: string, wordCount: number }
```

### 5.3 有声书 API

#### 生成音频段落
```
POST /api/projects/:id/generate/multirole-segment

Body: {
  text: string,           // 要合成的文本
  voiceId: string,        // 音色ID
  segmentIndex: number,   // 段落索引（用于文件名）
  characterName?: string  // 角色名（可选）
}

Response: {
  success: boolean,
  audioUrl: string,       // 如 /audio/xxx.mp3
  duration: number        // 音频时长（秒）
}
```

**重试机制**:
- 最大重试次数：3 次
- 退避策略：指数退避（1s → 2s → 4s）
- 超时：30 秒

#### 合并音频
```
POST /api/projects/:id/generate/multirole-merge

Body: {
  chapterId: string,
  audioSegments: string[],  // 音频URL列表
  volume: number,           // 卷号
  chapterNumber: number     // 章节号
}

Response: {
  success: boolean,
  downloadUrl: string,      // 最终MP3下载链接
  duration: number,
  fileSize: number
}
```

**合并策略**:
- 使用 FFmpeg 进行合并
- 段落间插入 0.2s 静音（防止 MP3 边界截断）
- 重新编码：24kHz 采样率，48kbps 比特率
- 输出格式：单声道 MP3

#### 获取音色列表
```
GET /api/voices

Response: {
  edge: VoiceOption[],
  baidu: VoiceOption[],
  aliyun: VoiceOption[]
}

interface VoiceOption {
  id: string;
  name: string;
  gender: 'male' | 'female' | 'child';
  locale?: string;
  description?: string;
  category?: string;  // 如 "推荐", "男声", "女声", "童声", "方言"
}
```

### 5.4 续写 API

#### 分析现有小说
```
POST /api/projects/analyze-continuation

Body: {
  fileContent: string,    // 小说文本内容
  fileName: string
}

Response: {
  bible: NovelBible,      // 提取的设定
  lastChapter: number,    // 最后一章节号
  suggestions: string[]   // 续写建议
}
```

---

## 6. 配置指南

### 6.1 环境变量

```bash
# ==================== LLM API 配置（必选其一）====================

# Anthropic Claude
ANTHROPIC_API_KEY=sk-ant-api03-...

# OpenAI 兼容 API（支持 DeepSeek、Moonshot、SiliconFlow 等）
OPENAI_API_KEY=sk-...
OPENAI_BASE_URL=https://api.openai.com/v1

# ==================== 模型配置 ====================
SETTING_MODEL=gpt-4-turbo      # 用于设定阶段（需要强推理能力）
WRITING_MODEL=gpt-4-turbo      # 用于写作阶段

# ==================== 生成参数 ====================
MAX_TOKENS=4096                # 单次生成最大 token 数
MEMORY_LEVEL=3                 # 默认 AI 记忆等级 (1-5)

# ==================== TTS 配置（有声书功能）====================

# 默认 TTS 服务
DEFAULT_TTS_SERVICE=edge

# --- Edge TTS（免费，无需配置）---
# 无需 API Key，依赖 edge-tts Python 包

# --- 百度智能云 TTS ---
BAIDU_TTS_API_KEY=your_api_key
BAIDU_TTS_SECRET_KEY=your_secret_key

# --- 阿里云 TTS ---
ALIYUN_ACCESS_KEY_ID=...
ALIYUN_ACCESS_KEY_SECRET=...
ALIYUN_TTS_APPKEY=...

# --- ElevenLabs（国际）---
ELEVENLABS_API_KEY=...

# --- OpenAI TTS ---
OPENAI_TTS_API_KEY=...

# ==================== 音频生成配置 ====================
MAX_CONCURRENT_AUDIO_REQUESTS=3    # 最大并发音频请求数
DEFAULT_AUDIO_PAUSE_MS=500         # 段落间默认停顿（毫秒）
```

### 6.2 模型推荐

| 阶段 | 推荐模型 | 说明 |
|-----|---------|------|
| 大纲/设定 | Claude 3.5 Sonnet | 长文本理解能力强 |
| 正文写作 | DeepSeek V3 | 中文写作优秀，成本低 |
| 正文写作 | GPT-4 Turbo | 质量最高，成本较高 |
| 快速测试 | GPT-3.5 Turbo | 速度快，成本低 |

### 6.3 记忆等级选择指南

| 等级 | 适用场景 | Token 消耗 |
|-----|---------|-----------|
| 1 | 短篇小说（<10万字） | 低 |
| 2 | 中篇小说（10-50万字） | 中低 |
| 3 | 长篇小说（50-100万字） | 中 |
| 4 | 超长篇/复杂设定 | 中高 |
| 5 | 极端情况 | 高 |

---

## 7. 部署指南

### 7.1 开发环境

```bash
# 1. 克隆仓库
git clone https://github.com/Jackno/Novel-AI-Agent.git
cd Novel-AI-Agent/my-app

# 2. 安装依赖
npm install

# 3. 安装 FFmpeg（Windows）
# 方法1：使用 chocolatey
choco install ffmpeg

# 方法2：下载并添加到 PATH
# https://ffmpeg.org/download.html

# 方法3：在 Ubuntu/Debian
sudo apt-get install ffmpeg

# 4. 安装 edge-tts（Python）
pip install edge-tts

# 5. 配置环境变量
cp .env.example .env.local
# 编辑 .env.local 填入 API Key

# 6. 启动开发服务器
npm run dev
```

### 7.2 生产环境部署

#### 使用 Docker

```dockerfile
# Dockerfile
FROM node:18-alpine

# 安装 FFmpeg
RUN apk add --no-cache ffmpeg python3 py3-pip

# 安装 edge-tts
RUN pip3 install edge-tts

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
```

```bash
# 构建并运行
docker build -t novel-ai-agent .
docker run -p 3000:3000 --env-file .env.local novel-ai-agent
```

#### 使用 Vercel

```bash
# 安装 Vercel CLI
npm i -g vercel

# 部署
vercel --prod
```

> 注意：Vercel Serverless 环境对音频生成功能有限制，建议自建服务器或使用 Docker 部署。

### 7.3 数据持久化

默认使用文件系统存储，数据位于 `data/projects/` 和 `output/` 目录。

**备份策略**:
```bash
# 定时备份脚本 (backup.sh)
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
tar -czf "backup_$DATE.tar.gz" data/ output/
# 上传至云存储...
```

---

## 8. 开发指南

### 8.1 开发规范

#### 代码风格
- 使用 TypeScript 严格模式
- 优先使用 `async/await` 处理异步
- API 错误使用 `{ success: false, error: string }` 格式返回

#### 文件组织
```
新增功能模块时：
1. 类型定义 → types/index.ts
2. API 路由 → app/api/[feature]/route.ts
3. 服务逻辑 → lib/[feature]/
4. UI 组件 → app/[feature]/page.tsx 或 components/
```

### 8.2 添加新的 TTS 提供商

以添加阿里云 TTS 为例：

```typescript
// 1. 实现服务适配器 lib/tts/aliyun.ts
export async function generateAliyunTTS(params: TTSGenerateParams): Promise<TTSGenerateResult> {
  // 实现阿里云 API 调用
}

// 2. 在 lib/tts/index.ts 中注册
import { generateAliyunTTS } from './aliyun';

export async function generateTTS(params: TTSGenerateParams): Promise<TTSGenerateResult> {
  switch (detectedService) {
    case 'aliyun': return await generateAliyunTTS(params);
    // ...
  }
}

// 3. 在 app/api/voices/route.ts 添加音色列表
const aliyunVoices = [
  { id: 'aliyun-xiaoyun', name: '小云', gender: 'female', category: '推荐' },
  // ...
];

// 4. 更新环境变量文档
```

### 8.3 调试技巧

```typescript
// 开启详细日志
const DEBUG = process.env.DEBUG === 'true';

if (DEBUG) {
  console.log('[LLM Request]', { prompt: prompt.slice(0, 100), model });
}

// API 错误处理
export async function handleGenerate(request: Request) {
  try {
    const result = await generateContent(params);
    return Response.json({ success: true, data: result });
  } catch (error) {
    console.error('[Generate Error]', error);
    return Response.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
```

---

## 9. 故障排除

### 9.1 常见问题

#### Q: LLM API 返回 401/403
**原因**: API Key 无效或过期
**解决**:
1. 检查 `.env.local` 中的 API Key 是否正确
2. 确认账户余额充足
3. 如使用代理，检查 `*_BASE_URL` 配置

#### Q: Edge TTS 生成失败
**原因**: Python 环境或 edge-tts 包问题
**解决**:
```bash
# 检查 Python 版本（需 3.8+）
python --version

# 重新安装 edge-tts
pip uninstall edge-tts
pip install edge-tts

# 测试命令行
echo "测试" | edge-tts --voice zh-CN-YunxiNeural --file-output test.mp3
```

#### Q: 音频合并后末尾截断
**原因**: MP3 编码边界问题
**解决**: 已自动添加 0.2s 静音间隔，如仍有问题可调整：
```typescript
// lib/tts/config.ts
export const AUDIO_CONFIG = {
  silenceDuration: 0.3,  // 增加间隔
  sampleRate: 24000,
  bitRate: '48k'
};
```

#### Q: 角色识别不准确
**原因**: 角色名歧义或格式不一致
**解决**:
1. 在角色设置中添加更多别名
2. 使用更独特的角色名
3. 在文本中使用标准对话格式：`"角色说：\"内容\""`

### 9.2 性能优化

#### 音频生成慢
- 调整并发数：`MAX_CONCURRENT_AUDIO_REQUESTS=5`
- 使用更快的 TTS 服务（Edge TTS 通常比 API 服务快）

#### 内存占用高
- 降低 `MEMORY_LEVEL`
- 定期清理 `output/` 目录中的临时文件

### 9.3 日志查看

```bash
# 开发模式日志
npm run dev 2>&1 | tee dev.log

# 生产模式日志
npm start 2>&1 | tee production.log

# 使用 grep 过滤
grep -E "(Error|Warn)" dev.log
```

---

## 附录

### A. 百度 TTS 音色列表

| 音色ID | 名称 | 性别 | 类别 |
|-------|------|-----|------|
| du-xiaoyao | 度逍遥 | 男 | ⭐推荐 |
| du-yaya | 度丫丫 | 女 | ⭐推荐 |
| du-xiaomei | 度小萌 | 女 | ⭐推荐 |
| du-xiaoshu | 度小舒 | 女 | ⭐推荐 |
| du-xiaodu | 度小杜 | 男 | ⭐推荐 |
| du-xiaofeng | 度小风 | 男 | 男声 |
| du-xiaoshuo | 度小硕 | 男 | 男声 |
| ... | ... | ... | ... |

### B. 更新日志

**v1.0.0** (2026-03-17)

- ✨ 新增多角色有声书制作
- ✨ 新增百度 TTS 支持（27 音色）
- ✨ 新增 Edge TTS 支持（免费）
- ✨ 新增智能续写功能
- ✨ 新增 5 级 AI 记忆系统
- 🔧 修复音频合并截断问题
- 🔧 优化角色列表管理

### C. 相关资源

- [Next.js 文档](https://nextjs.org/docs)
- [Tailwind CSS 文档](https://tailwindcss.com/docs)
- [百度智能云 TTS](https://cloud.baidu.com/product/speech/tts)
- [Edge TTS GitHub](https://github.com/rany2/edge-tts)

---

**文档版本**: v1.0  
**最后更新**: 2026-03-17

如有问题，请提交 [GitHub Issue](https://github.com/Jackno/Novel-AI-Agent/issues)。
