/**
 * POST /api/projects/[id]/generate/multirole-process
 * 使用AI分析章节内容，识别对话和旁白，添加人物标记
 */

import { NextRequest, NextResponse } from "next/server";
import { getProject, updateProject } from "@/lib/db/projects";
import { OpenAI } from "openai";
import type { MultiRoleParagraph, MultiRoleCharacter } from "@/types/novel";

interface RouteParams {
  params: Promise<{ id: string }>;
}

interface ProcessRequest {
  volumeNumber: number;
  chapterNumber: number;
}

// 初始化OpenAI客户端
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL,
});

const MODEL = process.env.SETTING_MODEL || "gpt-4o-mini";

// 简单的人物识别（不使用AI，用于快速处理）
function simpleProcessChapter(content: string): { paragraphs: MultiRoleParagraph[], characters: MultiRoleCharacter[] } {
  const paragraphs: MultiRoleParagraph[] = [];
  const characterMap = new Map<string, MultiRoleCharacter>();
  
  // 确保旁白角色存在
  characterMap.set("narrator", {
    id: "narrator",
    name: "旁白",
    type: "narrator",
    gender: "unknown",
    description: "故事叙述",
    firstAppearChapter: 1,
  });
  
  // 按行分割
  const lines = content.split('\n').filter(l => l.trim());
  let order = 0;
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    
    // 检测是否为对话（以引号开头）
    const isDialogue = /^[\s]*["""']/.test(trimmed);
    
    if (isDialogue) {
      // 尝试提取说话人（简单规则：如果上一句是"XX说"等）
      // 这里简化处理，标记为未知角色，用户后续分配
      paragraphs.push({
        id: `p-${order}`,
        order: order++,
        characterId: "unknown",
        characterName: "（待识别）",
        type: "dialogue",
        originalText: trimmed,
        processedText: trimmed.replace(/["""']/g, ''),
      });
    } else {
      // 旁白
      paragraphs.push({
        id: `p-${order}`,
        order: order++,
        characterId: "narrator",
        characterName: "旁白",
        type: "narration",
        originalText: trimmed,
        processedText: trimmed,
      });
    }
  }
  
  // 尝试从文本中提取人名（简单规则：连续的2-4个汉字，前面有"的"字）
  const namePattern = /[的][\u4e00-\u9fa5]{2,4}[,，.。!！?？]/g;
  const matches = content.match(namePattern) || [];
  
  for (const match of matches) {
    const name = match.slice(1, -1); // 去掉"的"和标点
    if (!characterMap.has(name) && name.length >= 2 && name.length <= 4) {
      // 排除常见非人名词
      const excludeWords = ["时候", "地方", "事情", "东西", "情况", "原因", "结果", "问题", "答案", "方法"];
      if (!excludeWords.includes(name)) {
        characterMap.set(name, {
          id: `char-${name}`,
          name,
          type: "supporting",
          gender: "unknown",
          description: "待识别角色",
          firstAppearChapter: 1,
        });
      }
    }
  }
  
  return {
    paragraphs,
    characters: Array.from(characterMap.values()),
  };
}

