"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Save, Mic, User, Users } from "lucide-react";
import type { NovelProject, ProjectVoiceConfig, TTSService, CharacterVoice } from "@/types/novel";

interface VoiceConfigPanelProps {
  project: NovelProject;
  onUpdate: (updates: Partial<NovelProject>) => Promise<boolean>;
}

const TTS_SERVICE_NAMES: Record<TTSService, string> = {
  edge: "Edge TTS (微软免费)",
  baidu: "百度智能云 TTS",
};

const DEFAULT_VOICES: Record<TTSService, { id: string; name: string }[]> = {
  edge: [
    { id: "zh-CN-YunxiNeural", name: "云希 (男声)" },
    { id: "zh-CN-XiaoxiaoNeural", name: "晓晓 (女声)" },
    { id: "zh-CN-YunjianNeural", name: "云健 (男声-新闻)" },
    { id: "zh-CN-XiaoyiNeural", name: "晓伊 (女声-儿童)" },
    { id: "zh-TW-HsiaoChenNeural", name: "曉臻 (台湾女声)" },
  ],
  baidu: [
    { id: "baidu-3", name: "度逍遥 (情感男声-适合旁白)" },
    { id: "baidu-4", name: "度丫丫 (情感女声-适合女主角)" },
    { id: "baidu-0", name: "度小美 (标准女声)" },
    { id: "baidu-1", name: "度小宇 (标准男声)" },
    { id: "baidu-5", name: "度小博 (情感男声-专业)" },
    { id: "baidu-106", name: "度博文 (专业男声-新闻)" },
    { id: "baidu-110", name: "度小童 (儿童声音)" },
    { id: "baidu-111", name: "度小萌 (萝莉女声)" },
    { id: "baidu-5003", name: "度灵儿 (活力女声)" },
    { id: "baidu-5118", name: "度小乔 (温柔女声)" },
  ],
};

