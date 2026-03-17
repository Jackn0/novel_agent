/**
 * 有声小说相关 Prompt 构建器
 */

import type { NovelProject } from "@/types/novel";

/**
 * 构建文本解析为音频段的 Prompt
 * 将小说正文解析为结构化格式，区分旁白和对话
 */
export function buildAudioTextParsePrompt(
  content: string,
  characters: { id: string; name: string }[],
  protagonistName?: string
): string {
  const characterList = characters.map(c => `- ${c.name} (ID: ${c.id})`).join("\n");
  
  return `请将以下小说内容解析为"角色-台词"格式，用于有声小说配音。

【已配置角色】
${characterList}
主角名称: ${protagonistName || "无"}

【解析规则】
1. 内容分为两类:
   - narration: 旁白描述（场景、动作、心理活动、环境描写）
   - dialogue: 角色对话（带引号的直接引语）

2. 对话归属判断:
   - 根据上下文判断说话人
   - 对话前的动作描述归属旁白
   - "某某说:" 这类提示词之后的引语归属该角色
   - 如果无法确定说话人，使用主角名称或标记为 "unknown"

3. 长段落处理:
   - 旁白段落超过150字时，按语义切分为多个片段
   - 保持语句完整性
   - 对话不宜过长，超过50字的对话可独立成段

4. 情感标注:
   - 在 processedText 中添加情感提示，如"（激动地）"、"（低声）"等
   - 根据上下文推断说话语气和情绪

【输出格式】
返回JSON数组，每个元素包含:
{
  "characterId": "角色ID或'narrator'",
  "characterName": "角色名称或'旁白'",
  "type": "narration" | "dialogue",
  "text": "原文内容",
  "processedText": "处理后内容（用于TTS，添加情感提示）"
}

【待解析内容】
${content}

请直接返回JSON数组，不要有其他说明。`;
}

/**
 * 构建写作阶段人物识别的 Prompt
 * 让AI在生成内容的同时识别涉及的人物
 */
export function buildCharacterDetectionPrompt(
  project: NovelProject,
  sectionContext: string
): string {
  const { bible } = project;
  const protagonist = bible.characters.find(c => c.role === "protagonist");
  
  return `请在生成内容的同时，识别本小节涉及的所有人物。

【当前已有人物】
${bible.characters.map(c => `- ${c.name} (${c.role})`).join("\n")}

【主角】
${protagonist?.name || "未设定"}

【输出要求】
生成内容后，在JSON响应中包含 "involvedCharacters" 字段：
{
  "content": "生成的正文内容",
  "involvedCharacters": [
    {"name": "人物名", "role": "protagonist/supporting/antagonist", "action": "在本节中的行为简述"}
  ]
}

涉及人物包括:
1. 直接出场的角色（有对话或动作）
2. 被提及的角色（回忆、对话中提到）
3. 心理活动中出现的角色

【上下文】
${sectionContext}`;
}
