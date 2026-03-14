/**
 * System Prompt 构建器
 * 根据 novel_agent.md 第7章规格实现
 */

import type { NovelProject, NovelBible, NovelStage, SectionWritingContext, Chapter, NovelOutline, Volume, VolumeConfig, MemoryLevel } from "@/types/novel";

/**
 * 构建通用的基础 System Prompt
 */
export function buildBaseSystemPrompt(project: NovelProject): string {
  const { bible } = project;
  
  return `你是一位专业的小说创作助手，正在协助用户创作一部${bible.meta.genre || "长篇"}小说。

## 小说基本信息
标题：${bible.meta.title || "未命名"}
题材：${bible.meta.genre || "未设定"}
基调：${bible.meta.tone || "未设定"}
核心主题：${bible.meta.themes.join(", ") || "未设定"}
简介：${bible.meta.synopsis || "暂无简介"}

## 写作原则
1. 保持与已确认内容的一致性，不得随意更改已设定的人物性格、能力或关系
2. 语言风格与题材匹配，${bible.meta.genre || "本题材"}应有对应的氛围和词汇
3. 避免套路化表达，追求有个性的描写
4. 对话要符合人物性格，不同人物有不同说话方式
5. 场景描写与情感刻画并重，避免流水账式叙述`;
}

/**
 * 根据记忆等级构建圣经注入内容
 * @param memoryLevel 1-5 的记忆等级
 */
export function buildBibleSection(
  bible: NovelBible,
  memoryLevel: MemoryLevel = 3,
  relevantCharacterIds?: string[]
): string {
  // Level 1: 最小化 - 仅核心信息
  if (memoryLevel === 1) {
    return buildMinimalBible(bible, relevantCharacterIds);
  }
  // Level 2: 标准 - 中等详情
  else if (memoryLevel === 2) {
    return buildMediumBible(bible);
  }
  // Level 3-5: 完整圣经
  else {
    return buildFullBible(bible);
  }
}

/**
 * 最小化圣经注入（仅相关人物简介 + 地点名称）
 */
function buildMinimalBible(
  bible: NovelBible,
  relevantCharacterIds?: string[]
): string {
  const relevantChars = relevantCharacterIds 
    ? bible.characters.filter(c => relevantCharacterIds.includes(c.id))
    : bible.characters.slice(0, 3); // 默认取前3个

  let result = "## 人物设定（精简）\n";
  for (const char of relevantChars) {
    const personality = typeof char.personality === "string" ? char.personality : "";
    result += `- ${char.name}：${personality.slice(0, 50) || "暂无描述"}...\n`;
  }

  if (bible.instances.length > 0) {
    result += "\n## 重要地点\n";
    for (const inst of bible.instances.slice(0, 5)) {
      result += `- ${inst.name}：${inst.type}\n`;
    }
  }

  return result;
}

/**
 * 中等圣经注入（所有人物简要信息 + 势力关系）
 */
function buildMediumBible(bible: NovelBible): string {
  let result = "## 人物设定\n";
  for (const char of bible.characters) {
    result += `### ${char.name}（${char.role === "protagonist" ? "主角" : char.role === "antagonist" ? "反派" : char.role === "supporting" ? "配角" : "中立"}）\n`;
    const personality = typeof char.personality === "string" ? char.personality : "";
    const abilities = typeof char.abilities === "string" ? char.abilities : "";
    result += `- 性格：${personality.slice(0, 100) || "暂无"}...\n`;
    result += `- 能力：${abilities.slice(0, 100) || "暂无"}...\n`;
    if (char.currentState) {
      result += `- 当前状态：${char.currentState}\n`;
    }
    result += "\n";
  }

  if (bible.factions.length > 0) {
    result += "## 势力关系\n";
    for (const faction of bible.factions) {
      const goal = typeof faction.goal === "string" ? faction.goal : "";
      result += `### ${faction.name}\n`;
      result += `- 立场：${faction.alignment}\n`;
      result += `- 目标：${goal.slice(0, 100) || "暂无"}...\n`;
      result += "\n";
    }
  }

  if (bible.climaxScenes.length > 0) {
    result += "## 计划中的高潮场景（勿提前泄露）\n";
    for (const scene of bible.climaxScenes) {
      result += `- ${scene.name}（${scene.targetPosition}）\n`;
    }
  }

  return result;
}