export default function VoiceConfigPanel({ project, onUpdate }: VoiceConfigPanelProps) {
  const [config, setConfig] = useState<ProjectVoiceConfig | null>(null);
  const [enabledServices, setEnabledServices] = useState<TTSService[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // 加载语音配置
  useEffect(() => {
    loadVoiceConfig();
  }, [project.id]);

  async function loadVoiceConfig() {
    try {
      const response = await fetch(`/api/projects/${project.id}/voice-config`);
      const result = await response.json();
      if (result.success) {
        setConfig(result.data.voiceConfig);
        setEnabledServices(result.data.enabledServices);
      }
    } catch (error) {
      console.error("Failed to load voice config:", error);
    } finally {
      setLoading(false);
    }
  }

  async function saveVoiceConfig() {
    if (!config) return;
    
    setSaving(true);
    try {
      const response = await fetch(`/api/projects/${project.id}/voice-config`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ voiceConfig: config }),
      });
      const result = await response.json();
      if (result.success) {
        await onUpdate({ voiceConfig: config });
        alert("配置已保存");
      } else {
        alert(result.error || "保存失败");
      }
    } catch (error) {
      console.error("Failed to save voice config:", error);
      alert("保存失败");
    } finally {
      setSaving(false);
    }
  }

  function updateCharacter(characterId: string, updates: Partial<CharacterVoice>) {
    if (!config) return;
    
    setConfig({
      ...config,
      characters: config.characters.map(c => 
        c.characterId === characterId ? { ...c, ...updates } : c
      ),
    });
  }

  function addCharacter() {
    if (!config) return;
    if (config.characters.length >= config.maxCharacters) {
      alert(`最多只能添加 ${config.maxCharacters} 个角色`);
      return;
    }
    
    const newId = `char_${Date.now()}`;
    setConfig({
      ...config,
      characters: [
        ...config.characters,
        {
          characterId: newId,
          characterName: "新角色",
          characterType: "supporting",
          service: config.defaultService,
          voiceId: DEFAULT_VOICES[config.defaultService]?.[0]?.id || "",
          speed: 1.0,
          pitch: 0,
          volume: 100,
        },
      ],
    });
  }

  function removeCharacter(characterId: string) {
    if (!config) return;
    if (characterId === "narrator") {
      alert("旁白角色不能删除");
      return;
    }
    
    setConfig({
      ...config,
      characters: config.characters.filter(c => c.characterId !== characterId),
    });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-purple-600 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-500">加载配置中...</p>
        </div>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">加载配置失败，请刷新页面重试</p>
      </div>
    );
  }

  const narrator = config.characters.find(c => c.characterId === "narrator");
  const heroes = config.characters.filter(c => c.characterType === "hero");
  const heroines = config.characters.filter(c => c.characterType === "heroine");
  const others = config.characters.filter(c => 
    !["narrator", "hero", "heroine"].includes(c.characterType)
  );

  return (
    <div className="space-y-6">
      {/* 全局配置 */}
      <Card>
        <CardHeader>
          <CardTitle>全局配置</CardTitle>
          <CardDescription>配置默认TTS服务和音频参数</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>默认TTS服务</Label>
            <select
              value={config.defaultService}
              onChange={(e) => setConfig({ ...config, defaultService: e.target.value as TTSService })}
              className="h-9 w-full px-2 rounded-md border border-input bg-background text-sm mt-1"
            >
              {enabledServices.map(service => (
                <option key={service} value={service}>
                  {TTS_SERVICE_NAMES[service]}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <Label>最大角色数: {config.maxCharacters}</Label>
            <Slider
              value={[config.maxCharacters]}
              onValueChange={(value) => {
                const values = Array.isArray(value) ? value : [value];
                setConfig({ ...config, maxCharacters: values[0] });
              }}
              min={5}
              max={15}
              step={1}
              className="mt-2"
            />
          </div>
          
          <div>
            <Label>段落间隔: {config.pauseBetweenLines}ms</Label>
            <Slider
              value={[config.pauseBetweenLines]}
              onValueChange={(value) => {
                const values = Array.isArray(value) ? value : [value];
                setConfig({ ...config, pauseBetweenLines: values[0] });
              }}
              min={0}
              max={2000}
              step={100}
              className="mt-2"
            />
          </div>
        </CardContent>
      </Card>

      {/* 角色配置 */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">角色音色配置</h3>
          <Button onClick={addCharacter} size="sm" variant="outline">
            <Plus className="w-4 h-4 mr-1" />
            添加角色
          </Button>
        </div>

        {/* 旁白 */}
        {narrator && (
          <CharacterVoiceCard
            character={narrator}
            enabledServices={enabledServices}
            onUpdate={updateCharacter}
            onRemove={removeCharacter}
            icon={<Mic className="w-5 h-5 text-purple-600" />}
          />
        )}

        {/* 男主角 */}
        {heroes.map(hero => (
          <CharacterVoiceCard
            key={hero.characterId}
            character={hero}
            enabledServices={enabledServices}
            onUpdate={updateCharacter}
            onRemove={removeCharacter}
            icon={<User className="w-5 h-5 text-blue-600" />}
          />
        ))}

        {/* 女主角 */}
        {heroines.map(heroine => (
          <CharacterVoiceCard
            key={heroine.characterId}
            character={heroine}
            enabledServices={enabledServices}
            onUpdate={updateCharacter}
            onRemove={removeCharacter}
            icon={<User className="w-5 h-5 text-pink-600" />}
          />
        ))}

        {/* 其他角色 */}
        {others.map(char => (
          <CharacterVoiceCard
            key={char.characterId}
            character={char}
            enabledServices={enabledServices}
            onUpdate={updateCharacter}
            onRemove={removeCharacter}
            icon={<Users className="w-5 h-5 text-gray-600" />}
          />
        ))}
      </div>

      {/* 保存按钮 */}
      <div className="flex justify-end">
        <Button onClick={saveVoiceConfig} disabled={saving}>
          <Save className="w-4 h-4 mr-2" />
          {saving ? "保存中..." : "保存配置"}
        </Button>
      </div>
    </div>
  );
}

// 角色音色卡片组件
interface CharacterVoiceCardProps {
  character: CharacterVoice;
  enabledServices: TTSService[];
  onUpdate: (id: string, updates: Partial<CharacterVoice>) => void;
  onRemove: (id: string) => void;
  icon: React.ReactNode;
}

function CharacterVoiceCard({ character, enabledServices, onUpdate, onRemove, icon }: CharacterVoiceCardProps) {
  const TTS_SERVICE_NAMES: Record<TTSService, string> = {
    edge: "Edge TTS",
    baidu: "百度 TTS",
  };

  const voices = DEFAULT_VOICES[character.service] || [];

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start gap-4">
          <div className="mt-1">{icon}</div>
          <div className="flex-1 space-y-4">
            <div className="flex items-center gap-4">
              <input
                type="text"
                value={character.characterName}
                onChange={(e) => onUpdate(character.characterId, { characterName: e.target.value })}
                className="flex-1 h-9 px-2 rounded-md border border-input bg-background text-sm font-medium"
                placeholder="角色名称"
              />
              {character.characterId !== "narrator" && (
                <select
                  value={character.characterType}
                  onChange={(e) => onUpdate(character.characterId, { characterType: e.target.value as CharacterVoice["characterType"] })}
                  className="h-9 px-2 rounded-md border border-input bg-background text-sm"
                >
                  <option value="hero">男主角</option>
                  <option value="heroine">女主角</option>
                  <option value="supporting">配角</option>
                  <option value="villain">反派</option>
                  <option value="other">其他</option>
                </select>
              )}
              {character.characterId === "narrator" && (
                <Badge variant="secondary">旁白</Badge>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs">TTS服务</Label>
                <select
                  value={character.service}
                  onChange={(e) => onUpdate(character.characterId, { service: e.target.value as TTSService })}
                  className="h-8 w-full px-2 rounded-md border border-input bg-background text-sm mt-1"
                >
                  {enabledServices.map(service => (
                    <option key={service} value={service}>
                      {TTS_SERVICE_NAMES[service]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label className="text-xs">音色</Label>
                <select
                  value={character.voiceId}
                  onChange={(e) => onUpdate(character.characterId, { voiceId: e.target.value })}
                  className="h-8 w-full px-2 rounded-md border border-input bg-background text-sm mt-1"
                >
                  {voices.map(voice => (
                    <option key={voice.id} value={voice.id}>
                      {voice.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label className="text-xs">语速: {character.speed?.toFixed(1) || 1.0}</Label>
                <Slider
                  value={[character.speed || 1.0]}
                  onValueChange={(value) => {
                    const values = Array.isArray(value) ? value : [value];
                    onUpdate(character.characterId, { speed: values[0] });
                  }}
                  min={0.5}
                  max={2.0}
                  step={0.1}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs">音调: {character.pitch || 0}</Label>
                <Slider
                  value={[character.pitch || 0]}
                  onValueChange={(value) => {
                    const values = Array.isArray(value) ? value : [value];
                    onUpdate(character.characterId, { pitch: values[0] });
                  }}
                  min={-10}
                  max={10}
                  step={1}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs">音量: {character.volume || 100}</Label>
                <Slider
                  value={[character.volume || 100]}
                  onValueChange={(value) => {
                    const values = Array.isArray(value) ? value : [value];
                    onUpdate(character.characterId, { volume: values[0] });
                  }}
                  min={0}
                  max={100}
                  step={5}
                  className="mt-1"
                />
              </div>
            </div>
          </div>
          {character.characterId !== "narrator" && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onRemove(character.characterId)}
              className="text-red-500 hover:text-red-700"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
