import { NextRequest, NextResponse } from "next/server";
import { generateContent } from "@/lib/agent/clients";

/**
 * POST /api/generate/field
 * 为单个字段生成内容
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      fieldName, 
      fieldDescription, 
      currentValue, 
      context,
      systemPrompt,
      model 
    } = body;

    // 构建生成提示
    const userPrompt = `请为以下字段生成内容。

字段名称：${fieldName}
${fieldDescription ? `字段说明：${fieldDescription}` : ""}

${context ? `【上下文信息】\n${context}\n` : ""}

${currentValue ? `【当前值（仅供参考）】\n${currentValue}\n` : ""}

要求：
1. 生成适合该字段的内容
2. 内容要具体、有细节、避免空泛
3. 风格与上下文保持一致
4. 如果是中文小说，使用中文写作

请直接输出生成的内容，不需要额外解释。`;

    // 从环境变量获取设定模型（字段生成属于设定类任务）
    const settingModel = process.env.SETTING_MODEL || "gpt-4-turbo";
    
    const result = await generateContent({
      model: settingModel,
      systemPrompt: systemPrompt || "你是一位专业的小说创作助手，擅长创作各类小说内容。",
      userPrompt,
      maxTokens: 2048,
      temperature: 0.8,
    });

    return NextResponse.json({
      success: true,
      data: result.content.trim(),
      usage: result.usage,
    });
  } catch (error) {
    console.error("Failed to generate field:", error);
    
    // 提供更友好的错误信息
    let errorMessage = "生成失败";
    if (error instanceof Error) {
      errorMessage = error.message;
      
      // 检测常见错误并给出建议
      if (errorMessage.includes("model_not_found") || errorMessage.includes("No available channel")) {
        errorMessage = `模型不可用或配置错误。

可能的原因：
1. 当前配置的 API 不支持该模型
2. API Key 余额不足或已过期
3. 模型名称拼写错误

建议：
- 检查 .env.local 中的 API 配置
- 确认所选模型在您的 API 账户中可用
- 尝试切换为其他模型

原始错误：${error.message}`;
      } else if (errorMessage.includes("401") || errorMessage.includes("Unauthorized")) {
        errorMessage = `API Key 无效或未授权。

请检查 .env.local 中的 API Key 是否正确配置。`;
      } else if (errorMessage.includes("429") || errorMessage.includes("Rate limit")) {
        errorMessage = `API 请求过于频繁，请稍后再试。`;
      }
    }
    
    return NextResponse.json(
      { 
        success: false, 
        error: errorMessage 
      },
      { status: 500 }
    );
  }
}
