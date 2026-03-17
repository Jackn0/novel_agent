import { NextRequest, NextResponse } from "next/server";
import { getProject, updateProject } from "@/lib/db/projects";
import { generateJSON, isAPIKeyConfigured } from "@/lib/agent/clients";
import { buildCompleteSystemPrompt } from "@/lib/agent/prompts";

interface RouteParams {
  params: Promise<{ id: string }>;
}

interface GenerateRequest {
  type: "characters" | "factions" | "instances" | "climaxes";
  count: number;
}

/**
 * POST /api/projects/:id/generate/bible-items
 * AI 一键生成圣经项目（人物、势力、地点、高潮）
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body: GenerateRequest = await request.json();
    const { type, count } = body;

    if (!isAPIKeyConfigured()) {
      return NextResponse.json(
        { success: false, error: "API Key 未配置" },
        { status: 500 }
      );
    }

    const project = await getProject(id);
    if (!project) {
      return NextResponse.json(
        { success: false, error: "项目不存在" },
        { status: 404 }
      );
    }

    const memoryLevel = parseInt(process.env.MEMORY_LEVEL || String(project.settings.memoryLevel)) as 1 | 2 | 3 | 4 | 5;
    const systemPrompt = buildCompleteSystemPrompt(project, "bible_meta", memoryLevel) + `

【重要语言要求】
1. 所有生成内容必须使用中文（包括名称、描述、所有字段）
2. 不要使用英文，除非是不可翻译的专有名词
3. 确保返回的 JSON 中所有字符串值都是中文`;
    
    let userPrompt = "";

    // 获取已有内容用于避免重复生成
    const existingCharacters = project.bible.characters.map(c => `${c.name}（${c.role}）：${c.personality?.slice(0, 50)}`).join("\n");
    const existingFactions = project.bible.factions.map(f => `${f.name}（${f.alignment}）：${f.goal?.slice(0, 50)}`).join("\n");
    const existingInstances = project.bible.instances.map(i => `${i.name}（${i.type}）：${i.features?.slice(0, 50)}`).join("\n");
    const existingClimaxes = project.bible.climaxScenes.map(c => `${c.name}（${c.targetPosition}）：${c.description?.slice(0, 50)}`).join("\n");

    switch (type) {
      case "characters":
        userPrompt = `请为小说《${project.bible.meta.title}》生成 ${count} 个精彩的人物设定。

小说简介：${project.bible.meta.synopsis}
题材：${project.bible.meta.genre}
基调：${project.bible.meta.tone}

【已有人物列表，请不要生成与这些重复或过于相似的人物】：
${existingCharacters || "（暂无）"}

【重要要求】
1. **必须生成 ${count} 个人物，不能多也不能少**
2. **所有内容必须使用中文（包括名称、描述等）**
3. 人物类型要多样（主角、配角、反派、中立都要有）
4. 人物之间要有潜在的关联和冲突
5. 外貌、性格、背景故事要详细且符合题材风格
6. 人物要有独特的动机和能力
7. **严禁生成与已有人物列表中重复或高度相似的人物**

【返回格式 - 严格遵守】
必须返回一个 JSON 数组，数组长度必须等于 ${count}，示例格式：
[
  {
    "name": "中文姓名",
    "role": "protagonist",
    "appearance": "外貌描述...",
    "personality": "性格特点...",
    "backstory": "背景故事..."
  },
  ...共${count}个对象
]

字段说明：
- name: 人物中文名称
- role: 角色类型，必须是 "protagonist"/"supporting"/"antagonist"/"neutral" 之一
- appearance: 外貌描述（100-200字）
- personality: 性格特点（100-200字）
- backstory: 背景故事（150-300字）
- abilities: 能力/技能（可选）
- motivation: 动机/目标（可选）
- arc: 人物弧线（可选）

请直接返回 JSON 数组，不要包含任何其他说明文字或markdown标记。`;
        break;

      case "factions":
        userPrompt = `请为小说《${project.bible.meta.title}》生成 ${count} 个精彩的势力/组织设定。

小说简介：${project.bible.meta.synopsis}
题材：${project.bible.meta.genre}
基调：${project.bible.meta.tone}

【已有势力列表，请不要生成与这些重复或过于相似的势力】：
${existingFactions || "（暂无）"}

【重要要求】
1. **必须生成 ${count} 个势力，不能多也不能少**
2. **所有内容必须使用中文（包括名称、描述等）**
3. 势力类型多样（国家、门派、家族、组织等）
4. 势力之间要有明确的关系（同盟、敌对、中立）
5. 每个势力要有独特的特点、目标和层级结构
6. 势力规模要合理（小型、中型、大型）
7. **严禁生成与已有势力列表中重复或高度相似的势力**

【返回格式 - 严格遵守】
必须返回一个 JSON 数组，数组长度必须等于 ${count}，示例格式：
[
  {
    "name": "势力中文名称",
    "type": "门派",
    "alignment": "good",
    "scale": "large",
    "goal": "核心目标描述..."
  },
  ...共${count}个对象
]

字段说明：
- name: 势力中文名称
- type: 势力类型（如：国家、门派、家族、商会等）
- alignment: 阵营，必须是 "good"/"evil"/"neutral"/"chaotic" 之一
- scale: 规模，必须是 "small"/"medium"/"large"/"super" 之一
- goal: 核心目标
- characteristics: 特点/文化（可选）
- hierarchy: 层级结构（可选）

请直接返回 JSON 数组，不要包含任何其他说明文字或markdown标记。`;
        break;

      case "instances":
        userPrompt = `请为小说《${project.bible.meta.title}》生成 ${count} 个精彩的地点/场景设定。

小说简介：${project.bible.meta.synopsis}
题材：${project.bible.meta.genre}
基调：${project.bible.meta.tone}

【已有地点列表，请不要生成与这些重复或过于相似的地点】：
${existingInstances || "（暂无）"}

【重要要求】
1. **必须生成 ${count} 个地点，不能多也不能少**
2. **所有内容必须使用中文（包括名称、描述等）**
3. 地点类型多样（城市、建筑、自然环境、秘境等）
4. 每个地点要有独特的特色和氛围
5. 地点要有资源、危险或特殊功能
6. 地点要与故事主线有关联
7. **严禁生成与已有地点列表中重复或高度相似的地点**

【返回格式 - 严格遵守】
必须返回一个 JSON 数组，数组长度必须等于 ${count}，示例格式：
[
  {
    "name": "地点中文名称",
    "type": "城市",
    "location": "地理位置描述...",
    "features": "特点描述..."
  },
  ...共${count}个对象
]

字段说明：
- name: 地点中文名称
- type: 地点类型（如：城市、建筑、森林、山脉、秘境等）
- location: 地理位置/方位
- features: 特点描述
- resources: 资源/宝物（可选）
- dangers: 危险/挑战（可选）

请直接返回 JSON 数组，不要包含任何其他说明文字或markdown标记。`;
        break;

      case "climaxes":
        userPrompt = `请为小说《${project.bible.meta.title}》生成 ${count} 个精彩的高潮场景设定。

小说简介：${project.bible.meta.synopsis}
题材：${project.bible.meta.genre}
基调：${project.bible.meta.tone}

【已有高潮场景列表，请不要生成与这些重复或过于相似的场景】：
${existingClimaxes || "（暂无）"}

【重要要求】
1. **必须生成 ${count} 个高潮场景，不能多也不能少**
2. **所有内容必须使用中文（包括名称、描述等）**
3. 高潮类型多样（战斗、剧情反转、情感爆发、真相揭露等）
4. 每个高潮要有明确的位置（建议分布在故事的不同阶段）
5. 场景要有强烈的冲突和张力
6. 高潮要对主角和故事产生深远影响
7. **严禁生成与已有高潮场景列表中重复或高度相似的场景**

【返回格式 - 严格遵守】
必须返回一个 JSON 数组，数组长度必须等于 ${count}，示例格式：
[
  {
    "name": "高潮场景中文名称",
    "type": "战斗",
    "targetPosition": "第一卷结尾",
    "description": "场景详细描述..."
  },
  ...共${count}个对象
]

字段说明：
- name: 高潮场景中文名称
- type: 类型（如：战斗、反转、情感、揭露等）
- targetPosition: 建议位置（如：第一卷中期、第三卷结尾等）
- description: 场景详细描述
- emotionalTone: 情感基调（可选）
- impact: 对故事的影响（可选）

请直接返回 JSON 数组，不要包含任何其他说明文字或markdown标记。`;
        break;

      default:
        return NextResponse.json(
          { success: false, error: "未知的生成类型" },
          { status: 400 }
        );
    }

    // 获取设定模型和 maxTokens
    const settingModel = project.settings.settingModel || process.env.SETTING_MODEL || "gpt-4-turbo";
    const maxTokens = project.settings.maxTokens || parseInt(process.env.MAX_TOKENS || "4096");

    console.log("Sending request to AI with prompt:", userPrompt.slice(0, 200));
    
    // 循环生成直到达到目标数量（最多尝试3次）
    let allItems: unknown[] = [];
    let attempts = 0;
    const maxAttempts = 3;
    
    while (allItems.length < count && attempts < maxAttempts) {
      const remainingCount = count - allItems.length;
      
      // 修改提示词，要求生成剩余数量
      const adjustedPrompt = userPrompt.replace(
        new RegExp(`生成 ${count} 个`, 'g'),
        `生成 ${remainingCount} 个`
      ).replace(
        new RegExp(`数组长度必须等于 ${count}`, 'g'),
        `数组长度必须等于 ${remainingCount}`
      ).replace(
        new RegExp(`...共${count}个对象`, 'g'),
        `...共${remainingCount}个对象`
      );
      
      console.log(`Attempt ${attempts + 1}: Requesting ${remainingCount} items (have ${allItems.length}, need ${count})`);
      
      const result = await generateJSON<unknown[]>({
        model: settingModel,
        systemPrompt,
        userPrompt: adjustedPrompt,
        maxTokens: Math.min(maxTokens, 16000),
        temperature: 0.8,
      });

      if (Array.isArray(result.data)) {
        // 取需要的数量，避免超出
        const itemsToAdd = result.data.slice(0, remainingCount);
        allItems = [...allItems, ...itemsToAdd];
        console.log(`Received ${result.data.length} items, added ${itemsToAdd.length}, total now: ${allItems.length}`);
      } else {
        console.error("AI returned non-array:", result.data);
        break;
      }
      
      attempts++;
    }

    let newItems = allItems;

    // 如果仍然不够，给出警告但仍返回已生成的
    if (newItems.length < count) {
      console.warn(`经过 ${attempts} 次尝试，只生成了 ${newItems.length}/${count} 个 ${type}，请重试或手动添加`);
    }

    // 如果超出，截断
    if (newItems.length > count) {
      newItems = newItems.slice(0, count);
    }

    // 为每个项目添加 ID
    const itemsWithIds = (newItems as Record<string, unknown>[]).map((item) => ({
      ...item,
      id: crypto.randomUUID(),
    }));

    // 类型到 bible 属性名的映射
    const typeToBibleKey: Record<string, keyof typeof project.bible> = {
      characters: "characters",
      factions: "factions",
      instances: "instances",
      climaxes: "climaxScenes",
    };
    
    const bibleKey = typeToBibleKey[type];
    const currentItems = (project.bible[bibleKey] as unknown[]) || [];
    const updatedBible = {
      ...project.bible,
      [bibleKey]: [...currentItems, ...itemsWithIds],
    };

    await updateProject(id, { bible: updatedBible });

    return NextResponse.json({
      success: true,
      data: itemsWithIds,
      count: itemsWithIds.length,
    });
  } catch (error) {
    console.error("Failed to generate bible items:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "生成失败" },
      { status: 500 }
    );
  }
}
