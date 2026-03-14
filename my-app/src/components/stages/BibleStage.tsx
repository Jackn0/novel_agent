"use client";

import { useState, useCallback } from "react";
import { ChevronLeft, ChevronRight, Plus, Trash2, Sparkles, Info, User, Users, MapPin, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { GenerateInput } from "@/components/ui/generate-input";
import { GenerateTextarea } from "@/components/ui/generate-textarea";
import { SafeInput } from "@/components/ui/safe-input";
import { SafeTextarea } from "@/components/ui/safe-textarea";
import { ListDetailLayout } from "@/components/ui/list-detail-layout";
import type { 
  NovelProject, 
  NovelStage, 
  NovelMeta, 
  Character, 
  Faction, 
  NovelInstance, 
  ClimaxScene 
} from "@/types/novel";
import { v4 as uuidv4 } from "uuid";

// ==================== 类型定义 ====================

type BibleSubStage = "meta" | "characters" | "factions" | "instances" | "climaxes";

interface BibleStageProps {
  project: NovelProject;
  onUpdate: (updates: Partial<NovelProject>) => Promise<boolean>;
  onConfirm: (nextStage: NovelStage) => Promise<boolean>;
}

// ==================== 工具函数 ====================

// 构建小说上下文
function buildNovelContext(project: NovelProject): string {
  const { bible } = project;
  return `小说基本信息：
标题：${bible.meta.title}
题材：${bible.meta.genre}
基调：${bible.meta.tone}
简介：${bible.meta.synopsis}
核心主题：${bible.meta.themes.join(", ")}

人物设定：
${bible.characters.map(c => `- ${c.name}（${c.role}）：${c.personality?.slice(0, 50)}...`).join("\n")}

势力设定：
${bible.factions.map(f => `- ${f.name}：${f.goal?.slice(0, 50)}...`).join("\n")}

地点设定：
${bible.instances.map(i => `- ${i.name}：${i.features?.slice(0, 50)}...`).join("\n")}

高潮场景：
${bible.climaxScenes.map(c => `- ${c.name}（${c.targetPosition}）`).join("\n")}`;
}

// 系统提示词
function getSystemPrompt(project: NovelProject): string {
  return `你是一位专业的小说设定专家，擅长创作丰富的小说世界观设定。当前小说：${project.bible.meta.title}（${project.bible.meta.genre}）`;
}

// ==================== 模型信息组件 ====================

function ModelInfo({ project }: { project: NovelProject }) {
  return (
    <Card className="bg-muted/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Info className="w-4 h-4" />
          AI 模型配置
        </CardTitle>
        <CardDescription className="text-xs">
          模型配置从环境变量读取，不可在此修改
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">设定模型：</span>
            <Badge variant="secondary" className="ml-2 font-mono">
              {project.settings.settingModel}
            </Badge>
          </div>
          <div>
            <span className="text-muted-foreground">写作模型：</span>
            <Badge variant="secondary" className="ml-2 font-mono">
              {project.settings.writingModel}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ==================== MetaForm：小说基本信息 ====================

interface MetaFormProps {
  project: NovelProject;
  onUpdate: (updates: Partial<NovelProject>) => Promise<boolean>;
}

function MetaForm({ project, onUpdate }: MetaFormProps) {
  const meta = project.bible.meta;
  const context = buildNovelContext(project);
  const systemPrompt = getSystemPrompt(project);

  const updateMeta = useCallback(async (updates: Partial<NovelMeta>) => {
    const newMeta = { ...meta, ...updates };
    await onUpdate({
      bible: {
        ...project.bible,
        meta: newMeta,
      },
    });
  }, [meta, project.bible, onUpdate]);

  return (
    <div className="space-y-6">
      <ModelInfo project={project} />
      
      <Card>
        <CardHeader>
          <CardTitle>小说标题</CardTitle>
        </CardHeader>
        <CardContent>
          <GenerateInput
            fieldName="小说标题"
            fieldDescription="小说的标题，应该简洁有力，反映主题"
            generateContext={context}
            systemPrompt={systemPrompt}
            value={meta.title}
            onChange={(e) => updateMeta({ title: e.target.value })}
            placeholder="输入小说标题"
          />
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>题材</CardTitle>
          </CardHeader>
          <CardContent>
            <GenerateInput
              fieldName="小说题材"
              fieldDescription="小说的题材类型，如玄幻、科幻、言情、悬疑等"
              generateContext={context}
              systemPrompt={systemPrompt}
              value={meta.genre}
              onChange={(e) => updateMeta({ genre: e.target.value })}
              placeholder="如：玄幻、科幻、言情..."
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>基调</CardTitle>
          </CardHeader>
          <CardContent>
            <GenerateInput
              fieldName="小说基调"
              fieldDescription="小说的整体基调，如轻松幽默、严肃沉重、紧张刺激等"
              generateContext={context}
              systemPrompt={systemPrompt}
              value={meta.tone}
              onChange={(e) => updateMeta({ tone: e.target.value })}
              placeholder="如：轻松幽默、严肃沉重..."
            />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>目标读者</CardTitle>
        </CardHeader>
        <CardContent>
          <GenerateInput
            fieldName="目标读者"
            fieldDescription="小说的目标读者群体"
            generateContext={context}
            systemPrompt={systemPrompt}
            value={meta.targetAudience}
            onChange={(e) => updateMeta({ targetAudience: e.target.value })}
            placeholder="如：青少年、成年男性、女性读者..."
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>故事简介</CardTitle>
        </CardHeader>
        <CardContent>
          <GenerateTextarea
            fieldName="故事简介"
            fieldDescription="小说的故事简介，概括主要情节和冲突"
            generateContext={context}
            systemPrompt={systemPrompt}
            value={meta.synopsis}
            onChange={(e) => updateMeta({ synopsis: e.target.value })}
            placeholder="输入故事简介..."
            rows={5}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>核心主题</CardTitle>
        </CardHeader>
        <CardContent>
          <GenerateTextarea
            fieldName="核心主题"
            fieldDescription="小说的核心主题，用逗号分隔多个主题"
            generateContext={context}
            systemPrompt={systemPrompt}
            value={meta.themes.join(", ")}
            onChange={(e) => updateMeta({ themes: e.target.value.split(",").map(t => t.trim()).filter(Boolean) })}
            placeholder="如：成长、友情、复仇、救赎..."
            rows={2}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>写作风格样本</CardTitle>
          <CardDescription>示例文本，用于指导 AI 生成符合风格的正文</CardDescription>
        </CardHeader>
        <CardContent>
          <GenerateTextarea
            fieldName="写作风格样本"
            fieldDescription="一段示例文本，展示期望的写作风格"
            generateContext={context}
            systemPrompt={systemPrompt}
            value={meta.writingStyleSample || ""}
            onChange={(e) => updateMeta({ writingStyleSample: e.target.value })}
            placeholder="输入一段示例文本..."
            rows={6}
          />
        </CardContent>
      </Card>

      <MemoryLevelSetting project={project} onUpdate={onUpdate} />
    </div>
  );
}

// ==================== MemoryLevelSetting：记忆等级设置 ====================

interface MemoryLevelSettingProps {
  project: NovelProject;
  onUpdate: (updates: Partial<NovelProject>) => Promise<boolean>;
}

const memoryLevelDescriptions: Record<number, { name: string; description: string; useCase: string }> = {
  1: {
    name: "基础记忆",
    description: "仅注入当前步骤必需的最少信息，最大程度节省 Token",
    useCase: "适合快速测试、短篇创作或对成本敏感的场景",
  },
  2: {
    name: "标准记忆",
    description: "注入当前步骤相关信息 + 核心设定概要",
    useCase: "平衡质量与成本，适合一般性创作",
  },
  3: {
    name: "增强记忆",
    description: "注入完整圣经 + 当前阶段相关上下文",
    useCase: "推荐设置，确保良好的连贯性和一致性",
  },
  4: {
    name: "完整记忆",
    description: "注入完整圣经 + 大纲/前序章节摘要 + 人物状态追踪",
    useCase: "长篇创作，需要深度上下文理解时使用",
  },
  5: {
    name: "最强记忆",
    description: "注入全部可用信息：圣经、大纲、前序章节、伏笔追踪、写作要点",
    useCase: "追求极致一致性，复杂剧情线和多卷长篇小说",
  },
};

function MemoryLevelSetting({ project, onUpdate }: MemoryLevelSettingProps) {
  // 确保 currentLevel 是有效的数字 1-5，默认为 3
  const rawLevel = project.settings?.memoryLevel;
  const currentLevel = (typeof rawLevel === 'number' && rawLevel >= 1 && rawLevel <= 5) ? rawLevel : 3;

  const updateMemoryLevel = async (level: number) => {
    await onUpdate({
      settings: {
        ...project.settings,
        memoryLevel: level as 1 | 2 | 3 | 4 | 5,
      },
    });
  };

  return (
    <Card className="border-2 border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          AI 记忆等级
        </CardTitle>
        <CardDescription>
          控制 AI 在创作时注入的上下文详细程度，影响生成质量和 Token 消耗
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 等级选择 */}
        <div className="flex items-center gap-2">
          {[1, 2, 3, 4, 5].map((level) => (
            <button
              key={level}
              onClick={() => updateMemoryLevel(level)}
              className={`
                flex-1 py-3 px-2 rounded-lg border-2 transition-all duration-200
                ${currentLevel === level 
                  ? "border-primary bg-primary/10 text-primary font-semibold" 
                  : "border-border hover:border-primary/50 hover:bg-muted"
                }
              `}
            >
              <div className="text-lg">{level}</div>
              <div className="text-xs mt-1">{memoryLevelDescriptions[level].name}</div>
            </button>
          ))}
        </div>

        {/* 当前等级详情 */}
        <div className="bg-muted/50 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="secondary">当前选择</Badge>
            <span className="font-semibold">{memoryLevelDescriptions[currentLevel].name}</span>
          </div>
          <p className="text-sm text-muted-foreground mb-2">
            {memoryLevelDescriptions[currentLevel].description}
          </p>
          <p className="text-xs text-muted-foreground">
            <span className="font-medium">适用场景：</span>
            {memoryLevelDescriptions[currentLevel].useCase}
          </p>
        </div>

        {/* 详细说明 */}
        <div className="space-y-3 text-sm">
          <h4 className="font-medium">各阶段注入的上下文内容：</h4>
          <div className="grid gap-2">
            <div className="flex gap-3">
              <span className="text-muted-foreground w-20 shrink-0">小说预设</span>
              <span className="text-muted-foreground">
                {currentLevel >= 3 ? "完整注入所有步骤" : currentLevel >= 2 ? "核心设定概要" : "仅当前步骤"}
              </span>
            </div>
            <div className="flex gap-3">
              <span className="text-muted-foreground w-20 shrink-0">大纲规划</span>
              <span className="text-muted-foreground">
                {currentLevel >= 4 ? "完整大纲 + 卷详情" : currentLevel >= 3 ? "主线 + 卷概览" : "仅当前卷"}
              </span>
            </div>
            <div className="flex gap-3">
              <span className="text-muted-foreground w-20 shrink-0">章节信息</span>
              <span className="text-muted-foreground">
                {currentLevel >= 5 ? "前5节 + 本章 + 前卷章节" : currentLevel >= 4 ? "前3节 + 本章大纲" : "仅当前章节"}
              </span>
            </div>
            <div className="flex gap-3">
              <span className="text-muted-foreground w-20 shrink-0">人物追踪</span>
              <span className="text-muted-foreground">
                {currentLevel >= 4 ? "全部人物 + 当前状态" : currentLevel >= 3 ? "主要人物 + 状态" : "仅当前章节人物"}
              </span>
            </div>
            <div className="flex gap-3">
              <span className="text-muted-foreground w-20 shrink-0">伏笔追踪</span>
              <span className="text-muted-foreground">
                {currentLevel >= 5 ? "完整伏笔数据库" : currentLevel >= 4 ? "相关伏笔提醒" : "不注入"}
              </span>
            </div>
          </div>
        </div>

        {/* 建议 */}
        <div className="text-xs text-muted-foreground bg-blue-50 p-3 rounded-lg">
          <span className="font-medium text-blue-700">💡 建议：</span>
          <span className="text-blue-600">
            一般推荐选择「3-增强记忆」，在保证质量的同时控制成本。
            对于多卷长篇或复杂剧情，建议选择「4-完整记忆」或「5-最强记忆」。
          </span>
        </div>
      </CardContent>
    </Card>
  );
}


// ==================== CharactersForm：人物设定 ====================

interface CharactersFormProps {
  project: NovelProject;
  onUpdate: (updates: Partial<NovelProject>) => Promise<boolean>;
}

// 扩展 Character 类型以符合 ListItem
interface CharacterListItem extends Character {
  title: string;
  subtitle: string;
}

function CharactersForm({ project, onUpdate }: CharactersFormProps) {
  const characters = project.bible.characters;
  const [selectedId, setSelectedId] = useState<string | null>(
    characters.length > 0 ? characters[0].id : null
  );
  const [aiGenerating, setAiGenerating] = useState(false);
  const context = buildNovelContext(project);
  const systemPrompt = getSystemPrompt(project);

  const generateCharacters = useCallback(async (count: number) => {
    setAiGenerating(true);
    try {
      const response = await fetch(`/api/projects/${project.id}/generate/bible-items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "characters", count }),
      });
      const result = await response.json();
      if (result.success) {
        // 更新项目数据以显示新人物
        const newCharacters = [...characters, ...result.data];
        await onUpdate({
          bible: {
            ...project.bible,
            characters: newCharacters,
          },
        });
        // 选中新生成的第一个
        if (result.data.length > 0) {
          setSelectedId(result.data[0].id);
        }
      } else {
        alert(result.error || "生成失败");
      }
    } catch (error) {
      console.error("Failed to generate characters:", error);
      alert("生成失败，请检查 API 配置");
    } finally {
      setAiGenerating(false);
    }
  }, [project.id, project.bible, characters, onUpdate]);

  const getRoleLabel = (role: Character["role"]) => {
    const labels: Record<string, string> = {
      protagonist: "主角",
      supporting: "配角",
      antagonist: "反派",
      neutral: "中立",
    };
    return labels[role] || role;
  };

  const getRoleBadgeVariant = (role: Character["role"]): "default" | "secondary" | "destructive" | "outline" => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      protagonist: "default",
      supporting: "secondary",
      antagonist: "destructive",
      neutral: "outline",
    };
    return variants[role] || "secondary";
  };

  // 将 Character 转换为 ListItem
  const listItems: CharacterListItem[] = characters.map(c => ({
    ...c,
    title: c.name || "未命名人物",
    subtitle: getRoleLabel(c.role),
  }));

  const addCharacter = useCallback(async () => {
    const newCharacter: Character = {
      id: uuidv4(),
      name: "",
      role: "supporting",
      appearance: "",
      personality: "",
      backstory: "",
      abilities: "",
      motivation: "",
      arc: "",
      relationships: {},
    };
    const newCharacters = [...characters, newCharacter];
    await onUpdate({
      bible: {
        ...project.bible,
        characters: newCharacters,
      },
    });
    setSelectedId(newCharacter.id);
  }, [characters, project.bible, onUpdate]);

  const updateCharacter = useCallback(async (id: string, updates: Partial<Character>) => {
    const newCharacters = characters.map(c => 
      c.id === id ? { ...c, ...updates } : c
    );
    await onUpdate({
      bible: {
        ...project.bible,
        characters: newCharacters,
      },
    });
  }, [characters, project.bible, onUpdate]);

  const removeCharacter = useCallback(async (id: string) => {
    const newCharacters = characters.filter(c => c.id !== id);
    await onUpdate({
      bible: {
        ...project.bible,
        characters: newCharacters,
      },
    });
    if (selectedId === id) {
      setSelectedId(newCharacters.length > 0 ? newCharacters[0].id : null);
    }
  }, [characters, project.bible, onUpdate, selectedId]);

  const renderCharacterItem = (item: CharacterListItem) => (
    <div className="flex items-center gap-2">
      <User className="w-4 h-4 opacity-50" />
      <span className="truncate">{item.title}</span>
    </div>
  );

  const renderCharacterDetail = (item: CharacterListItem) => {
    const character = characters.find(c => c.id === item.id)!;
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">人物详情</h3>
          <Badge variant={getRoleBadgeVariant(character.role)}>
            {getRoleLabel(character.role)}
          </Badge>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>名称</Label>
            <GenerateInput
              fieldName="人物名称"
              fieldDescription="人物的名称"
              generateContext={context}
              systemPrompt={systemPrompt}
              value={character.name}
              onChange={(e) => updateCharacter(character.id, { name: e.target.value })}
              placeholder="输入人物名称"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>角色类型</Label>
              <select
                value={character.role}
                onChange={(e) => updateCharacter(character.id, { role: e.target.value as Character["role"] })}
                className="h-9 w-full px-2 rounded-md border border-input bg-background text-sm"
              >
                <option value="protagonist">主角</option>
                <option value="supporting">配角</option>
                <option value="antagonist">反派</option>
                <option value="neutral">中立</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label>年龄</Label>
              <SafeInput
                value={character.age || ""}
                onChange={(e) => updateCharacter(character.id, { age: e.target.value })}
                placeholder="如：25岁"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>性别</Label>
              <SafeInput
                value={character.gender || ""}
                onChange={(e) => updateCharacter(character.id, { gender: e.target.value })}
                placeholder="如：男、女"
              />
            </div>
            <div className="space-y-2">
              <Label>当前状态</Label>
              <SafeInput
                value={character.currentState || ""}
                onChange={(e) => updateCharacter(character.id, { currentState: e.target.value })}
                placeholder="如：健康、受伤"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>外貌特征</Label>
            <GenerateTextarea
              fieldName={`${character.name || "人物"}外貌特征`}
              fieldDescription="人物的外貌描述"
              generateContext={context}
              systemPrompt={systemPrompt}
              value={character.appearance}
              onChange={(e) => updateCharacter(character.id, { appearance: e.target.value })}
              placeholder="描述人物的外貌特征..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>性格特点</Label>
            <GenerateTextarea
              fieldName={`${character.name || "人物"}性格特点`}
              fieldDescription="人物的性格特征和行为模式"
              generateContext={context}
              systemPrompt={systemPrompt}
              value={character.personality}
              onChange={(e) => updateCharacter(character.id, { personality: e.target.value })}
              placeholder="描述人物的性格特点..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>背景故事</Label>
            <GenerateTextarea
              fieldName={`${character.name || "人物"}背景故事`}
              fieldDescription="人物的过去经历和背景"
              generateContext={context}
              systemPrompt={systemPrompt}
              value={character.backstory}
              onChange={(e) => updateCharacter(character.id, { backstory: e.target.value })}
              placeholder="描述人物的背景故事..."
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label>能力/技能</Label>
            <GenerateTextarea
              fieldName={`${character.name || "人物"}能力技能`}
              fieldDescription="人物的能力、技能或特长"
              generateContext={context}
              systemPrompt={systemPrompt}
              value={character.abilities}
              onChange={(e) => updateCharacter(character.id, { abilities: e.target.value })}
              placeholder="描述人物的能力或技能..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>动机/目标</Label>
            <GenerateTextarea
              fieldName={`${character.name || "人物"}动机目标`}
              fieldDescription="人物行动的核心动机和目标"
              generateContext={context}
              systemPrompt={systemPrompt}
              value={character.motivation}
              onChange={(e) => updateCharacter(character.id, { motivation: e.target.value })}
              placeholder="描述人物的动机和目标..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>人物弧线</Label>
            <GenerateTextarea
              fieldName={`${character.name || "人物"}人物弧线`}
              fieldDescription="人物在故事中的成长和变化"
              generateContext={context}
              systemPrompt={systemPrompt}
              value={character.arc}
              onChange={(e) => updateCharacter(character.id, { arc: e.target.value })}
              placeholder="描述人物在故事中的发展变化..."
              rows={3}
            />
          </div>
        </div>
      </div>
    );
  };

  return (
    <ListDetailLayout
      items={listItems}
      selectedId={selectedId}
      onSelect={setSelectedId}
      onAdd={addCharacter}
      onRemove={removeCharacter}
      renderItem={renderCharacterItem}
      renderDetail={renderCharacterDetail}
      emptyTitle="还没有人物设定"
      emptyDescription="点击添加按钮创建第一个人物"
      addButtonText="添加人物"
      showAIGenerate
      onAIGenerate={generateCharacters}
      aiGenerateLoading={aiGenerating}
    />
  );
}


// ==================== FactionsForm：势力设定 ====================

interface FactionsFormProps {
  project: NovelProject;
  onUpdate: (updates: Partial<NovelProject>) => Promise<boolean>;
}

// 扩展 Faction 类型以符合 ListItem
interface FactionListItem extends Faction {
  title: string;
  subtitle: string;
}

function FactionsForm({ project, onUpdate }: FactionsFormProps) {
  const factions = project.bible.factions;
  const [selectedId, setSelectedId] = useState<string | null>(
    factions.length > 0 ? factions[0].id : null
  );
  const [aiGenerating, setAiGenerating] = useState(false);
  const context = buildNovelContext(project);
  const systemPrompt = getSystemPrompt(project);

  const generateFactions = useCallback(async (count: number) => {
    setAiGenerating(true);
    try {
      const response = await fetch(`/api/projects/${project.id}/generate/bible-items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "factions", count }),
      });
      const result = await response.json();
      if (result.success) {
        const newFactions = [...factions, ...result.data];
        await onUpdate({
          bible: {
            ...project.bible,
            factions: newFactions,
          },
        });
        if (result.data.length > 0) {
          setSelectedId(result.data[0].id);
        }
      } else {
        alert(result.error || "生成失败");
      }
    } catch (error) {
      console.error("Failed to generate factions:", error);
      alert("生成失败，请检查 API 配置");
    } finally {
      setAiGenerating(false);
    }
  }, [project.id, project.bible, factions, onUpdate]);

  const getAlignmentLabel = (alignment: Faction["alignment"]) => {
    const labels: Record<string, string> = {
      good: "正义",
      evil: "邪恶",
      neutral: "中立",
      chaotic: "混乱",
    };
    return labels[alignment] || alignment;
  };

  const getAlignmentBadgeVariant = (alignment: Faction["alignment"]): "default" | "secondary" | "destructive" | "outline" => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      good: "default",
      evil: "destructive",
      neutral: "secondary",
      chaotic: "outline",
    };
    return variants[alignment] || "secondary";
  };

  const getScaleLabel = (scale: Faction["scale"]) => {
    const labels: Record<string, string> = {
      small: "小型",
      medium: "中型",
      large: "大型",
      super: "超大型",
    };
    return labels[scale] || scale;
  };

  // 将 Faction 转换为 ListItem
  const listItems: FactionListItem[] = factions.map(f => ({
    ...f,
    title: f.name || "未命名势力",
    subtitle: getAlignmentLabel(f.alignment),
  }));

  const addFaction = useCallback(async () => {
    const newFaction: Faction = {
      id: uuidv4(),
      name: "",
      type: "",
      alignment: "neutral",
      scale: "medium",
      goal: "",
      characteristics: "",
      hierarchy: "",
      relations: {},
      keyMembers: [],
    };
    const newFactions = [...factions, newFaction];
    await onUpdate({
      bible: {
        ...project.bible,
        factions: newFactions,
      },
    });
    setSelectedId(newFaction.id);
  }, [factions, project.bible, onUpdate]);

  const updateFaction = useCallback(async (id: string, updates: Partial<Faction>) => {
    const newFactions = factions.map(f => 
      f.id === id ? { ...f, ...updates } : f
    );
    await onUpdate({
      bible: {
        ...project.bible,
        factions: newFactions,
      },
    });
  }, [factions, project.bible, onUpdate]);

  const removeFaction = useCallback(async (id: string) => {
    const newFactions = factions.filter(f => f.id !== id);
    await onUpdate({
      bible: {
        ...project.bible,
        factions: newFactions,
      },
    });
    if (selectedId === id) {
      setSelectedId(newFactions.length > 0 ? newFactions[0].id : null);
    }
  }, [factions, project.bible, onUpdate, selectedId]);

  const renderFactionItem = (item: FactionListItem) => (
    <div className="flex items-center gap-2">
      <Users className="w-4 h-4 opacity-50" />
      <span className="truncate">{item.title}</span>
    </div>
  );

  const renderFactionDetail = (item: FactionListItem) => {
    const faction = factions.find(f => f.id === item.id)!;
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">势力详情</h3>
          <Badge variant={getAlignmentBadgeVariant(faction.alignment)}>
            {getAlignmentLabel(faction.alignment)}
          </Badge>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>名称</Label>
            <GenerateInput
              fieldName="势力名称"
              fieldDescription="势力的名称"
              generateContext={context}
              systemPrompt={systemPrompt}
              value={faction.name}
              onChange={(e) => updateFaction(faction.id, { name: e.target.value })}
              placeholder="输入势力名称"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>势力类型</Label>
              <GenerateInput
                fieldName={`${faction.name || "势力"}类型`}
                fieldDescription="势力的类型，如门派、国家、组织等"
                generateContext={context}
                systemPrompt={systemPrompt}
                value={faction.type}
                onChange={(e) => updateFaction(faction.id, { type: e.target.value })}
                placeholder="如：门派、国家、组织..."
              />
            </div>
            <div className="space-y-2">
              <Label>立场</Label>
              <select
                value={faction.alignment}
                onChange={(e) => updateFaction(faction.id, { alignment: e.target.value as Faction["alignment"] })}
                className="h-9 w-full px-2 rounded-md border border-input bg-background text-sm"
              >
                <option value="good">正义</option>
                <option value="neutral">中立</option>
                <option value="evil">邪恶</option>
                <option value="chaotic">混乱</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>规模</Label>
            <select
              value={faction.scale}
              onChange={(e) => updateFaction(faction.id, { scale: e.target.value as Faction["scale"] })}
              className="h-9 w-full px-2 rounded-md border border-input bg-background text-sm"
            >
              <option value="small">小型</option>
              <option value="medium">中型</option>
              <option value="large">大型</option>
              <option value="super">超大型</option>
            </select>
          </div>

          <div className="space-y-2">
            <Label>核心目标</Label>
            <GenerateTextarea
              fieldName={`${faction.name || "势力"}核心目标`}
              fieldDescription="势力的核心目标和追求"
              generateContext={context}
              systemPrompt={systemPrompt}
              value={faction.goal}
              onChange={(e) => updateFaction(faction.id, { goal: e.target.value })}
              placeholder="描述势力的核心目标和追求..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>势力特色</Label>
            <GenerateTextarea
              fieldName={`${faction.name || "势力"}特色`}
              fieldDescription="势力的特点和标志"
              generateContext={context}
              systemPrompt={systemPrompt}
              value={faction.characteristics}
              onChange={(e) => updateFaction(faction.id, { characteristics: e.target.value })}
              placeholder="描述势力的特色..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>内部结构</Label>
            <GenerateTextarea
              fieldName={`${faction.name || "势力"}内部结构`}
              fieldDescription="势力的内部组织和等级结构"
              generateContext={context}
              systemPrompt={systemPrompt}
              value={faction.hierarchy}
              onChange={(e) => updateFaction(faction.id, { hierarchy: e.target.value })}
              placeholder="描述势力的内部结构..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>关键成员</Label>
            <SafeTextarea
              value={(faction.keyMembers || []).join(", ")}
              onChange={(e) => updateFaction(faction.id, { keyMembers: e.target.value.split(",").map(s => s.trim()).filter(Boolean) })}
              placeholder="输入关键成员，用逗号分隔..."
              rows={2}
            />
          </div>
        </div>
      </div>
    );
  };

  return (
    <ListDetailLayout
      items={listItems}
      selectedId={selectedId}
      onSelect={setSelectedId}
      onAdd={addFaction}
      onRemove={removeFaction}
      renderItem={renderFactionItem}
      renderDetail={renderFactionDetail}
      emptyTitle="还没有势力设定"
      emptyDescription="点击添加按钮创建第一个势力"
      addButtonText="添加势力"
      showAIGenerate
      onAIGenerate={generateFactions}
      aiGenerateLoading={aiGenerating}
    />
  );
}


