/**
 * 通用 LLM API 客户端
 * 支持 Anthropic Claude 和 OpenAI 兼容格式（包括第三方 API）
 */

import Anthropic from "@anthropic-ai/sdk";
import type { Stream } from "@anthropic-ai/sdk/streaming";

// 从环境变量获取配置
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const ANTHROPIC_BASE_URL = process.env.ANTHROPIC_BASE_URL;

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_BASE_URL = process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";

// 是否使用 max_completion_tokens 参数（某些 API 如 Gemini OpenAI 兼容端点需要）
const USE_MAX_COMPLETION_TOKENS = process.env.USE_MAX_COMPLETION_TOKENS === "true";

// 判断使用哪个 Provider
export type Provider = "anthropic" | "openai";

export function getProvider(): Provider {
  // 如果配置了 OPENAI_API_KEY，优先使用 OpenAI 格式
  if (OPENAI_API_KEY && OPENAI_API_KEY.trim() !== "") {
    return "openai";
  }
  return "anthropic";
}

// 判断模型是否属于 Anthropic
function isAnthropicModel(model: string): boolean {
  const anthropicModels = Object.keys(ANTHROPIC_MODELS);
  return anthropicModels.includes(model) || model.startsWith("claude-");
}

// 判断模型是否属于 OpenAI
function isOpenAIModel(model: string): boolean {
  const openaiPatterns = ["gpt-", "text-", "davinci", "curie", "babbage", "ada"];
  return openaiPatterns.some(pattern => model.toLowerCase().includes(pattern));
}

// 判断模型是否属于 Google Gemini
function isGeminiModel(model: string): boolean {
  return model.toLowerCase().includes("gemini");
}

// 判断模型是否使用 OpenAI 兼容格式（包括第三方 API）
function isOpenAICompatibleModel(model: string): boolean {
  // 如果既不是 Anthropic 也不是 Gemini，则认为是 OpenAI 兼容格式
  return !isAnthropicModel(model) && !isGeminiModel(model);
}

export function isAPIKeyConfigured(): boolean {
  return !!(ANTHROPIC_API_KEY || OPENAI_API_KEY);
}

// 创建 Anthropic 客户端
function createAnthropicClient() {
  return new Anthropic({
    apiKey: ANTHROPIC_API_KEY,
    baseURL: ANTHROPIC_BASE_URL,
  });
}

// 模型映射（Anthropic）
export const ANTHROPIC_MODELS: Record<string, string> = {
  "claude-opus-4-6": "claude-3-opus-20240229",
  "claude-sonnet-4-6": "claude-3-sonnet-20240229",
  "claude-opus": "claude-3-opus-20240229",
  "claude-sonnet": "claude-3-sonnet-20240229",
  "claude-haiku": "claude-3-haiku-20240307",
};

export interface GenerationOptions {
  model?: string;
  systemPrompt: string;
  userPrompt: string;
  maxTokens?: number;
  temperature?: number;
  streaming?: boolean;
}

export interface GenerationResult {
  content: string;
  usage?: {
    inputTokens: number;
    outputTokens: number;
  };
}

/**
 * 统一的生成接口
 */
export async function generateContent(
  options: GenerationOptions
): Promise<GenerationResult> {
  const provider = getProvider();
  const model = options.model || "";
  
  // 智能路由：根据模型名称选择正确的 provider
  if (isAnthropicModel(model)) {
    if (ANTHROPIC_API_KEY) {
      return generateWithAnthropic(options);
    } else {
      throw new Error(
        `模型 "${model}" 需要使用 Anthropic API，但 ANTHROPIC_API_KEY 未配置。\n` +
        `请在 .env.local 中配置 ANTHROPIC_API_KEY。`
      );
    }
  }
  
  // Gemini 和其他模型都使用 OpenAI 兼容格式
  // 因为大多数第三方 API（包括 Gemini 的 OpenAI 兼容端点）都使用这种格式
  if (OPENAI_API_KEY) {
    return generateWithOpenAI(options);
  }
  
  // 默认回退
  throw new Error(
    `无法确定模型 "${model}" 的 API 配置。\n` +
    `请在 .env.local 中配置 OPENAI_API_KEY 或 ANTHROPIC_API_KEY。`
  );
}

/**
 * Anthropic 生成
 */
async function generateWithAnthropic(
  options: GenerationOptions
): Promise<GenerationResult> {
  const {
    model = "claude-sonnet-4-6",
    systemPrompt,
    userPrompt,
    maxTokens = 4096,
    temperature = 0.7,
  } = options;

  const client = createAnthropicClient();
  const modelName = ANTHROPIC_MODELS[model] || model;

  const response = await client.messages.create({
    model: modelName,
    max_tokens: maxTokens,
    temperature,
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
  });

  let content = "";
  for (const block of response.content) {
    if (block.type === "text") {
      content += block.text;
    }
  }

  return {
    content,
    usage: {
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
    },
  };
}

