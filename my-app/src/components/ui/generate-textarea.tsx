"use client";

import React, { useState, useCallback } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./button";

export interface GenerateTextareaProps extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'onChange'> {
  className?: string;
  onChange?: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  // 生成相关属性
  fieldName: string;
  fieldDescription?: string;
  generateContext?: string;
  systemPrompt?: string;
  onGenerate?: (value: string) => void;
}

/**
 * 带生成按钮的 Textarea 组件
 */
export const GenerateTextarea = React.forwardRef<HTMLTextAreaElement, GenerateTextareaProps>(
  ({ 
    className, 
    value: propsValue, 
    onChange, 
    fieldName,
    fieldDescription,
    generateContext,
    systemPrompt,
    onGenerate,
    disabled,
    rows = 3,
    ...props 
  }, ref) => {
    const [localValue, setLocalValue] = useState<string>(String(propsValue || ""));
    const [isComposing, setIsComposing] = useState(false);
    const [generating, setGenerating] = useState(false);

    // 同步外部 value 到内部状态
    React.useEffect(() => {
      if (!isComposing) {
        setLocalValue(String(propsValue || ""));
      }
    }, [propsValue, isComposing]);

    const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newValue = e.target.value;
      setLocalValue(newValue);
      if (!isComposing) {
        onChange?.(e);
      }
    }, [isComposing, onChange]);

    const handleCompositionStart = useCallback(() => {
      setIsComposing(true);
    }, []);

    const handleCompositionEnd = useCallback((e: React.CompositionEvent<HTMLTextAreaElement>) => {
      setIsComposing(false);
      const target = e.target as HTMLTextAreaElement;
      const syntheticEvent = {
        target,
        currentTarget: target,
        bubbles: true,
        cancelable: true,
        nativeEvent: e.nativeEvent,
        persist: () => {},
        isDefaultPrevented: () => false,
        isPropagationStopped: () => false,
        preventDefault: () => {},
        stopPropagation: () => {},
        type: "change",
        timeStamp: e.timeStamp,
      } as unknown as React.ChangeEvent<HTMLTextAreaElement>;
      onChange?.(syntheticEvent);
    }, [onChange]);

    // 生成内容
    const handleGenerate = async () => {
      if (generating || !fieldName) return;
      
      setGenerating(true);
      try {
        const response = await fetch("/api/generate/field", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fieldName,
            fieldDescription,
            currentValue: localValue,
            context: generateContext,
            systemPrompt,
          }),
        });

        const result = await response.json();
        if (result.success) {
          const newValue = result.data;
          setLocalValue(newValue);
          onGenerate?.(newValue);
          
          // 触发 onChange
          const textarea = document.createElement("textarea");
          textarea.value = newValue;
          const event = {
            target: textarea,
            currentTarget: textarea,
            bubbles: true,
            cancelable: true,
            nativeEvent: new Event("change"),
            persist: () => {},
            isDefaultPrevented: () => false,
            isPropagationStopped: () => false,
            preventDefault: () => {},
            stopPropagation: () => {},
            type: "change",
            timeStamp: Date.now(),
          } as unknown as React.ChangeEvent<HTMLTextAreaElement>;
          onChange?.(event);
        }
      } catch (error) {
        console.error("Generate failed:", error);
        alert(error instanceof Error ? error.message : "生成失败");
      } finally {
        setGenerating(false);
      }
    };

    return (
      <div className="space-y-2">
        <div className="flex justify-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleGenerate}
            disabled={generating || disabled}
            className="gap-1"
          >
            {generating ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Sparkles className="w-3 h-3" />
            )}
            随机生成
          </Button>
        </div>
        <textarea
          ref={ref}
          className={cn(
            "border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:bg-input/30 flex field-sizing-content min-h-16 w-full rounded-md border bg-transparent px-3 py-2 text-base shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
            className
          )}
          value={localValue}
          onChange={handleChange}
          onCompositionStart={handleCompositionStart}
          onCompositionEnd={handleCompositionEnd}
          disabled={disabled || generating}
          rows={rows}
          {...props}
        />
      </div>
    );
  }
);

GenerateTextarea.displayName = "GenerateTextarea";

export default GenerateTextarea;
