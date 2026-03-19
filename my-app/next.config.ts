import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 环境变量（仅服务端）
  env: {
    // Anthropic
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
    ANTHROPIC_BASE_URL: process.env.ANTHROPIC_BASE_URL,
    // OpenAI 兼容格式（支持第三方 API）
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    OPENAI_BASE_URL: process.env.OPENAI_BASE_URL,
    // 模型配置
    SETTING_MODEL: process.env.SETTING_MODEL,
    WRITING_MODEL: process.env.WRITING_MODEL,
  },
  // 静态文件服务 - 允许访问 output 目录的有声小说文件
  // 音频文件通过 /api/audio-file?path=xxx 访问
};

export default nextConfig;