/**
 * 完整圣经注入
 */
function buildFullBible(bible: NovelBible): string {
  let result = "## 人物设定\n";
  for (const char of bible.characters) {
    result += `### ${char.name}（${char.role === "protagonist" ? "主角" : char.role === "antagonist" ? "反派" : char.role === "supporting" ? "配角" : "中立"}）\n`;
    result += `- 年龄/性别：${char.age || "未知"} / ${char.gender || "未知"}\n`;
    result += `- 外貌：${char.appearance || "暂无描述"}\n`;
    result += `- 性格：${char.personality || "暂无描述"}\n`;
    result += `- 背景：${char.backstory || "暂无描述"}\n`;
    result += `- 能力：${char.abilities || "暂无描述"}\n`;
    result += `- 动机：${char.motivation || "暂无描述"}\n`;
    result += `- 弧线：${char.arc || "暂无描述"}\n`;
    if (char.relationships && Object.keys(char.relationships).length > 0) {
      result += `- 关系：${JSON.stringify(char.relationships)}\n`;
    }
    if (char.currentState) {
      result += `- 当前状态：${char.currentState}\n`;
    }
    result += "\n";
  }

  if (bible.factions.length > 0) {
    result += "## 势力关系\n";
    for (const faction of bible.factions) {
      result += `### ${faction.name}\n`;
      result += `- 性质：${faction.type}\n`;
      result += `- 立场：${faction.alignment}\n`;
      result += `- 规模：${faction.scale}\n`;
      result += `- 目标：${faction.goal}\n`;
      result += `- 特色：${faction.characteristics}\n`;
      result += `- 结构：${faction.hierarchy}\n`;
      result += "\n";
    }
  }

  if (bible.instances.length > 0) {
    result += "## 重要地点\n";
    for (const inst of bible.instances) {
      result += `### ${inst.name}\n`;
      result += `- 类型：${inst.type}\n`;
      result += `- 位置：${inst.location}\n`;
      result += `- 特色：${inst.features}\n`;
      result += `- 资源：${inst.resources}\n`;
      result += "\n";
    }
  }

  if (bible.climaxScenes.length > 0) {
    result += "## 高潮场景\n";
    for (const scene of bible.climaxScenes) {
      result += `### ${scene.name}\n`;
      result += `- 类型：${scene.type}\n`;
      result += `- 情感基调：${scene.emotionalTone}\n`;
      result += `- 大概位置：${scene.targetPosition}\n`;
      result += `- 描述：${scene.description}\n`;
      result += `- 影响：${scene.impact}\n`;
      result += "\n";
    }
  }

  return result;
}

/**
 * 构建大纲生成的 User Prompt
 */
export function buildOutlineUserPrompt(project: NovelProject): string {
  const { bible, settings } = project;
  const memoryLevel = settings.memoryLevel ?? 3;
  
  return `请基于以下小说预设，生成完整的故事大纲和时间线。

【小说预设】
${buildBibleSection(bible, memoryLevel)}

要求：
1. 按照目标字数 ${bible.meta.wordCountTarget} 字规划卷数和章节数
2. 大纲需要安排所有高潮场景的合理位置
3. 确保主要人物的弧线都有发展空间
4. 建议分 3-5 卷，每卷 10-20 章，每章 2000-3000 字
5. 时间线需要清晰标记各重要事件的因果关系

请输出以下格式的 JSON：
{
  "mainArc": "故事主线描述...",
  "subplots": [
    {
      "id": "uuid",
      "name": "支线名称",
      "description": "支线描述",
      "relatedCharacters": ["characterId"],
      "relatedFactions": ["factionId"]
    }
  ],
  "volumes": [
    {
      "id": "uuid",
      "number": 1,
      "title": "卷标题",
      "coreEvent": "本卷核心事件",
      "wordCountTarget": 30000,
      "chapterCount": 15,
      "summary": "本卷简介"
    }
  ],
  "timeline": [
    {
      "id": "uuid",
      "timePoint": "时间点描述",
      "eventName": "事件名称",
      "description": "事件描述",
      "characters": ["characterId"],
      "impact": "对故事的影响"
    }
  ]
}

请直接输出 JSON，不需要额外解释。`;
}

