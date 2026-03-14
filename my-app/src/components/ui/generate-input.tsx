"use client";

import React, { useState, useCallback } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./button";

export interface GenerateInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  className?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  // 生成相关属性
  fieldName: string;
  fieldDescription?: string;
  generateContext?: string;
  systemPrompt?: string;
  onGenerate?: (value: string) => void;
}

/**
 * 带生成按钮的 Input 组件
 */
export const GenerateInput = React.forwardRef<HTMLInputElement, GenerateInputProps>(
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

    const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      setLocalValue(newValue);
      if (!isComposing) {
        onChange?.(e);
      }
    }, [isComposing, onChange]);

    const handleCompositionStart = useCallback(() => {
      setIsComposing(true);
    }, []);

    const handleCompositionEnd = useCallback((e: React.CompositionEvent<HTMLInputElement>) => {
      setIsComposing(false);
      const target = e.target as HTMLInputElement;
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
      } as unknown as React.ChangeEvent<HTMLInputElement>;
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
          const input = document.createElement("input");
          input.value = newValue;
          const event = {
            target: input,
            currentTarget: input,
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
          } as unknown as React.ChangeEvent<HTMLInputElement>;
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
      <div className="flex gap-2">
        <input
          ref={ref}
          className={cn(
            "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
            "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
            "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
            className
          )}
          value={localValue}
          onChange={handleChange}
          onCompositionStart={handleCompositionStart}
          onCompositionEnd={handleCompositionEnd}
          disabled={disabled || generating}
          {...props}
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={handleGenerate}
          disabled={generating || disabled}
          title={`AI 生成${fieldName}`}
        >
          {generating ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Sparkles className="w-4 h-4" />
          )}
        </Button>
      </div>
    );
  }
);

GenerateInput.displayName = "GenerateInput";

export default GenerateInput;
