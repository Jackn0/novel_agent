"use client";

import { useState } from "react";
import { 
  ArrowLeft, 
  ArrowRight, 
  CheckCircle2, 
  User, 
  Users, 
  MapPin, 
  Shield, 
  Sparkles,
  Plus,
  Trash2,
  BookOpen,
  AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import type { 
  NovelProject, 
  NovelStage, 
  Character, 
  Faction, 
  NovelInstance,
  AnalyzedCharacter 
} from "@/types/novel";
import { v4 as uuidv4 } from "uuid";

interface ContinuationBibleStageProps {
  project: NovelProject;
  onUpdate: (updates: Partial<NovelProject>) => Promise<boolean>;
  onConfirm: (nextStage: NovelStage) => Promise<boolean>;
}

export default function ContinuationBibleStage({
  project,
  onUpdate,
  onConfirm,
}: ContinuationBibleStageProps) {
  const analysisResult = project.continuation?.analysisResult;
  
  // 本地状态：编辑中的圣经设定
  const [characters, setCharacters] = useState<Character[]>(project.bible.characters);
  const [factions, setFactions] = useState<Faction[]>(project.bible.factions);
  const [instances, setInstances] = useState<NovelInstance[]>(project.bible.instances);
  const [worldSummary, setWorldSummary] = useState(analysisResult?.worldSummary || "");
  const [hasChanges, setHasChanges] = useState(false);

  // 从分析结果一键导入角色
  function importCharactersFromAnalysis() {
    if (!analysisResult?.characters) return;
    
    const newCharacters: Character[] = analysisResult.characters.map((ac) => ({
      id: uuidv4(),
      name: ac.name,
      role: ac.role,
      appearance: "", // 需要用户补充
      personality: ac.description || "",
      backstory: "",
      abilities: "",
      motivation: "",
      arc: ac.arcDirection || "",
      relationships: {},
      currentState: ac.currentState || "",
    }));
    
    setCharacters([...characters, ...newCharacters]);
    setHasChanges(true);
  }

  // 从分析结果一键导入势力
  function importFactionsFromAnalysis() {
    if (!analysisResult?.factions) return;
    
    const newFactions: Faction[] = analysisResult.factions.map((name) => ({
      id: uuidv4(),
      name,
      type: "organization",
      alignment: "neutral",
      scale: "medium",
      goal: "",
      characteristics: "",
      hierarchy: "",
      relations: {},
      keyMembers: [],
    }));
    
    setFactions([...factions, ...newFactions]);
    setHasChanges(true);
  }

  // 从分析结果一键导入地点
  function importLocationsFromAnalysis() {
    if (!analysisResult?.keyLocations) return;
    
    const newInstances: NovelInstance[] = analysisResult.keyLocations.map((name) => ({
      id: uuidv4(),
      name,
      type: "location",
      location: "",
      features: "",
      resources: "",
      relatedPlots: "",
    }));
    
    setInstances([...instances, ...newInstances]);
    setHasChanges(true);
  }

  // 添加新角色
  function addCharacter() {
    const newChar: Character = {
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
    setCharacters([...characters, newChar]);
    setHasChanges(true);
  }

  // 更新角色
  function updateCharacter(id: string, updates: Partial<Character>) {
    setCharacters(chars => 
      chars.map(c => c.id === id ? { ...c, ...updates } : c)
    );
    setHasChanges(true);
  }

  // 删除角色
  function removeCharacter(id: string) {
    setCharacters(chars => chars.filter(c => c.id !== id));
    setHasChanges(true);
  }

  // 添加新势力
  function addFaction() {
    const newFaction: Faction = {
      id: uuidv4(),
      name: "",
      type: "organization",
      alignment: "neutral",
      scale: "medium",
      goal: "",
      characteristics: "",
      hierarchy: "",
      relations: {},
      keyMembers: [],
    };
    setFactions([...factions, newFaction]);
    setHasChanges(true);
  }

  // 更新势力
  function updateFaction(id: string, updates: Partial<Faction>) {
    setFactions(factions => 
      factions.map(f => f.id === id ? { ...f, ...updates } : f)
    );
    setHasChanges(true);
  }

  // 删除势力
  function removeFaction(id: string) {
    setFactions(factions => factions.filter(f => f.id !== id));
    setHasChanges(true);
  }

  // 添加新地点
  function addInstance() {
    const newInstance: NovelInstance = {
      id: uuidv4(),
      name: "",
      type: "location",
      location: "",
      features: "",
      resources: "",
      relatedPlots: "",
    };
    setInstances([...instances, newInstance]);
    setHasChanges(true);
  }

  // 更新地点
  function updateInstance(id: string, updates: Partial<NovelInstance>) {
    setInstances(instances => 
      instances.map(i => i.id === id ? { ...i, ...updates } : i)
    );
    setHasChanges(true);
  }

  // 删除地点
  function removeInstance(id: string) {
    setInstances(instances => instances.filter(i => i.id !== id));
    setHasChanges(true);
  }

  // 保存到项目
  async function saveToProject() {
    const success = await onUpdate({
      bible: {
        ...project.bible,
        characters,
        factions,
        instances,
        meta: {
          ...project.bible.meta,
          synopsis: worldSummary || project.bible.meta.synopsis,
        },
      },
    });
    
    if (success) {
      setHasChanges(false);
    }
    return success;
  }

  // 进入下一阶段
  async function handleNext() {
    if (hasChanges) {
      const saved = await saveToProject();
      if (!saved) {
        alert("保存失败，请重试");
        return;
      }
    }
    await onConfirm("continuation_outline");
  }

  if (!analysisResult) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">同步设定</h1>
            <p className="text-gray-600 mt-1">请先完成 AI 分析</p>
          </div>
        </div>
        <Card className="p-8 text-center">
          <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">没有可用的分析结果</p>
          <Button 
            className="mt-4" 
            onClick={() => onConfirm("continuation_analysis")}
          >
            返回分析
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 标题栏 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">同步设定</h1>
          <p className="text-gray-600 mt-1">
            基于 AI 分析结果，同步/编辑小说预设设定
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => onConfirm("continuation_analysis")}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            返回
          </Button>
          <Button onClick={handleNext}>
            <ArrowRight className="w-4 h-4 mr-2" />
            下一步
          </Button>
        </div>
      </div>

      {/* 世界概况 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="w-5 h-5" />
            世界概况
          </CardTitle>
          <CardDescription>
            基于分析结果的世界观总结，可作为小说简介使用
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            value={worldSummary}
            onChange={(e) => {
              setWorldSummary(e.target.value);
              setHasChanges(true);
            }}
            rows={4}
            placeholder="世界观总结..."
            className="resize-none"
          />
        </CardContent>
      </Card>

      {/* 主要设定标签页 */}
      <Tabs defaultValue="characters" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="characters" className="flex items-center gap-2">
            <User className="w-4 h-4" />
            角色 ({characters.length})
          </TabsTrigger>
          <TabsTrigger value="factions" className="flex items-center gap-2">
            <Shield className="w-4 h-4" />
            势力 ({factions.length})
          </TabsTrigger>
          <TabsTrigger value="locations" className="flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            地点 ({instances.length})
          </TabsTrigger>
        </TabsList>

        {/* 角色设定 */}
        <TabsContent value="characters" className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-medium">角色设定</h3>
              <p className="text-sm text-gray-500">
                AI 识别到 {analysisResult.characters?.length || 0} 个角色
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={importCharactersFromAnalysis}
                disabled={!analysisResult.characters?.length}
              >
                <Sparkles className="w-4 h-4 mr-2" />
                导入分析结果
              </Button>
              <Button size="sm" onClick={addCharacter}>
                <Plus className="w-4 h-4 mr-2" />
                添加角色
              </Button>
            </div>
          </div>

          <ScrollArea className="h-[500px]">
            <div className="space-y-3 pr-4">
              {characters.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <User className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                  <p>暂无角色设定</p>
                  <Button 
                    variant="outline" 
                    className="mt-4"
                    onClick={importCharactersFromAnalysis}
                    disabled={!analysisResult.characters?.length}
                  >
                    从分析结果导入
                  </Button>
                </div>
              ) : (
                characters.map((char) => (
                  <Card key={char.id}>
                    <CardContent className="p-4 space-y-3">
                      <div className="flex gap-3">
                        <div className="flex-1">
                          <Label className="text-xs text-gray-500">角色名称</Label>
                          <Input
                            value={char.name}
                            onChange={(e) => updateCharacter(char.id, { name: e.target.value })}
                            placeholder="角色名"
                            className="mt-1"
                          />
                        </div>
                        <div className="w-32">
                          <Label className="text-xs text-gray-500">角色定位</Label>
                          <select
                            value={char.role}
                            onChange={(e) => updateCharacter(char.id, { role: e.target.value as Character["role"] })}
                            className="w-full h-10 px-3 rounded-md border border-input bg-background mt-1"
                          >
                            <option value="protagonist">主角</option>
                            <option value="supporting">配角</option>
                            <option value="antagonist">反派</option>
                            <option value="neutral">中立</option>
                          </select>
                        </div>
                        <div className="flex items-end">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeCharacter(char.id)}
                            className="text-red-500"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs text-gray-500">角色性格</Label>
                        <Textarea
                          value={char.personality}
                          onChange={(e) => updateCharacter(char.id, { personality: e.target.value })}
                          placeholder="角色性格特点..."
                          rows={2}
                          className="mt-1 resize-none"
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-gray-500">当前状态 / 发展方向</Label>
                        <Input
                          value={char.currentState}
                          onChange={(e) => updateCharacter(char.id, { currentState: e.target.value })}
                          placeholder="角色当前状态..."
                          className="mt-1"
                        />
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* 势力设定 */}
        <TabsContent value="factions" className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-medium">势力设定</h3>
              <p className="text-sm text-gray-500">
                AI 识别到 {analysisResult.factions?.length || 0} 个势力
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={importFactionsFromAnalysis}
                disabled={!analysisResult.factions?.length}
              >
                <Sparkles className="w-4 h-4 mr-2" />
                导入分析结果
              </Button>
              <Button size="sm" onClick={addFaction}>
                <Plus className="w-4 h-4 mr-2" />
                添加势力
              </Button>
            </div>
          </div>

          <ScrollArea className="h-[500px]">
            <div className="space-y-3 pr-4">
              {factions.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Shield className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                  <p>暂无势力设定</p>
                </div>
              ) : (
                factions.map((faction) => (
                  <Card key={faction.id}>
                    <CardContent className="p-4 space-y-3">
                      <div className="flex gap-3">
                        <div className="flex-1">
                          <Label className="text-xs text-gray-500">势力名称</Label>
                          <Input
                            value={faction.name}
                            onChange={(e) => updateFaction(faction.id, { name: e.target.value })}
                            placeholder="势力名"
                            className="mt-1"
                          />
                        </div>
                        <div className="flex items-end">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeFaction(faction.id)}
                            className="text-red-500"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs text-gray-500">势力特点</Label>
                        <Textarea
                          value={faction.characteristics}
                          onChange={(e) => updateFaction(faction.id, { characteristics: e.target.value })}
                          placeholder="势力的性质、特点..."
                          rows={2}
                          className="mt-1 resize-none"
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-gray-500">目标 / 宗旨</Label>
                        <Input
                          value={faction.goal}
                          onChange={(e) => updateFaction(faction.id, { goal: e.target.value })}
                          placeholder="势力的目标..."
                          className="mt-1"
                        />
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* 地点设定 */}
        <TabsContent value="locations" className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-medium">地点设定</h3>
              <p className="text-sm text-gray-500">
                AI 识别到 {analysisResult.keyLocations?.length || 0} 个关键地点
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={importLocationsFromAnalysis}
                disabled={!analysisResult.keyLocations?.length}
              >
                <Sparkles className="w-4 h-4 mr-2" />
                导入分析结果
              </Button>
              <Button size="sm" onClick={addInstance}>
                <Plus className="w-4 h-4 mr-2" />
                添加地点
              </Button>
            </div>
          </div>

          <ScrollArea className="h-[500px]">
            <div className="space-y-3 pr-4">
              {instances.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <MapPin className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                  <p>暂无地点设定</p>
                </div>
              ) : (
                instances.map((instance) => (
                  <Card key={instance.id}>
                    <CardContent className="p-4 space-y-3">
                      <div className="flex gap-3">
                        <div className="flex-1">
                          <Label className="text-xs text-gray-500">地点名称</Label>
                          <Input
                            value={instance.name}
                            onChange={(e) => updateInstance(instance.id, { name: e.target.value })}
                            placeholder="地点名"
                            className="mt-1"
                          />
                        </div>
                        <div className="flex items-end">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeInstance(instance.id)}
                            className="text-red-500"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs text-gray-500">地点特点</Label>
                        <Textarea
                          value={instance.features}
                          onChange={(e) => updateInstance(instance.id, { features: e.target.value })}
                          placeholder="地点的外观、氛围..."
                          rows={2}
                          className="mt-1 resize-none"
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-gray-500">相关剧情</Label>
                        <Input
                          value={instance.relatedPlots}
                          onChange={(e) => updateInstance(instance.id, { relatedPlots: e.target.value })}
                          placeholder="此地点在故事中的作用..."
                          className="mt-1"
                        />
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>

      {/* 底部操作栏 */}
      <div className="flex justify-between items-center pt-4 border-t">
        <div className="flex items-center gap-2">
          {hasChanges && (
            <Badge variant="secondary">有未保存的更改</Badge>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={saveToProject}
            disabled={!hasChanges}
          >
            <CheckCircle2 className="w-4 h-4 mr-2" />
            保存设定
          </Button>
          <Button onClick={handleNext}>
            <ArrowRight className="w-4 h-4 mr-2" />
            下一步：生成大纲
          </Button>
        </div>
      </div>
    </div>
  );
}