/**
 * 构建章节大纲生成的 User Prompt
 */
export function buildChapterOutlineUserPrompt(
  project: NovelProject,
  volumeNumber: number
): string {
  const { bible, outline, settings } = project;
  const memoryLevel = settings.memoryLevel ?? 3;
  const volume = outline?.volumes.find(v => v.number === volumeNumber);
  
  if (!volume) throw new Error("Volume not found");

  // 根据记忆等级决定是否包含前卷详细信息
  const includePreviousVolumes = memoryLevel >= 3;
  const includeAllChapters = memoryLevel >= 4;
  
  // 获取前几卷的章节摘要作为前情提要
  const previousVolumes = outline?.volumes.filter(v => v.number < volumeNumber) || [];
  const previousSummary = previousVolumes.map(v => {
    if (includeAllChapters && v.number === volumeNumber - 1) {
      // Level 4+: 包含前卷完整章节信息
      return `第${v.number}卷《${v.title}》：${v.summary}`;
    }
    return `第${v.number}卷《${v.title}》：${v.coreEvent}`;
  }).join("\n");

  return `请为第${volume.number}卷"${volume.title}"生成详细的章节大纲。

【小说预设】
${buildBibleSection(bible, memoryLevel)}

【本卷信息】
核心事件：${volume.coreEvent}
目标字数：${volume.wordCountTarget}字
章节数：${volume.chapterCount}章
每章约 ${Math.floor(volume.wordCountTarget / volume.chapterCount)} 字

${previousSummary ? `【前情提要】\n${previousSummary}\n` : ""}

要求：
1. 每章字数均匀分布
2. 章节之间需要有钩子衔接（openingHook 和 closingHook）
3. 在合适位置安排本卷涉及的高潮场景
4. 每章包含 2-4 个关键事件
5. 记录人物在本章的状态变化

请输出 JSON 数组格式，每个元素包含：
{
  "id": "uuid",
  "volumeNumber": ${volume.number},
  "chapterNumber": 全书章节序号,
  "chapterNumberInVolume": 卷内章节序号,
  "title": "章节标题",
  "wordCountTarget": 字数目标,
  "summary": "章节摘要",
  "keyEvents": [{ "order": 1, "description": "事件描述", "characters": ["人物ID"], "emotionalBeat": "情感节奏" }],
  "openingHook": "开头钩子",
  "closingHook": "结尾悬念",
  "foreshadowing": "伏笔",
  "characterStateChanges": [{ "characterId": "人物ID", "changeDescription": "变化描述" }]
}

请直接输出 JSON 数组。`;
}

/**
 * 构建小节列表生成的 User Prompt
 */
