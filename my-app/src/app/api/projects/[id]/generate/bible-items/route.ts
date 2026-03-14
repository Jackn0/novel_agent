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
    const systemPrompt = buildCompleteSystemPrompt(project, "bible_meta", memoryLevel);
    
    let userPrompt = "";

    switch (type) {
      case "characters":
        userPrompt = `请为小说《${project.bible.meta.title}》生成 ${count} 个精彩的人物设定。

小说简介：${project.bible.meta.synopsis}
题材：${project.bible.meta.genre}
基调：${project.bible.meta.tone}

要求：
1. 人物类型要多样（主角、配角、反派、中立都要有）
2. 人物之间要有潜在的关联和冲突
3. 外貌、性格、背景故事要详细且符合题材风格
4. 人物要有独特的动机和能力

【重要】必须使用以下英文字段名返回 JSON：
- name: 人物名称
- role: 角色类型，必须是 "protagonist"(主角) / "supporting"(配角) / "antagonist"(反派) / "neutral"(中立) 之一
- appearance: 外貌描述（100-200字）
- personality: 性格特点（100-200字）
- backstory: 背景故事（150-300字）
- abilities: 能力/技能（可选）
- motivation: 动机/目标（可选）
- arc: 人物弧线（可选）

请生成 ${count} 个人物，以 JSON 数组格式返回。`;
        break;

      case "factions":
        userPrompt = `请为小说《${project.bible.meta.title}》生成 ${count} 个精彩的势力/组织设定。

小说简介：${project.bible.meta.synopsis}
题材：${project.bible.meta.genre}
基调：${project.bible.meta.tone}

要求：
1. 势力类型多样（国家、门派、家族、组织等）
2. 势力之间要有明确的关系（同盟、敌对、中立）
3. 每个势力要有独特的特点、目标和层级结构
4. 势力规模要合理（小型、中型、大型）

【重要】必须使用以下英文字段名返回 JSON：
- name: 势力名称
- type: 势力类型（如：国家、门派、家族、商会等）
- alignment: 阵营，必须是 "good"(正义) / "evil"(邪恶) / "neutral"(中立) / "chaotic"(混乱) 之一
- scale: 规模，必须是 "small"(小型) / "medium"(中型) / "large"(大型) 之一
- goal: 核心目标
- characteristics: 特点/文化（可选）
- hierarchy: 层级结构（可选）

请生成 ${count} 个势力设定，以 JSON 数组格式返回。`;
        break;

      case "instances":
        userPrompt = `请为小说《${project.bible.meta.title}》生成 ${count} 个精彩的地点/场景设定。

小说简介：${project.bible.meta.synopsis}
题材：${project.bible.meta.genre}
基调：${project.bible.meta.tone}

要求：
1. 地点类型多样（城市、建筑、自然环境、秘境等）
2. 每个地点要有独特的特色和氛围
3. 地点要有资源、危险或特殊功能
4. 地点要与故事主线有关联

【重要】必须使用以下英文字段名返回 JSON：
- name: 地点名称
- type: 地点类型（如：城市、建筑、森林、山脉、秘境等）
- location: 地理位置/方位
- features: 特点描述
- resources: 资源/宝物（可选）
- dangers: 危险/挑战（可选）

请生成 ${count} 个地点设定，以 JSON 数组格式返回。`;
        break;

      case "climaxes":
        userPrompt = `请为小说《${project.bible.meta.title}》生成 ${count} 个精彩的高潮场景设定。

小说简介：${project.bible.meta.synopsis}
题材：${project.bible.meta.genre}
基调：${project.bible.meta.tone}

要求：
1. 高潮类型多样（战斗、剧情反转、情感爆发、真相揭露等）
2. 每个高潮要有明确的位置（建议分布在故事的不同阶段）
3. 场景要有强烈的冲突和张力
4. 高潮要对主角和故事产生深远影响

【重要】必须使用以下英文字段名返回 JSON：
- name: 高潮名称
- type: 类型（如：战斗、反转、情感、揭露等）
- targetPosition: 建议位置（如：第一卷中期、第三卷结尾等）
- description: 场景详细描述
- emotionalTone: 情感基调（可选）
- impact: 对故事的影响（可选）

请生成 ${count} 个高潮场景设定，以 JSON 数组格式返回。`;
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
    
    const result = await generateJSON<unknown[]>({
      model: settingModel,
      systemPrompt,
      userPrompt,
      maxTokens: Math.min(maxTokens, 16000),
      temperature: 0.8,
    });

    console.log("AI response:", JSON.stringify(result).slice(0, 500));

    const newItems = result.data;

    // 验证返回数据
    if (!Array.isArray(newItems)) {
      console.error("AI returned non-array:", newItems);
      return NextResponse.json(
        { success: false, error: "AI 返回格式错误" },
        { status: 500 }
      );
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
