/**
 * 续写分析 Agent
 * 采用分层分析策略：章节 -> 汇总 -> 整体
 */

import { generateJSON, generateContent } from "./clients";
import { 
  splitIntoChapters, 
  preprocessText, 
  mergeInputFiles,
  type TextChunk 
} from "./text-chunker";
import type { 
  ChunkAnalysis, 
  SummaryAnalysis, 
  AnalysisResult,
  AnalyzedCharacter 
} from "@/types/novel";

// 从环境变量获取模型配置
// 注意：这个值在服务端 API 路由中才能读取到
const SETTING_MODEL = process.env.SETTING_MODEL || ""; 

// 调试日志（在服务端执行时会显示）
if (typeof window === 'undefined') {
  console.log("[Continuation Agent] SETTING_MODEL:", SETTING_MODEL);
}

// 章节分析 Prompt
const CHUNK_ANALYSIS_PROMPT = `请分析以下小说片段，提取关键信息。

请输出JSON格式：
{
  "summary": "片段内容摘要，200字以内",
  "characters": ["出现的角色名1", "角色名2"],
  "events": ["关键事件1", "关键事件2"],
  "locations": ["出现的地点1", "地点2"],
  "foreshadowing": ["埋下的伏笔或线索"],
  "emotionalTone": "情感基调（如：紧张、温馨、悲伤）"
}

注意：
1. 如果片段内容不足或无明显情节，可以返回空数组
2. 角色名要统一，不要出现同一角色的不同称呼
3. 伏笔要具体描述，方便后续追踪`;

// 汇总分析 Prompt
const SUMMARY_ANALYSIS_PROMPT = `基于以下章节分析结果，请汇总整体信息。

章节分析数据：
{chunkSummaries}

请输出JSON格式：
{
  "mainPlot": "主线剧情总结，300字以内",
  "characterArcs": [
    {
      "characterName": "角色名",
      "initialState": "初始状态",
      "finalState": "最终状态",
      "keyEvents": ["关键成长事件"],
      "arcType": "growth|decline|flat|transformation"
    }
  ],
  "plotThreads": [
    {
      "name": "剧情线名称",
      "description": "剧情线描述",
      "status": "resolved|unresolved|ongoing",
      "relatedChunks": [涉及的章节序号],
      "importance": "main|sub|minor"
    }
  ],
  "worldBuilding": {
    "setting": "时空背景设定",
    "rules": ["世界规则1", "规则2"],
    "organizations": ["组织势力1", "势力2"],
    "keyItems": ["关键物品1", "物品2"]
  }
}`;

// 最终分析 Prompt
const FINAL_ANALYSIS_PROMPT = `基于小说整体信息，生成续写建议。

作品信息：
- 总章节数：{totalChunks}
- 总字数：{totalWordCount}
- 主线剧情：{mainPlot}

角色成长：
{characterArcs}

未解决剧情线：
{unresolvedThreads}

请输出JSON格式：
{
  "worldSummary": "世界观总结，包括背景、规则、氛围",
  "characters": [
    {
      "name": "角色名",
      "role": "protagonist|supporting|antagonist",
      "description": "角色描述",
      "currentState": "当前状态",
      "arcDirection": "后续发展方向"
    }
  ],
  "unresolvedPlots": ["未回收的伏笔1", "伏笔2"],
  "resolvedPlots": ["已解决的主要剧情"],
  "factions": ["势力/组织"],
  "keyLocations": ["关键地点"],
  "timeline": ["主要事件时间线"],
  "themes": ["主题1", "主题2"],
  "tone": "整体基调",
  "suggestedContinuation": "续写建议方向"
}`;

/**
 * 分析单个文本片段
 */