export function buildSectionListUserPrompt(
  project: NovelProject,
  chapter: Chapter,
  continuationContext?: {
    characters: unknown[];
    instances: unknown[];
    worldSettings?: Record<string, unknown>;
  }
): string {
  const { bible } = project;
  
  // 计算小节数量（每小节约 800-1200 字）
  const sectionCount = Math.ceil(chapter.wordCountTarget / 1000);
  
  // 构建续写上下文部分（如果有）
  const continuationSection = continuationContext ? `
【续写上下文 - 前作分析】
${continuationContext.characters?.length ? `关键人物：
${continuationContext.characters.map((c) => {
  const char = c as {name?: string; role?: string; description?: string};
  return `- ${char.name || "未知"}${char.role ? `（${char.role}）` : ""}${char.description ? `：${char.description.substring(0, 100)}...` : ""}`;
}).join("\n")}` : ""}
${continuationContext.worldSettings ? `世界设定：${JSON.stringify(continuationContext.worldSettings).substring(0, 300)}...` : ""}
` : "";
  
  return `请为第 ${chapter.chapterNumber} 章"${chapter.title}"生成详细的小节列表。

【小说预设 - 核心设定】
标题：${bible.meta.title}
题材：${bible.meta.genre}
基调：${bible.meta.tone}
简介：${bible.meta.synopsis}
${continuationSection}
【本卷信息】
${project.outline?.volumes.find(v => v.number === chapter.volumeNumber) 
  ? `第 ${chapter.volumeNumber} 卷：${project.outline.volumes.find(v => v.number === chapter.volumeNumber)?.title}
核心事件：${project.outline.volumes.find(v => v.number === chapter.volumeNumber)?.coreEvent}`
  : "暂无卷信息"}

【本章大纲】
章节标题：${chapter.title}
章节序号：第 ${chapter.chapterNumber} 章（全书）/ 第 ${chapter.chapterNumberInVolume} 章（本卷）
字数目标：${chapter.wordCountTarget} 字
章节摘要：${chapter.summary}
开头钩子：${chapter.openingHook}
结尾悬念：${chapter.closingHook}

【本章关键事件】
${chapter.keyEvents.map((e, i) => `${i + 1}. ${e.description}${e.characters?.length ? `（涉及：${e.characters.join(", ")}）` : ""}${e.emotionalBeat ? ` [情感：${e.emotionalBeat}]` : ""}`).join("\n")}

【要求】
1. 将本章拆分为 ${sectionCount} 个小节，每节约 ${Math.floor(chapter.wordCountTarget / sectionCount)} 字
2. 小节之间要有连贯性，前一节的结尾为后一节铺垫
3. 场景时间、地点要明确
4. 每个小节要有明确的情感节拍（如紧张、温馨、悲伤、激动等）
5. 内容概要要具体，说明本节写什么情节
6. 建议每节采用哪个角色的视角（POV），从主要角色中选择

请输出 JSON 数组格式，每个元素包含：
{
  "id": "uuid",
  "sectionNumber": 1,
  "title": "小节标题",
  "wordCountTarget": 1000,
  "sceneTime": "场景时间",
  "sceneLocation": "场景地点",
  "contentSummary": "内容概要，2-3句话",
  "emotionalBeat": "情感节拍",
  "pov": "视角角色ID（从主要角色中选择）",
  "writingNotes": "写作要点提示"
}

请直接输出 JSON 数组，不要任何解释。`;
}

/**
 * 构建小节正文生成的 User Prompt
 * 根据记忆等级注入不同详细程度的上下文
 */