/**
 * OpenAI 兼容格式生成（支持第三方 API）
 */
async function generateWithOpenAI(
  options: GenerationOptions
): Promise<GenerationResult> {
  const {
    model = "gpt-4",
    systemPrompt,
    userPrompt,
    maxTokens = 4096,
    temperature = 0.7,
  } = options;

  // 确保 maxTokens 有效
  const validMaxTokens = Math.max(1, maxTokens);
  
  // 调试日志
  console.log("[generateWithOpenAI] model:", model, "maxTokens:", maxTokens, "validMaxTokens:", validMaxTokens);

  // 构建请求体
  // 注意：某些 API（如 OpenAI o1/o3 模型或 Gemini OpenAI 兼容端点）使用 max_completion_tokens
  // 而不是 max_tokens。设置环境变量 USE_MAX_COMPLETION_TOKENS=true 来使用新参数名
  const requestBody: Record<string, unknown> = {
    model,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature,
  };
  
  // 根据环境变量选择参数名
  if (USE_MAX_COMPLETION_TOKENS) {
    requestBody.max_completion_tokens = validMaxTokens;
  } else {
    requestBody.max_tokens = validMaxTokens;
  }

  const response = await fetch(`${OPENAI_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI API error: ${errorText}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || "";

  return {
    content,
    usage: data.usage ? {
      inputTokens: data.usage.prompt_tokens,
      outputTokens: data.usage.completion_tokens,
    } : undefined,
  };
}

/**
 * 流式生成
 */
export async function* generateContentStream(
  options: GenerationOptions
): AsyncGenerator<{ type: "text" | "error"; content: string }> {
  const model = options.model || "";
  
  // 智能路由：根据模型名称选择正确的 provider
  if (isAnthropicModel(model)) {
    if (ANTHROPIC_API_KEY) {
      yield* generateStreamWithAnthropic(options);
    } else {
      yield { 
        type: "error", 
        content: `模型 "${model}" 需要使用 Anthropic API，但 ANTHROPIC_API_KEY 未配置。请在 .env.local 中配置 ANTHROPIC_API_KEY。`
      };
    }
    return;
  }
  
  // Gemini 和其他模型都使用 OpenAI 兼容格式
  if (OPENAI_API_KEY) {
    yield* generateStreamWithOpenAI(options);
    return;
  }
  
  yield { 
    type: "error", 
    content: `无法确定模型 "${model}" 的 API 配置。请在 .env.local 中配置 OPENAI_API_KEY 或 ANTHROPIC_API_KEY。`
  };
}

/**
 * Anthropic 流式生成
 */
async function* generateStreamWithAnthropic(
  options: GenerationOptions
): AsyncGenerator<{ type: "text" | "error"; content: string }> {
  const {
    model = "claude-sonnet-4-6",
    systemPrompt,
    userPrompt,
    maxTokens = 4096,
    temperature = 0.7,
  } = options;

  try {
    const client = createAnthropicClient();
    const modelName = ANTHROPIC_MODELS[model] || model;

    const stream = await client.messages.create({
      model: modelName,
      max_tokens: maxTokens,
      temperature,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
      stream: true,
    });

    for await (const event of stream) {
      if (event.type === "content_block_delta") {
        if (event.delta.type === "text_delta") {
          yield { type: "text", content: event.delta.text };
        }
      }
    }
  } catch (error) {
    console.error("Stream generation error:", error);
    yield {
      type: "error",
      content: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * OpenAI 兼容格式流式生成（SSE）
 */
async function* generateStreamWithOpenAI(
  options: GenerationOptions
): AsyncGenerator<{ type: "text" | "error"; content: string }> {
  const {
    model = "gpt-4",
    systemPrompt,
    userPrompt,
    maxTokens = 4096,
    temperature = 0.7,
  } = options;

  // 确保 maxTokens 有效
  const validMaxTokens = Math.max(1, maxTokens);

  // 构建请求体
  const requestBody: Record<string, unknown> = {
    model,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature,
    stream: true,
  };
  
  // 根据环境变量选择参数名
  if (USE_MAX_COMPLETION_TOKENS) {
    requestBody.max_completion_tokens = validMaxTokens;
  } else {
    requestBody.max_tokens = validMaxTokens;
  }

  try {
    const response = await fetch(`${OPENAI_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error: ${error}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error("No response body");
    }

    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const data = line.slice(6);
          if (data === "[DONE]") continue;

          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              yield { type: "text", content };
            }
          } catch {
            // 忽略解析错误
          }
        }
      }
    }
  } catch (error) {
    console.error("Stream generation error:", error);
    yield {
      type: "error",
      content: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * 生成 JSON（自动解析）
 */
export async function generateJSON<T>(
  options: GenerationOptions
): Promise<{ data: T; usage?: GenerationResult["usage"] }> {
  const userPromptWithJSON = `${options.userPrompt}

重要：请确保输出是合法的 JSON 格式，不要包含 markdown 代码块标记。`;

  // 确保 maxTokens 有合理的默认值
  const maxTokens = options.maxTokens && options.maxTokens > 0 ? options.maxTokens : 4096;
  
  // 调试日志
  console.log("[generateJSON] model:", options.model, "maxTokens:", maxTokens);

  const result = await generateContent({
    ...options,
    userPrompt: userPromptWithJSON,
    maxTokens,
  });

  try {
    let cleaned = result.content.trim();
    
    // 提取代码块中的内容
    const codeBlockMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) {
      cleaned = codeBlockMatch[1].trim();
      console.log("[generateJSON] Extracted content from code block");
    } else {
      console.log("[generateJSON] No code block found, using raw content");
    }
    
    // 如果没有代码块，尝试从文本中提取 JSON
    if (!codeBlockMatch) {
      // 查找第一个 '[' 或 '{' 的位置
      const firstArray = cleaned.indexOf('[');
      const firstObject = cleaned.indexOf('{');
      let startIndex = -1;
      
      if (firstArray !== -1 && firstObject !== -1) {
        startIndex = Math.min(firstArray, firstObject);
      } else if (firstArray !== -1) {
        startIndex = firstArray;
      } else if (firstObject !== -1) {
        startIndex = firstObject;
      }
      
      if (startIndex !== -1) {
        cleaned = cleaned.substring(startIndex);
        // 查找最后一个 ']' 或 '}' 的位置
        const lastArray = cleaned.lastIndexOf(']');
        const lastObject = cleaned.lastIndexOf('}');
        let endIndex = -1;
        
        if (lastArray !== -1 && lastObject !== -1) {
          // 根据起始字符决定结束字符
          endIndex = cleaned.startsWith('[') ? lastArray : lastObject;
        } else if (lastArray !== -1) {
          endIndex = lastArray;
        } else if (lastObject !== -1) {
          endIndex = lastObject;
        }
        
        if (endIndex !== -1) {
          cleaned = cleaned.substring(0, endIndex + 1);
        }
      }
    }

    // 尝试解析
    try {
      const data = JSON.parse(cleaned) as T;
      return { data, usage: result.usage };
    } catch (parseError) {
      // 如果解析失败，尝试修复常见问题
      console.log("First parse failed, trying to fix...");
      
      // 如果是数组但被截断，尝试补全
      if (cleaned.startsWith('[')) {
        // 找到最后一个完整的对象
        let fixed = cleaned;
        
        // 移除末尾可能的不完整内容
        const lastCompleteObject = fixed.lastIndexOf('},');
        const lastObject = fixed.lastIndexOf('}');
        
        if (lastCompleteObject !== -1 && lastCompleteObject > lastObject - 5) {
          // 截断到最后一个完整对象
          fixed = fixed.substring(0, lastCompleteObject + 1);
        }
        
        // 确保数组闭合
        if (!fixed.trim().endsWith(']')) {
          fixed = fixed.trim() + ']';
        }
        
        try {
          const data = JSON.parse(fixed) as T;
          console.log("Fixed and parsed successfully");
          return { data, usage: result.usage };
        } catch {
          // 继续尝试其他修复
        }
      }
      
      // 尝试提取有效的数组元素（如果是章节数组）
      if (cleaned.startsWith('[') && cleaned.includes('"id"')) {
        try {
          // 尝试匹配所有的章节对象
          const chapterMatches = cleaned.match(/\{[\s\S]*?"id"[\s\S]*?\}/g);
          if (chapterMatches && chapterMatches.length > 0) {
            const validChapters = [];
            for (const match of chapterMatches) {
              try {
                const chapter = JSON.parse(match);
                validChapters.push(chapter);
              } catch {
                // 忽略无效的章节
              }
            }
            if (validChapters.length > 0) {
              console.log(`Extracted ${validChapters.length} valid chapters`);
              return { data: validChapters as unknown as T, usage: result.usage };
            }
          }
        } catch {
          // 提取失败，继续抛出原错误
        }
      }
      
      throw parseError;
    }
  } catch (error) {
    console.error("JSON parse error:", error);
    console.error("Raw content preview:", result.content.substring(0, 1000));
    console.error("Cleaned content preview:", cleaned.substring(0, 1000));
    console.error("Content length:", result.content.length);
    console.error("Cleaned length:", cleaned.length);
    console.error("Starts with bracket:", cleaned.startsWith('['));
    console.error("Ends with bracket:", cleaned.endsWith(']'));
    throw new Error(`Failed to parse JSON response: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * 估算 token 数量（简单估算）
 */
export function estimateTokens(text: string): number {
  const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
  const otherChars = text.length - chineseChars;
  return Math.ceil(chineseChars / 1.5 + otherChars / 4);
}
