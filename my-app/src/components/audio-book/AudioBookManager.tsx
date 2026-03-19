"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import VoiceConfigPanel from "./VoiceConfigPanel";
import AudioGenerationPanel from "./AudioGenerationPanel";
import DiscoveredCharacterList from "./DiscoveredCharacterList";
import type { NovelProject, DiscoveredCharacter } from "@/types/novel";
import { Settings, Headphones, Users, RefreshCw } from "lucide-react";

interface AudioBookManagerProps {
  project: NovelProject;
  onProjectUpdate: (project: NovelProject) => void;
}

export default function AudioBookManager({ project, onProjectUpdate }: AudioBookManagerProps) {
  const [activeTab, setActiveTab] = useState("config");

  // 添加发现的人物到语音配置
  const addToVoiceConfig = async (character: DiscoveredCharacter) => {
    const currentConfig = project.voiceConfig || {
      defaultService: "edge" as const,
      maxCharacters: 10,
      pauseBetweenLines: 300,
      characters: [
        {
          characterId: "narrator",
          characterName: "旁白",
          characterType: "narrator" as const,
          service: "edge" as const,
          voiceId: "zh-CN-YunxiNeural",
          speed: 1.0,
          pitch: 0,
          volume: 100,
        },
      ],
    };

    // 检查是否已存在
    const exists = currentConfig.characters.find(
      c => c.characterId === character.id || c.characterName === character.name
    );
    
    if (exists) {
      return;
    }

    // 检查是否超过最大角色数
    if (currentConfig.characters.length >= currentConfig.maxCharacters) {
      alert(`已达到最大角色数限制 (${currentConfig.maxCharacters})`);
      return;
    }

    const updatedConfig = {
      ...currentConfig,
      characters: [
        ...currentConfig.characters,
        {
          characterId: character.id,
          characterName: character.name,
          characterType: "supporting" as const,
          service: currentConfig.defaultService,
          voiceId: "zh-CN-XiaoxiaoNeural", // Edge TTS默认女声
          speed: 1.0,
          pitch: 0,
          volume: 100,
        },
      ],
    };

    try {
      const response = await fetch(`/api/projects/${project.id}/voice-config`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedConfig),
      });
      
      if (response.ok) {
        onProjectUpdate({
          ...project,
          voiceConfig: updatedConfig,
        });
      }
    } catch (error) {
      console.error("Failed to add character to voice config:", error);
    }
  };

  return (
    <div className="space-y-6">
      {/* 头部信息 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">有声书制作</h2>
          <p className="text-muted-foreground">
            为小说生成高质量有声书，支持多角色配音
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Badge variant="outline" className="text-sm">
            <Users className="w-3 h-3 mr-1" />
            发现人物: {project.discoveredCharacters?.length || 0}
          </Badge>
          <Badge variant="outline" className="text-sm">
            <Headphones className="w-3 h-3 mr-1" />
            已配置: {project.voiceConfig?.characters?.length || 0} 角色
          </Badge>
        </div>
      </div>

      {/* 主内容区 */}
      <div className="grid grid-cols-12 gap-6">
        {/* 左侧：发现的人物列表 */}
        <div className="col-span-12 lg:col-span-3">
          <DiscoveredCharacterList
            project={project}
            onAddToVoiceConfig={addToVoiceConfig}
          />
        </div>

        {/* 右侧：配置和生成 */}
        <div className="col-span-12 lg:col-span-9">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="config" className="flex items-center gap-2">
                <Settings className="w-4 h-4" />
                语音配置
              </TabsTrigger>
              <TabsTrigger value="generate" className="flex items-center gap-2">
                <Headphones className="w-4 h-4" />
                生成音频
              </TabsTrigger>
            </TabsList>

            <TabsContent value="config" className="mt-4">
              <VoiceConfigPanel
                project={project}
                onUpdate={async (updates) => {
                  if (updates.voiceConfig) {
                    onProjectUpdate({
                      ...project,
                      voiceConfig: updates.voiceConfig as typeof project.voiceConfig,
                    });
                  }
                  return true;
                }}
              />
            </TabsContent>

            <TabsContent value="generate" className="mt-4">
              {!project.voiceConfig ? (
                <Card>
                  <CardHeader>
                    <CardTitle>请先配置语音</CardTitle>
                    <CardDescription>
                      生成音频前需要先配置语音服务和角色声音
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button onClick={() => setActiveTab("config")}>
                      前往配置
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <AudioGenerationPanel project={project} />
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