export function buildSectionContentUserPrompt(
  context: SectionWritingContext,
  memoryLevel: MemoryLevel = 3,
  project?: NovelProject
): string {
  const { section, chapter, bible, writingStyleSample } = context;

  // 获取主角信息
  const protagonist = bible.characters.find(c => c.role === "protagonist");
  const protagonistName = protagonist?.name || "主角";

  let prompt = `请为以下小节撰写正文内容。

【重要：角色名称】
本小说的主角名字是：${protagonistName}
绝对禁止使用其他名字（如林云、萧炎、唐三、韩立等常见小说角色名）！
所有涉及主角的描述必须使用"${protagonistName}"这个名字。
`;

  // 根据记忆等级注入圣经内容
  if (memoryLevel >= 3) {
    // Level 3+: 完整圣经
    prompt += `
【小说预设 - 完整设定】
${buildFullBible(bible)}
`;
  } else if (memoryLevel === 2) {
    // Level 2: 中等圣经
    prompt += `
【小说预设 - 核心设定】
${buildMediumBible(bible)}
`;
  } else {
    // Level 1: 最小圣经 + 当前小节相关人物
    const relevantCharacterIds = context.involvedCharacters.map(c => c.id);
    prompt += `
【小说预设 - 精简设定】
${buildMinimalBible(bible, relevantCharacterIds)}
`;
  }

  // Level 4+: 注入大纲规划内容
  if (memoryLevel >= 4 && project?.outline) {
    prompt += `
【大纲规划】
故事主线：${project.outline.mainArc?.substring(0, 500)}...

本卷规划：
`;
    const currentVolume = project.outline.volumes.find(v => v.number === chapter.volumeNumber);
    if (currentVolume) {
      prompt += `第 ${currentVolume.number} 卷《${currentVolume.title}》：${currentVolume.summary}
核心事件：${currentVolume.coreEvent}
`;
    }
    
    // Level 5: 注入前卷摘要
    if (memoryLevel >= 5) {
      const previousVolumes = project.outline.volumes.filter(v => v.number < chapter.volumeNumber);
      if (previousVolumes.length > 0) {
        prompt += `
前卷概要：
${previousVolumes.map(v => `第 ${v.number} 卷《${v.title}》：${v.coreEvent}`).join("\n")}
`;
      }
    }
    prompt += `
`;
  }

  prompt += `
【小节信息】
场景时间：${section.sceneTime || "未指定"}
场景地点：${section.sceneLocation || "未指定"}
情感节拍：${section.emotionalBeat || "未指定"}
内容概要：${section.contentSummary}
目标字数：${section.wordCountTarget}字（允许浮动 ±100字）
${section.writingNotes ? `写作要点：${section.writingNotes}\n` : ""}

【本章大纲】
章节标题：${chapter.title}
章节摘要：${chapter.summary}
本章关键事件：
${chapter.keyEvents.map(e => `- ${e.description}`).join("\n")}

`;

  // 添加上一节结尾（Level 2+）
  if (memoryLevel >= 2 && context.previousSectionEnding) {
    prompt += `【上一节结尾】\n${context.previousSectionEnding}\n\n`;
  }

  // Level 3+: 添加所有人物信息
  if (memoryLevel >= 3 && bible.characters.length > 0) {
    prompt += `【人物设定 - 完整】\n`;
    for (const char of bible.characters) {
      const roleText = char.role === "protagonist" ? "【主角】" : char.role === "antagonist" ? "【反派】" : char.role === "supporting" ? "【配角】" : "";
      prompt += `${char.name}${roleText}：${char.appearance?.substring(0, 100) || ""} ${char.personality?.substring(0, 100) || ""}\n`;
    }
    prompt += `\n`;
  }
  // Level 1-2: 仅添加相关人物
  else if (memoryLevel < 3 && context.involvedCharacters.length > 0) {
    prompt += `【本节涉及人物】\n`;
    for (const char of context.involvedCharacters) {
      prompt += `${char.name}：${char.personality?.substring(0, 100) || ""}\n`;
    }
    prompt += `\n`;
  }

  // 添加地点信息（Level 2+）
  if (memoryLevel >= 2 && context.location) {
    prompt += `【地点信息】\n${context.location.name}：${context.location.features}\n\n`;
  }

  // Level 5: 添加伏笔追踪
  if (memoryLevel >= 5 && project?.foreshadowings && project.foreshadowings.length > 0) {
    const relevantForeshadowings = project.foreshadowings.filter(f => 
      f.status === "planted" || 
      (f.plantedInChapter && f.plantedInChapter <= chapter.chapterNumber)
    );
    if (relevantForeshadowings.length > 0) {
      prompt += `【伏笔提醒】
${relevantForeshadowings.map(f => `- ${f.content}（状态：${f.status}）`).join("\n")}

`;
    }
  }

  // 添加风格参考
  if (writingStyleSample && typeof writingStyleSample === "string") {
    prompt += `【风格参考】\n请参考以下文字的风格进行创作：\n${writingStyleSample.slice(0, 800)}...\n\n`;
  }

  prompt += `【写作要求 - 严格遵守】
1. 直接输出正文，不加任何标题或说明
2. 字数控制在 ${section.wordCountTarget - 100} - ${section.wordCountTarget + 100} 字之间
3. 与上一节结尾自然衔接（如果有）
4. 必须使用【人物设定】中指定的角色名，绝对禁止杜撰新名字
5. 主角名字必须是"${protagonistName}"，禁止写成其他名字
6. 符合人物性格和当前状态
7. 体现指定的情感节拍
8. 推进关键事件的发展
9. 结尾不必强行收束，可以在情节推进中自然结束本节
`;

  // Level 5: 额外一致性要求
  if (memoryLevel >= 5) {
    prompt += `
10. 注意与大纲规划和前序章节的一致性
11. 确保人物行为符合其设定和发展弧线
12. 适当呼应已埋下的伏笔
`;
  }

  prompt += `
【禁止事项】
- 禁止使用"林云"、"萧炎"、"唐三"、"韩立"等常见小说角色名
- 禁止使用"青云宗"、"灵力"、"丹田"等与设定不符的词汇，除非它们明确出现在小说设定中
- 禁止偏离【小说预设】中设定的世界观和人物设定

请直接输出正文内容：`;

  return prompt;
}

