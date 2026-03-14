"use client";

import React, { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";

export interface SafeInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  className?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

/**
 * 安全的 Input 组件，正确处理中文输入法合成事件
 * 解决拼音输入时产生重复字符的问题
 */
export const SafeInput = React.forwardRef<HTMLInputElement, SafeInputProps>(
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

    const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
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

    const handleCompositionEnd = useCallback((e: React.CompositionEvent<HTMLInputElement>) => {
      setIsComposing(false);
      
      // 合成结束时，使用最终值触发 onChange
      // 需要创建一个新的事件对象
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

    return (
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
        {...props}
      />
    );
  }
);

SafeInput.displayName = "SafeInput";

export default SafeInput;
