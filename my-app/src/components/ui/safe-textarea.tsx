"use client";

import React, { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";

export interface SafeTextareaProps extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'onChange'> {
  className?: string;
  onChange?: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
}

/**
 * 安全的 Textarea 组件，正确处理中文输入法合成事件
 * 解决拼音输入时产生重复字符的问题
 */
export const SafeTextarea = React.forwardRef<HTMLTextAreaElement, SafeTextareaProps>(
  ({ className, value: propsValue, onChange, ...props }, ref) => {
    // 内部状态用于直接控制输入框显示
    const [localValue, setLocalValue] = useState<string>(String(propsValue || ""));
    const [isComposing, setIsComposing] = useState(false);

    // 同步外部 value 到内部状态
    useEffect(() => {
      if (!isComposing) {
        setLocalValue(String(propsValue || ""));
      }
    }, [propsValue, isComposing]);

    const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newValue = e.target.value;
      
      // 更新本地状态让输入框立即响应
      setLocalValue(newValue);
      
      // 如果不在合成过程中，触发 onChange
      if (!isComposing) {
        onChange?.(e);
      }
    }, [isComposing, onChange]);

    const handleCompositionStart = useCallback(() => {
      setIsComposing(true);
    }, []);

    const handleCompositionEnd = useCallback((e: React.CompositionEvent<HTMLTextAreaElement>) => {
      setIsComposing(false);
      
      // 合成结束时，使用最终值触发 onChange
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

    return (
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
        {...props}
      />
    );
  }
);

SafeTextarea.displayName = "SafeTextarea";

export default SafeTextarea;