/**
 * 构建单个字段补全的 User Prompt
 */
export function buildFieldCompletionUserPrompt(
  project: NovelProject,
  fieldName: string,
  currentValue: string,
  extraContext?: string
): string {
  return `请为小说的"${fieldName}"字段生成内容。

【小说基本信息】
标题：${project.bible.meta.title}
题材：${project.bible.meta.genre}
基调：${project.bible.meta.tone}
简介：${project.bible.meta.synopsis}

【当前值】
${currentValue || "（暂无内容）"}

${extraContext ? `【额外上下文】\n${extraContext}\n` : ""}

请生成${fieldName}的内容，要求：
1. 与小说整体风格和题材保持一致
2. 内容具体、有细节、避免空泛
3. 符合中文小说写作习惯

请直接输出生成的内容，不需要额外解释。`;
}

/**
 * 构建完整的 System Prompt
 */
export function buildCompleteSystemPrompt(
  project: NovelProject,
  stage: NovelStage,
  memoryLevel?: MemoryLevel
): string {
  const level = memoryLevel ?? project.settings.memoryLevel ?? 3;
  
  let prompt = buildBaseSystemPrompt(project);
  prompt += "\n\n";
  prompt += buildBibleSection(project.bible, level);

  // 阶段特定提示
  if (stage === "writing") {
    prompt += `
## 正文写作特别说明
- 使用第三人称有限视角或全知视角，保持统一
- 对话使用双引号，段落间自然过渡
- 适当使用修辞手法增强画面感
- 控制节奏，张弛有度`;
  }

  return prompt;
}

// ==================== 新增强化功能 ====================

/**
 * 构建带有卷配置的大纲生成 User Prompt
 */
export function buildOutlineUserPromptWithConfig(
  project: NovelProject,
  volumeCount: number,
  volumeConfigs: VolumeConfig[]
): string {
  const { bible, settings } = project;
  const memoryLevel = settings.memoryLevel ?? 3;
  
  // 计算总字数和总章节数
  const totalWordCount = volumeConfigs.reduce((sum, c) => sum + c.wordCountTarget, 0);
  const totalChapters = volumeConfigs.reduce((sum, c) => sum + c.chapterCount, 0);
  
  // 构建卷配置描述
  const volumeConfigDescription = volumeConfigs.map((config, index) => 
    `第 ${index + 1} 卷：${config.wordCountTarget.toLocaleString()} 字，${config.chapterCount} 章，平均每章约 ${Math.floor(config.wordCountTarget / config.chapterCount)} 字`
  ).join("\n");
  
  return `请基于以下小说预设和配置，生成完整的故事大纲和时间线。

【小说预设】
${buildBibleSection(bible, memoryLevel)}

【用户指定的卷配置】
总卷数：${volumeCount} 卷
总字数：${totalWordCount.toLocaleString()} 字
总章节数：${totalChapters} 章

各卷配置：
${volumeConfigDescription}

要求：
1. **严格按照上述配置生成**：每卷的字数目标和章节数必须与用户配置一致
2. 大纲需要安排所有高潮场景的合理位置到各卷中
3. 确保主要人物的弧线在各卷中有合理的发展空间
4. 每卷应该有明确的核心事件和剧情目标
5. 卷与卷之间要有连贯性，每卷的结尾为下一卷铺垫
6. 时间线需要清晰标记各重要事件的因果关系
7. 每卷的简介要体现该卷在整体故事中的作用

请输出以下格式的 JSON：
{
  "mainArc": "故事主线描述...",
  "subplots": [
    {
      "id": "uuid",
      "name": "支线名称",
      "description": "支线描述",
      "relatedCharacters": ["characterId"],
      "relatedFactions": ["factionId"]
    }
  ],
  "volumes": [
    {
      "id": "uuid",
      "number": 1,
      "title": "卷标题",
      "coreEvent": "本卷核心事件",
      "wordCountTarget": ${volumeConfigs[0]?.wordCountTarget || 100000},
      "chapterCount": ${volumeConfigs[0]?.chapterCount || 50},
      "summary": "本卷简介"
    }
  ],
  "timeline": [
    {
      "id": "uuid",
      "timePoint": "时间点描述",
      "eventName": "事件名称",
      "description": "事件描述",
      "characters": ["characterId"],
      "impact": "对故事的影响"
    }
  ]
}

请直接输出 JSON，不需要额外解释。`;
}

