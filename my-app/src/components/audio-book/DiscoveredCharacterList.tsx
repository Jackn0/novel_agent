"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, User, Users, RefreshCw } from "lucide-react";
import type { DiscoveredCharacter, NovelProject } from "@/types/novel";

interface DiscoveredCharacterListProps {
  project: NovelProject;
  onAddToVoiceConfig?: (character: DiscoveredCharacter) => void;
}

export default function DiscoveredCharacterList({
  project,
  onAddToVoiceConfig,
}: DiscoveredCharacterListProps) {
  const [characters, setCharacters] = useState<DiscoveredCharacter[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // 加载发现的人物
  const loadCharacters = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    setRefreshing(true);
    
    try {
      const response = await fetch(`/api/projects/${project.id}/detect-characters`);
      const result = await response.json();
      if (result.success) {
        setCharacters(result.data);
      }
    } catch (error) {
      console.error("Failed to load characters:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadCharacters();
  }, [project.id]);

  // 从项目数据中同步（实时更新）
  useEffect(() => {
    if (project.discoveredCharacters) {
      setCharacters(project.discoveredCharacters);
    }
  }, [project.discoveredCharacters]);

  if (loading) {
    return (
      <Card className="w-64">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Users className="w-4 h-4" />
            涉及人物
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="h-8 bg-gray-100 rounded animate-pulse" />
            <div className="h-8 bg-gray-100 rounded animate-pulse" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (characters.length === 0) {
    return (
      <Card className="w-64">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Users className="w-4 h-4" />
            涉及人物
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-gray-400 text-center py-4">
            开始写作后自动识别人物
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-64">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Users className="w-4 h-4" />
            涉及人物
            <Badge variant="secondary" className="text-xs">
              {characters.length}
            </Badge>
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={() => loadCharacters(false)}
            disabled={refreshing}
          >
            <RefreshCw className={`w-3 h-3 ${refreshing ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {characters
            .sort((a, b) => b.mentionCount - a.mentionCount)
            .map((char) => (
              <div
                key={char.id}
                className="flex items-center justify-between p-2 rounded-md bg-gray-50 hover:bg-gray-100 group"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <User className="w-4 h-4 text-gray-400 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{char.name}</p>
                    <p className="text-xs text-gray-400">
                      提及 {char.mentionCount} 次
                      {char.firstAppearChapter && (
                        <span className="ml-1">
                          · 第{char.firstAppearChapter}章
                        </span>
                      )}
                    </p>
                  </div>
                </div>
                {onAddToVoiceConfig && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                    onClick={() => onAddToVoiceConfig(char)}
                    title="添加到语音配置"
                  >
                    <Plus className="w-3 h-3" />
                  </Button>
                )}
              </div>
            ))}
        </div>
        {characters.length > 0 && (
          <p className="text-xs text-gray-400 mt-3 text-center">
            点击 + 添加到语音配置
          </p>
        )}
      </CardContent>
    </Card>
  );
}