// ==================== InstancesForm：地点设定 ====================

interface InstancesFormProps {
  project: NovelProject;
  onUpdate: (updates: Partial<NovelProject>) => Promise<boolean>;
}

// 扩展 NovelInstance 类型以符合 ListItem
interface InstanceListItem extends NovelInstance {
  title: string;
  subtitle: string;
}

function InstancesForm({ project, onUpdate }: InstancesFormProps) {
  const instances = project.bible.instances;
  const [selectedId, setSelectedId] = useState<string | null>(
    instances.length > 0 ? instances[0].id : null
  );
  const [aiGenerating, setAiGenerating] = useState(false);
  const context = buildNovelContext(project);
  const systemPrompt = getSystemPrompt(project);

  const generateInstances = useCallback(async (count: number) => {
    setAiGenerating(true);
    try {
      const response = await fetch(`/api/projects/${project.id}/generate/bible-items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "instances", count }),
      });
      const result = await response.json();
      if (result.success) {
        const newInstances = [...instances, ...result.data];
        await onUpdate({
          bible: {
            ...project.bible,
            instances: newInstances,
          },
        });
        if (result.data.length > 0) {
          setSelectedId(result.data[0].id);
        }
      } else {
        alert(result.error || "生成失败");
      }
    } catch (error) {
      console.error("Failed to generate instances:", error);
      alert("生成失败，请检查 API 配置");
    } finally {
      setAiGenerating(false);
    }
  }, [project.id, project.bible, instances, onUpdate]);

  // 将 NovelInstance 转换为 ListItem
  const listItems: InstanceListItem[] = instances.map(i => ({
    ...i,
    title: i.name || "未命名地点",
    subtitle: i.type || "地点",
  }));

  const addInstance = useCallback(async () => {
    const newInstance: NovelInstance = {
      id: uuidv4(),
      name: "",
      type: "",
      location: "",
      features: "",
      resources: "",
      relatedPlots: "",
    };
    const newInstances = [...instances, newInstance];
    await onUpdate({
      bible: {
        ...project.bible,
        instances: newInstances,
      },
    });
    setSelectedId(newInstance.id);
  }, [instances, project.bible, onUpdate]);

  const updateInstance = useCallback(async (id: string, updates: Partial<NovelInstance>) => {
    const newInstances = instances.map(i => 
      i.id === id ? { ...i, ...updates } : i
    );
    await onUpdate({
      bible: {
        ...project.bible,
        instances: newInstances,
      },
    });
  }, [instances, project.bible, onUpdate]);

  const removeInstance = useCallback(async (id: string) => {
    const newInstances = instances.filter(i => i.id !== id);
    await onUpdate({
      bible: {
        ...project.bible,
        instances: newInstances,
      },
    });
    if (selectedId === id) {
      setSelectedId(newInstances.length > 0 ? newInstances[0].id : null);
    }
  }, [instances, project.bible, onUpdate, selectedId]);

  const renderInstanceItem = (item: InstanceListItem) => (
    <div className="flex items-center gap-2">
      <MapPin className="w-4 h-4 opacity-50" />
      <span className="truncate">{item.title}</span>
    </div>
  );

  const renderInstanceDetail = (item: InstanceListItem) => {
    const instance = instances.find(i => i.id === item.id)!;
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">地点详情</h3>
          <Badge variant="outline">地点</Badge>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>名称</Label>
            <GenerateInput
              fieldName="地点名称"
              fieldDescription="地点的名称"
              generateContext={context}
              systemPrompt={systemPrompt}
              value={instance.name}
              onChange={(e) => updateInstance(instance.id, { name: e.target.value })}
              placeholder="输入地点名称"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>类型</Label>
              <GenerateInput
                fieldName={`${instance.name || "地点"}类型`}
                fieldDescription="地点的类型，如城市、副本、秘境等"
                generateContext={context}
                systemPrompt={systemPrompt}
                value={instance.type}
                onChange={(e) => updateInstance(instance.id, { type: e.target.value })}
                placeholder="如：城市、副本、秘境..."
              />
            </div>
            <div className="space-y-2">
              <Label>地理位置</Label>
              <GenerateInput
                fieldName={`${instance.name || "地点"}地理位置`}
                fieldDescription="地点的地理位置"
                generateContext={context}
                systemPrompt={systemPrompt}
                value={instance.location}
                onChange={(e) => updateInstance(instance.id, { location: e.target.value })}
                placeholder="描述地点的位置..."
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>特色与危险</Label>
            <GenerateTextarea
              fieldName={`${instance.name || "地点"}特色`}
              fieldDescription="地点的特色、环境描述和潜在危险"
              generateContext={context}
              systemPrompt={systemPrompt}
              value={instance.features}
              onChange={(e) => updateInstance(instance.id, { features: e.target.value })}
              placeholder="描述地点的特色和危险..."
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label>重要资源</Label>
            <GenerateTextarea
              fieldName={`${instance.name || "地点"}重要资源`}
              fieldDescription="地点的重要资源或特产"
              generateContext={context}
              systemPrompt={systemPrompt}
              value={instance.resources}
              onChange={(e) => updateInstance(instance.id, { resources: e.target.value })}
              placeholder="描述地点的重要资源..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>相关剧情</Label>
            <GenerateTextarea
              fieldName={`${instance.name || "地点"}相关剧情`}
              fieldDescription="地点相关的剧情和故事"
              generateContext={context}
              systemPrompt={systemPrompt}
              value={instance.relatedPlots}
              onChange={(e) => updateInstance(instance.id, { relatedPlots: e.target.value })}
              placeholder="描述地点相关的剧情..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>出场章节</Label>
            <SafeInput
              value={instance.appearsInChapters || ""}
              onChange={(e) => updateInstance(instance.id, { appearsInChapters: e.target.value })}
              placeholder="如：第1-5章、第10章..."
            />
          </div>
        </div>
      </div>
    );
  };

  return (
    <ListDetailLayout
      items={listItems}
      selectedId={selectedId}
      onSelect={setSelectedId}
      onAdd={addInstance}
      onRemove={removeInstance}
      renderItem={renderInstanceItem}
      renderDetail={renderInstanceDetail}
      emptyTitle="还没有地点设定"
      emptyDescription="点击添加按钮创建第一个地点"
      addButtonText="添加地点"
      showAIGenerate
      onAIGenerate={generateInstances}
      aiGenerateLoading={aiGenerating}
    />
  );
}


// ==================== ClimaxesForm：高潮场景 ====================

interface ClimaxesFormProps {
  project: NovelProject;
  onUpdate: (updates: Partial<NovelProject>) => Promise<boolean>;
}

// 扩展 ClimaxScene 类型以符合 ListItem
interface ClimaxListItem extends ClimaxScene {
  title: string;
  subtitle: string;
}

function ClimaxesForm({ project, onUpdate }: ClimaxesFormProps) {
  const climaxes = project.bible.climaxScenes;
  const instances = project.bible.instances;
  const characters = project.bible.characters;
  const [selectedId, setSelectedId] = useState<string | null>(
    climaxes.length > 0 ? climaxes[0].id : null
  );
  const [aiGenerating, setAiGenerating] = useState(false);
  const context = buildNovelContext(project);
  const systemPrompt = getSystemPrompt(project);

  const generateClimaxes = useCallback(async (count: number) => {
    setAiGenerating(true);
    try {
      const response = await fetch(`/api/projects/${project.id}/generate/bible-items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "climaxes", count }),
      });
      const result = await response.json();
      if (result.success) {
        const newClimaxes = [...climaxes, ...result.data];
        await onUpdate({
          bible: {
            ...project.bible,
            climaxScenes: newClimaxes,
          },
        });
        if (result.data.length > 0) {
          setSelectedId(result.data[0].id);
        }
      } else {
        alert(result.error || "生成失败");
      }
    } catch (error) {
      console.error("Failed to generate climaxes:", error);
      alert("生成失败，请检查 API 配置");
    } finally {
      setAiGenerating(false);
    }
  }, [project.id, project.bible, climaxes, onUpdate]);

  // 将 ClimaxScene 转换为 ListItem
  const listItems: ClimaxListItem[] = climaxes.map(c => ({
    ...c,
    title: c.name || "未命名场景",
    subtitle: c.targetPosition || "高潮场景",
  }));

  const addClimax = useCallback(async () => {
    const newClimax: ClimaxScene = {
      id: uuidv4(),
      name: "",
      type: "",
      charactersInvolved: [],
      location: "",
      emotionalTone: "",
      description: "",
      impact: "",
      targetPosition: "",
    };
    const newClimaxes = [...climaxes, newClimax];
    await onUpdate({
      bible: {
        ...project.bible,
        climaxScenes: newClimaxes,
      },
    });
    setSelectedId(newClimax.id);
  }, [climaxes, project.bible, onUpdate]);

  const updateClimax = useCallback(async (id: string, updates: Partial<ClimaxScene>) => {
    const newClimaxes = climaxes.map(c => 
      c.id === id ? { ...c, ...updates } : c
    );
    await onUpdate({
      bible: {
        ...project.bible,
        climaxScenes: newClimaxes,
      },
    });
  }, [climaxes, project.bible, onUpdate]);

  const removeClimax = useCallback(async (id: string) => {
    const newClimaxes = climaxes.filter(c => c.id !== id);
    await onUpdate({
      bible: {
        ...project.bible,
        climaxScenes: newClimaxes,
      },
    });
    if (selectedId === id) {
      setSelectedId(newClimaxes.length > 0 ? newClimaxes[0].id : null);
    }
  }, [climaxes, project.bible, onUpdate, selectedId]);

  const renderClimaxItem = (item: ClimaxListItem) => (
    <div className="flex items-center gap-2">
      <Zap className="w-4 h-4 opacity-50" />
      <span className="truncate">{item.title}</span>
    </div>
  );

  const renderClimaxDetail = (item: ClimaxListItem) => {
    const climax = climaxes.find(c => c.id === item.id)!;
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">高潮场景详情</h3>
          <Badge variant="default">高潮</Badge>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>名称</Label>
            <GenerateInput
              fieldName="高潮场景名称"
              fieldDescription="高潮场景的名称"
              generateContext={context}
              systemPrompt={systemPrompt}
              value={climax.name}
              onChange={(e) => updateClimax(climax.id, { name: e.target.value })}
              placeholder="输入高潮场景名称"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>类型</Label>
              <GenerateInput
                fieldName={`${climax.name || "高潮场景"}类型`}
                fieldDescription="高潮场景的类型，如战斗、对决、揭秘等"
                generateContext={context}
                systemPrompt={systemPrompt}
                value={climax.type}
                onChange={(e) => updateClimax(climax.id, { type: e.target.value })}
                placeholder="如：战斗、对决、揭秘..."
              />
            </div>
            <div className="space-y-2">
              <Label>情感基调</Label>
              <GenerateInput
                fieldName={`${climax.name || "高潮场景"}情感基调`}
                fieldDescription="高潮场景的情感基调"
                generateContext={context}
                systemPrompt={systemPrompt}
                value={climax.emotionalTone}
                onChange={(e) => updateClimax(climax.id, { emotionalTone: e.target.value })}
                placeholder="如：紧张、悲壮、激昂..."
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>大概位置</Label>
            <GenerateInput
              fieldName={`${climax.name || "高潮场景"}大概位置`}
              fieldDescription="高潮场景在故事中的大概位置"
              generateContext={context}
              systemPrompt={systemPrompt}
              value={climax.targetPosition}
              onChange={(e) => updateClimax(climax.id, { targetPosition: e.target.value })}
              placeholder="如：第一卷中期、结局前..."
            />
          </div>

          <div className="space-y-2">
            <Label>发生地点</Label>
            <select
              value={climax.location}
              onChange={(e) => updateClimax(climax.id, { location: e.target.value })}
              className="h-9 w-full px-2 rounded-md border border-input bg-background text-sm"
            >
              <option value="">选择地点...</option>
              {instances.map(inst => (
                <option key={inst.id} value={inst.id}>
                  {inst.name || "未命名地点"}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label>参与人物（多选）</Label>
            <div className="border rounded-md p-3 space-y-2 max-h-40 overflow-y-auto">
              {characters.map(char => (
                <label key={char.id} className="flex items-center gap-2 cursor-pointer hover:bg-muted p-1 rounded">
                  <input
                    type="checkbox"
                    checked={(climax.charactersInvolved || []).includes(char.id)}
                    onChange={(e) => {
                      const currentChars = climax.charactersInvolved || [];
                      const newChars = e.target.checked
                        ? [...currentChars, char.id]
                        : currentChars.filter(id => id !== char.id);
                      updateClimax(climax.id, { charactersInvolved: newChars });
                    }}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm">{char.name || "未命名人物"}</span>
                </label>
              ))}
              {characters.length === 0 && (
                <p className="text-sm text-muted-foreground">暂无可用人物，请先在人物设定中添加</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label>场景描述</Label>
            <GenerateTextarea
              fieldName={`${climax.name || "高潮场景"}描述`}
              fieldDescription="高潮场景的详细描述"
              generateContext={context}
              systemPrompt={systemPrompt}
              value={climax.description}
              onChange={(e) => updateClimax(climax.id, { description: e.target.value })}
              placeholder="描述高潮场景的详细内容..."
              rows={5}
            />
          </div>

          <div className="space-y-2">
            <Label>对故事的影响</Label>
            <GenerateTextarea
              fieldName={`${climax.name || "高潮场景"}影响`}
              fieldDescription="高潮场景对故事和人物的影响"
              generateContext={context}
              systemPrompt={systemPrompt}
              value={climax.impact}
              onChange={(e) => updateClimax(climax.id, { impact: e.target.value })}
              placeholder="描述高潮场景对故事发展的影响..."
              rows={3}
            />
          </div>
        </div>
      </div>
    );
  };

  return (
    <ListDetailLayout
      items={listItems}
      selectedId={selectedId}
      onSelect={setSelectedId}
      onAdd={addClimax}
      onRemove={removeClimax}
      renderItem={renderClimaxItem}
      renderDetail={renderClimaxDetail}
      emptyTitle="还没有高潮场景设定"
      emptyDescription="点击添加按钮创建第一个高潮场景"
      addButtonText="添加场景"
      showAIGenerate
      onAIGenerate={generateClimaxes}
      aiGenerateLoading={aiGenerating}
    />
  );
}


// ==================== 阶段映射 ====================

const stageOrder: BibleSubStage[] = ["meta", "characters", "factions", "instances", "climaxes"];

const stageMap: Record<BibleSubStage, NovelStage> = {
  meta: "bible_meta",
  characters: "bible_characters",
  factions: "bible_factions",
  instances: "bible_instances",
  climaxes: "bible_climaxes",
};

const stageLabels: Record<BibleSubStage, string> = {
  meta: "基本信息",
  characters: "人物设定",
  factions: "势力设定",
  instances: "地点设定",
  climaxes: "高潮场景",
};

// 获取当前子阶段
function getCurrentSubStage(projectStage: NovelStage): BibleSubStage {
  switch (projectStage) {
    case "bible_meta":
      return "meta";
    case "bible_characters":
      return "characters";
    case "bible_factions":
      return "factions";
    case "bible_instances":
      return "instances";
    case "bible_climaxes":
      return "climaxes";
    default:
      return "meta";
  }
}

// ==================== 主组件 ====================

export default function BibleStage({ project, onUpdate, onConfirm }: BibleStageProps) {
  const [activeTab, setActiveTab] = useState<BibleSubStage>(getCurrentSubStage(project.currentStage));

  // 处理 Tab 切换
  const handleTabChange = async (tab: BibleSubStage) => {
    setActiveTab(tab);
    // 更新项目阶段
    const newStage = stageMap[tab];
    if (newStage !== project.currentStage) {
      await onUpdate({ currentStage: newStage });
    }
  };

  // 进入下一阶段
  const handleNext = async () => {
    const currentIndex = stageOrder.indexOf(activeTab);
    if (currentIndex < stageOrder.length - 1) {
      const nextTab = stageOrder[currentIndex + 1];
      await handleTabChange(nextTab);
    } else {
      // 完成圣经阶段，进入大纲阶段
      await onConfirm("outline");
    }
  };

  // 返回上一阶段
  const handleBack = async () => {
    const currentIndex = stageOrder.indexOf(activeTab);
    if (currentIndex > 0) {
      const prevTab = stageOrder[currentIndex - 1];
      await handleTabChange(prevTab);
    }
  };

  // 检查是否可以进入下一阶段
  const canProceed = () => {
    switch (activeTab) {
      case "meta":
        return project.bible.meta.title && project.bible.meta.synopsis;
      case "characters":
        return project.bible.characters.length > 0;
      case "factions":
        return project.bible.factions.length > 0;
      case "instances":
        return project.bible.instances.length > 0;
      case "climaxes":
        return project.bible.climaxScenes.length > 0;
      default:
        return false;
    }
  };

  const currentIndex = stageOrder.indexOf(activeTab);
  const isFirst = currentIndex === 0;
  const isLast = currentIndex === stageOrder.length - 1;

  return (
    <div className="space-y-6">
      {/* 阶段标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">小说预设</h1>
          <p className="text-gray-600 mt-1">
            设定小说的世界观、人物、势力和关键场景
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!isFirst && (
            <Button variant="outline" onClick={handleBack}>
              <ChevronLeft className="w-4 h-4 mr-1" />
              上一步
            </Button>
          )}
          <Button onClick={handleNext} disabled={!canProceed()}>
            {isLast ? "完成并继续" : "下一步"}
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </div>

      <Separator />

      {/* Tab 导航 */}
      <Tabs value={activeTab} onValueChange={(v) => handleTabChange(v as BibleSubStage)}>
        <TabsList className="grid grid-cols-5 w-full">
          {stageOrder.map((stage) => (
            <TabsTrigger key={stage} value={stage}>
              {stageLabels[stage]}
            </TabsTrigger>
          ))}
        </TabsList>

        <div className="mt-6">
          <TabsContent value="meta" className="mt-0">
            <MetaForm project={project} onUpdate={onUpdate} />
          </TabsContent>

          <TabsContent value="characters" className="mt-0">
            <CharactersForm project={project} onUpdate={onUpdate} />
          </TabsContent>

          <TabsContent value="factions" className="mt-0">
            <FactionsForm project={project} onUpdate={onUpdate} />
          </TabsContent>

          <TabsContent value="instances" className="mt-0">
            <InstancesForm project={project} onUpdate={onUpdate} />
          </TabsContent>

          <TabsContent value="climaxes" className="mt-0">
            <ClimaxesForm project={project} onUpdate={onUpdate} />
          </TabsContent>
        </div>
      </Tabs>

      {/* 底部导航 */}
      <Separator />
      <div className="flex justify-between">
        {!isFirst ? (
          <Button variant="outline" onClick={handleBack}>
            <ChevronLeft className="w-4 h-4 mr-1" />
            上一步
          </Button>
        ) : (
          <div />
        )}
        <Button onClick={handleNext} disabled={!canProceed()}>
          {isLast ? "完成并继续" : "下一步"}
          <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}