/**
 * 构建生成故事主线的 User Prompt
 */
export function buildMainArcUserPrompt(
  project: NovelProject,
  existingOutline?: NovelOutline | null
): string {
  const { bible, settings } = project;
  const memoryLevel = settings.memoryLevel ?? 3;
  
  let prompt = `请基于以下小说预设，生成故事主线。

【小说预设】
${buildBibleSection(bible, memoryLevel)}

要求：
1. 主线应概括故事的核心冲突、主角的目标和成长轨迹
2. 体现小说的核心主题：${bible.meta.themes.join(", ")}
3. 说明主角面临的挑战和最终结局
4. 长度控制在 300-800 字
5. 语言简洁有力，富有吸引力
`;

  if (existingOutline && existingOutline.volumes.length > 0) {
    prompt += `
【已有卷规划】
${existingOutline.volumes.map(v => `第 ${v.number} 卷《${v.title}》：${v.coreEvent}`).join("\n")}

请确保主线与已有的卷规划保持一致。
`;
  }

  prompt += `
请直接输出故事主线内容，不需要额外说明。`;

  return prompt;
}

/**
 * 构建生成单个卷的 User Prompt
 */
export function buildSingleVolumeUserPrompt(
  project: NovelProject,
  volumeNumber: number,
  existingVolumes: Volume[],
  mainArc: string
): string {
  const { bible, settings } = project;
  const memoryLevel = settings.memoryLevel ?? 3;
  
  // 根据记忆等级决定是否包含前卷详细信息
  const includePreviousVolumes = memoryLevel >= 4;
  
  // 构建前卷摘要
  const previousVolumesSummary = existingVolumes.length > 0
    ? existingVolumes.map(v => `第 ${v.number} 卷《${v.title}》：${includePreviousVolumes ? v.summary : v.coreEvent}`).join("\n")
    : "（这是第一卷）";

  return `请基于以下信息，为第 ${volumeNumber} 卷生成详细的配置。

【小说预设】
${buildBibleSection(bible, memoryLevel)}

【故事主线】
${mainArc}

【前卷信息】
${previousVolumesSummary}

要求：
1. 本卷应该承接前卷剧情（如果有），或为故事开端（如果是第一卷）
2. 核心事件要明确，能推动主线发展
3. 标题要有吸引力，概括本卷核心内容
4. 简介要说明本卷的故事走向和主要看点
5. 字数目标和章节数可以参考前卷或根据小说整体规划

请输出以下格式的 JSON：
{
  "id": "uuid",
  "number": ${volumeNumber},
  "title": "卷标题",
  "coreEvent": "本卷核心事件",
  "wordCountTarget": 100000,
  "chapterCount": 50,
  "summary": "本卷简介"
}

请直接输出 JSON，不需要额外解释。`;
}