async function analyzeChunk(
  chunk: TextChunk,
  projectTitle: string
): Promise<ChunkAnalysis> {
  const systemPrompt = `你是一位专业的小说分析师，正在分析《${projectTitle}》的片段。`;
  
  const result = await generateJSON<{
    summary: string;
    characters: string[];
    events: string[];
    locations: string[];
    foreshadowing: string[];
    emotionalTone: string;
  }>({
    systemPrompt,
    userPrompt: `${CHUNK_ANALYSIS_PROMPT}\n\n--- 片段内容 ---\n\n${chunk.content.slice(0, 4000)}`,
    temperature: 0.3,
    maxTokens: 2048,
    model: SETTING_MODEL,
  });

  return {
    id: chunk.id,
    index: chunk.index,
    title: chunk.title,
    content: chunk.content.slice(0, 500),
    wordCount: chunk.wordCount,
    summary: result.data.summary,
    characters: result.data.characters,
    events: result.data.events,
    locations: result.data.locations,
    foreshadowing: result.data.foreshadowing,
    emotionalTone: result.data.emotionalTone,
  };
}

/**
 * 汇总所有章节分析
 */
async function summarizeAnalysis(
  chunkAnalyses: ChunkAnalysis[],
  projectTitle: string
): Promise<SummaryAnalysis> {
  // 构建章节摘要文本
  const chunkSummaries = chunkAnalyses.map(ca => 
    `第${ca.index + 1}章${ca.title ? `《${ca.title}》` : ''}：${ca.summary}\n` +
    `角色：${ca.characters.join('、') || '无'}\n` +
    `事件：${ca.events.join('；') || '无'}\n` +
    `伏笔：${ca.foreshadowing.join('；') || '无'}`
  ).join('\n\n---\n\n');

  const systemPrompt = `你是一位专业的小说分析师，正在汇总分析《${projectTitle}》。`;
  
  const result = await generateJSON<SummaryAnalysis>({
    systemPrompt,
    userPrompt: SUMMARY_ANALYSIS_PROMPT.replace('{chunkSummaries}', chunkSummaries.slice(0, 8000)),
    temperature: 0.4,
    maxTokens: 4096,
    model: SETTING_MODEL,
  });

  return {
    ...result.data,
    totalChunks: chunkAnalyses.length,
    totalWordCount: chunkAnalyses.reduce((sum, ca) => sum + ca.wordCount, 0),
  };
}

/**
 * 生成最终分析结果
 */
async function generateFinalAnalysis(
  summary: SummaryAnalysis,
  chunkAnalyses: ChunkAnalysis[],
  projectTitle: string
): Promise<Omit<AnalysisResult, 'chunkAnalysis' | 'summaryAnalysis' | 'analyzedAt' | 'processingStatus' | 'progress'>> {
  // 提取未解决的剧情线
  const unresolvedThreads = summary.plotThreads
    .filter(pt => pt.status === 'unresolved' || pt.status === 'ongoing')
    .map(pt => `${pt.name}：${pt.description}`);

  // 格式化角色成长
  const characterArcs = summary.characterArcs
    .map(ca => `- ${ca.characterName}：${ca.initialState} → ${ca.finalState}（${ca.arcType}）`)
    .join('\n');

  const systemPrompt = `你是一位专业的小说续写顾问，正在为《${projectTitle}》提供续写建议。`;
  
  const prompt = FINAL_ANALYSIS_PROMPT
    .replace('{totalChunks}', String(summary.totalChunks))
    .replace('{totalWordCount}', String(summary.totalWordCount))
    .replace('{mainPlot}', summary.mainPlot.slice(0, 500))
    .replace('{characterArcs}', characterArcs.slice(0, 1000))
    .replace('{unresolvedThreads}', unresolvedThreads.join('\n').slice(0, 1000));

  const result = await generateJSON<{
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
  }>({
    systemPrompt,
    userPrompt: prompt,
    temperature: 0.5,
    maxTokens: 4096,
    model: SETTING_MODEL,
  });

  return result.data;
}

/**
 * 执行分层分析
 * @param inputFiles 输入文件列表
 * @param projectTitle 项目标题
 * @param onProgress 进度回调
 */