// 使用AI处理章节
async function aiProcessChapter(content: string): Promise<{ paragraphs: MultiRoleParagraph[], characters: MultiRoleCharacter[] }> {
  const systemPrompt = `你是一个专业的小说配音文本处理专家。请将小说章节内容分割成适合配音的段落，并正确识别旁白和对话。

## 处理规则（非常重要）：

### 1. 段落分割原则
- 每个段落应该是一个完整的语义单元
- **旁白和对话必须分开**，不能混在一起
- 对话内容如果较长，可以适当合并为一个段落
- 旁白描述和人物对话要清晰区分

### 2. 对话识别规则
- 引号内的内容是人物对话（包括 "" "" '' ''）
- "XX说："XXX"" 这种格式，"XX说："是旁白，"XXX"是对话
- 如果一段文字混合了旁白和对话，**必须拆分成多个段落**

### 3. 示例
错误的做法（混合在一起）：
"凌云大喝一声，"我来！"说着就冲了上去。"

正确的做法（分开处理）：
段落1: "凌云大喝一声，"  [旁白]
段落2: "我来！"  [凌云-对话]  
段落3: "说着就冲了上去。" [旁白]

### 4. 人物识别
- 从文本中提取所有出现的人名
- 根据上下文推断性别（名字、称呼、行为描述）
- 主角通常是出场最多、有大量心理描写或对话的人物

## 输出JSON格式：
{
  "paragraphs": [
    {
      "order": 0,
      "characterId": "narrator|人物ID",
      "characterName": "旁白|人物名",
      "type": "narration|dialogue|monologue",
      "originalText": "原文（保留引号）",
      "processedText": "处理后文本（朗读用，去除引号）"
    }
  ],
  "characters": [
    {
      "id": "拼音ID",
      "name": "人物名",
      "type": "protagonist|supporting|antagonist|other",
      "gender": "male|female|unknown",
      "description": "简短描述"
    }
  ]
}

## 重要提醒：
- **严禁**将旁白和对话混在一起！
- 旁白的characterId必须是"narrator"
- 人物ID使用拼音，如"lingyun"而不是"凌云"
- 确保每个对话段落都有明确的说话人`;

  const userPrompt = `请分析以下小说章节内容：

${content.slice(0, 8000)} // 限制长度避免超出token

请严格按照上述JSON格式输出结果。`;

  try {
    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.3,
      response_format: { type: "json_object" },
    });

    const resultText = response.choices[0].message.content;
    if (!resultText) {
      throw new Error("AI返回空结果");
    }

    const result = JSON.parse(resultText);
    
    // 添加ID
    const paragraphs: MultiRoleParagraph[] = result.paragraphs.map((p: any, idx: number) => ({
      ...p,
      id: `p-${idx}`,
      order: idx,
    }));
    
    const characters: MultiRoleCharacter[] = result.characters.map((c: any) => ({
      ...c,
      firstAppearChapter: 1,
    }));
    
    // 确保旁白角色存在并排在最前面
    const narratorIndex = characters.findIndex((c: any) => c.id === "narrator");
    if (narratorIndex === -1) {
      // 添加旁白角色
      characters.unshift({
        id: "narrator",
        name: "旁白",
        type: "narrator",
        gender: "unknown",
        description: "故事叙述",
        firstAppearChapter: 1,
      });
    } else if (narratorIndex > 0) {
      // 将旁白移到最前面
      const [narrator] = characters.splice(narratorIndex, 1);
      characters.unshift(narrator);
    }

    return { paragraphs, characters };
  } catch (error) {
    console.error("AI处理失败，使用简单规则:", error);
    return simpleProcessChapter(content);
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  
  try {
    const body: ProcessRequest = await request.json();
    const { volumeNumber, chapterNumber } = body;
    
    // 获取项目
    const project = await getProject(id);
    if (!project) {
      return NextResponse.json(
        { success: false, error: "项目不存在" },
        { status: 404 }
      );
    }
    
    if (project.projectType !== "audiobook") {
      return NextResponse.json(
        { success: false, error: "不是有声小说项目" },
        { status: 400 }
      );
    }
    
    // 获取该章节的所有分段
    const segments = project.audiobookSegments?.filter(
      s => s.volumeNumber === volumeNumber && s.chapterNumber === chapterNumber
    ) || [];
    
    if (segments.length === 0) {
      return NextResponse.json(
        { success: false, error: "章节不存在" },
        { status: 404 }
      );
    }
    
    // 合并章节内容
    const fullContent = segments.map(s => s.content).join('\n\n');
    
    console.log(`[MultiRole] Processing chapter ${volumeNumber}-${chapterNumber}`);
    
    // AI处理内容
    const { paragraphs, characters } = await aiProcessChapter(fullContent);
    
    // 合并现有的人物配置（如果有）
    const existingConfig = project.multiRoleConfig;
    
    // 获取旁白的音色作为新角色默认音色
    const narratorVoice = existingConfig?.characters.find(c => c.id === "narrator")?.voiceId;
    
    // 1. 为 AI 检测到的角色合并音色配置
    // 保持原有顺序，不做重新排序
    const mergedCharacters: MultiRoleCharacter[] = characters.map(char => {
      const existing = existingConfig?.characters.find(c => c.name === char.name);
      if (existing) {
        // 已存在的角色，继承配置
        // 清除isNew标记（因为之前章节已经出现过了）
        const charWithVoice: MultiRoleCharacter = { 
          ...char, 
          voiceId: existing.voiceId,
        };
        // 移除isNew属性而不是设为undefined
        delete (charWithVoice as any).isNew;
        return charWithVoice;
      }
      // 新检测到的角色，默认使用旁白音色，并标记为新角色
      return {
        ...char,
        voiceId: narratorVoice,
        isNew: true,
      } as MultiRoleCharacter;
    });
    
    // 2. 保留现有人物中已配置音色但未在 AI 结果中出现的角色（用户手动添加的）
    if (existingConfig?.characters) {
      for (const existingChar of existingConfig.characters) {
        const exists = mergedCharacters.find(c => c.name === existingChar.name);
        // 只保留有 voiceId 的角色（用户已配置音色的）
        if (!exists && existingChar.voiceId) {
          // 手动添加的角色保留原有配置，清除isNew标记
          const charWithoutNew: MultiRoleCharacter = { ...existingChar };
          delete (charWithoutNew as any).isNew;
          mergedCharacters.push(charWithoutNew);
        }
      }
    }
    
    // 保存到项目
    const multiRoleConfig = {
      characters: mergedCharacters,
      chapters: [
        ...(existingConfig?.chapters || []),
        {
          volumeNumber,
          chapterNumber,
          chapterTitle: segments[0]?.chapterTitle || `第${chapterNumber}章`,
          paragraphs,
          status: "pending" as const,
        },
      ],
      currentChapterIndex: 0,
    };
    
    await updateProject(id, { multiRoleConfig });
    
    return NextResponse.json({
      success: true,
      data: {
        paragraphs,
        characters: mergedCharacters,
      },
    });
    
  } catch (error) {
    console.error("[MultiRole] Error:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : "处理失败" 
      },
      { status: 500 }
    );
  }
}
