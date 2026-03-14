"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Trash2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface ListItem {
  id: string;
  title: string;
  subtitle?: string;
}

interface ListDetailLayoutProps<T extends ListItem> {
  items: T[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onAdd: () => void;
  onRemove: (id: string) => void;
  renderItem: (item: T) => React.ReactNode;
  renderDetail: (item: T) => React.ReactNode;
  emptyTitle?: string;
  emptyDescription?: string;
  addButtonText?: string;
  showAIGenerate?: boolean;
  onAIGenerate?: (count: number) => void;
  aiGenerateLoading?: boolean;
}

export function ListDetailLayout<T extends ListItem>({
  items,
  selectedId,
  onSelect,
  onAdd,
  onRemove,
  renderItem,
  renderDetail,
  emptyTitle = "还没有项目",
  emptyDescription = "点击添加按钮创建第一个项目",
  addButtonText = "添加",
  showAIGenerate = false,
  onAIGenerate,
  aiGenerateLoading = false,
}: ListDetailLayoutProps<T>) {
  const [aiCount, setAiCount] = useState(3);
  const selectedItem = items.find((item) => item.id === selectedId);

  return (
    <div className="flex gap-4 h-[calc(100vh-280px)] min-h-[500px]">
      {/* 左侧列表 */}
      <div className="w-64 flex flex-col gap-2">
        <div className="flex flex-col gap-2 px-1">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-muted-foreground">
              共 {items.length} 项
            </span>
            <Button onClick={onAdd} variant="outline" size="sm">
              <Plus className="w-4 h-4 mr-1" />
              {addButtonText}
            </Button>
          </div>
          {showAIGenerate && onAIGenerate && (
            <div className="flex items-center gap-2">
              <select
                value={aiCount}
                onChange={(e) => setAiCount(Number(e.target.value))}
                className="h-8 px-2 text-sm rounded-md border border-input bg-background"
                disabled={aiGenerateLoading}
              >
                {[1, 2, 3, 4, 5].map((n) => (
                  <option key={n} value={n}>生成 {n} 个</option>
                ))}
              </select>
              <Button
                onClick={() => onAIGenerate(aiCount)}
                variant="secondary"
                size="sm"
                disabled={aiGenerateLoading}
                className="flex-1"
              >
                <Sparkles className="w-3 h-3 mr-1" />
                {aiGenerateLoading ? "生成中..." : "AI 一键生成"}
              </Button>
            </div>
          )}
        </div>
        
        <ScrollArea className="flex-1 border rounded-md">
          <div className="p-2 space-y-1">
            {items.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                {emptyDescription}
              </div>
            ) : (
              items.map((item) => (
                <div
                  key={item.id}
                  onClick={() => onSelect(item.id)}
                  className={cn(
                    "w-full text-left p-3 rounded-md transition-colors relative group cursor-pointer",
                    selectedId === item.id
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted"
                  )}
                >
                  <div className="pr-8">
                    <div className="font-medium truncate">{item.title}</div>
                    {item.subtitle && (
                      <div className={cn(
                        "text-xs truncate",
                        selectedId === item.id
                          ? "text-primary-foreground/70"
                          : "text-muted-foreground"
                      )}>
                        {item.subtitle}
                      </div>
                    )}
                  </div>
                  <div
                    className={cn(
                      "absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 h-7 w-7 flex items-center justify-center rounded-md cursor-pointer transition-opacity",
                      selectedId === item.id
                        ? "text-primary-foreground hover:bg-primary-foreground/20"
                        : "text-destructive hover:bg-destructive/10"
                    )}
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemove(item.id);
                    }}
                    role="button"
                    tabIndex={-1}
                    title="删除"
                  >
                    <Trash2 className="w-3 h-3" />
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </div>

      {/* 右侧详情 */}
      <div className="flex-1 overflow-auto">
        {selectedItem ? (
          <div className="border rounded-md p-6 h-full">
            {renderDetail(selectedItem)}
          </div>
        ) : (
          <div className="border rounded-md h-full flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <p className="mb-4">{emptyTitle}</p>
              <Button onClick={onAdd} variant="outline">
                <Plus className="w-4 h-4 mr-1" />
                {addButtonText}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