export async function performLayeredAnalysis(
  inputFiles: Array<{ content: string; filename: string }>,
  projectTitle: string,
  onProgress?: (progress: number, stage: string) => void
): Promise<AnalysisResult> {
  // Step 1: 预处理和分块
  onProgress?.(5, "预处理文本...");
  const mergedText = mergeInputFiles(inputFiles);
  const preprocessedText = preprocessText(mergedText);
  
  // Step 2: 智能分章
  onProgress?.(10, "分章处理...");
  const chunks = splitIntoChapters(preprocessedText);
  
  if (chunks.length === 0) {
    throw new Error("无法识别有效文本内容");
  }

  // Step 3: 逐章分析
  const chunkAnalyses: ChunkAnalysis[] = [];
  for (let i = 0; i < chunks.length; i++) {
    const progress = 10 + Math.floor((i / chunks.length) * 50); // 10-60%
    onProgress?.(progress, `分析第 ${i + 1}/${chunks.length} 章...`);
    
    try {
      const analysis = await analyzeChunk(chunks[i], projectTitle);
      chunkAnalyses.push(analysis);
    } catch (error) {
      console.error(`Failed to analyze chunk ${i}:`, error);
      // 添加一个空的分析结果，避免中断
      chunkAnalyses.push({
        id: chunks[i].id,
        index: chunks[i].index,
        title: chunks[i].title,
        content: chunks[i].content.slice(0, 500),
        wordCount: chunks[i].wordCount,
        summary: "分析失败",
        characters: [],
        events: [],
        locations: [],
        foreshadowing: [],
        emotionalTone: "未知",
      });
    }
  }

  // Step 4: 汇总分析
  onProgress?.(70, "汇总分析结果...");
  const summaryAnalysis = await summarizeAnalysis(chunkAnalyses, projectTitle);

  // Step 5: 生成最终分析
  onProgress?.(85, "生成续写建议...");
  const finalAnalysis = await generateFinalAnalysis(
    summaryAnalysis,
    chunkAnalyses,
    projectTitle
  );

  onProgress?.(100, "分析完成");

  return {
    ...finalAnalysis,
    chunkAnalysis: chunkAnalyses,
    summaryAnalysis,
    analyzedAt: new Date().toISOString(),
    processingStatus: "completed",
    progress: 100,
  };
}

/**
 * 快速分析（用于较短文本）
 */
export async function performQuickAnalysis(
  text: string,
  projectTitle: string
): Promise<AnalysisResult> {
  const chunks: TextChunk[] = [{
    id: "chunk-0",
    index: 0,
    content: text,
    wordCount: text.length,
  }];

  const chunkAnalysis = await analyzeChunk(chunks[0], projectTitle);
  
  // 简化的汇总
  const summaryAnalysis: SummaryAnalysis = {
    totalChunks: 1,
    totalWordCount: text.length,
    mainPlot: chunkAnalysis.summary,
    characterArcs: chunkAnalysis.characters.map(name => ({
      characterName: name,
      initialState: "未知",
      finalState: chunkAnalysis.summary.includes(name) ? "活跃" : "未知",
      keyEvents: chunkAnalysis.events,
      arcType: "flat",
    })),
    plotThreads: [{
      name: "主线",
      description: chunkAnalysis.summary,
      status: "ongoing",
      relatedChunks: [0],
      importance: "main",
    }],
    worldBuilding: {
      setting: chunkAnalysis.locations.join(", ") || "未明确",
      rules: [],
      organizations: [],
      keyItems: [],
    },
  };

  // 简化的最终分析
  return {
    worldSummary: chunkAnalysis.summary,
    characters: chunkAnalysis.characters.map(name => ({
      name,
      role: "supporting",
      description: "",
      currentState: "",
      arcDirection: "",
    })),
    unresolvedPlots: chunkAnalysis.foreshadowing,
    resolvedPlots: [],
    factions: [],
    keyLocations: chunkAnalysis.locations,
    timeline: chunkAnalysis.events,
    themes: [],
    tone: chunkAnalysis.emotionalTone,
    suggestedContinuation: "建议基于当前伏笔继续发展剧情",
    chunkAnalysis: [chunkAnalysis],
    summaryAnalysis,
    analyzedAt: new Date().toISOString(),
    processingStatus: "completed",
    progress: 100,
  };
}
