# 📚 Novel AI Agent — 小说创作与有声书制作助手

> **AI 驱动的小说创作全流程解决方案**  
> 从世界观设定 → 正文写作 → 有声书制作，一站式完成

[![GitHub stars](https://img.shields.io/github/stars/Jackn0/novel_agent?style=social)](https://github.com/Jackn0/novel_agent)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)

---

## ✨ 核心功能

### 📝 结构化小说创作
采用**五阶段渐进创作**模式，让AI成为你的专业创作搭档：

```
小说预设(Bible) → 大纲规划 → 章节大纲 → 小节列表 → 正文写作
```

- **AI 先行，用户审校**：每阶段 AI 生成草稿，用户编辑确认后再进入下一阶段
- **记忆与一致性**：通过"小说预设"系统维护人物、势力、地点设定的一致性
- **智能上下文注入**：自动追踪人物状态、伏笔回收，确保跨章节连贯
- **5级记忆等级**：从基础到最强记忆，灵活控制创作质量与成本

### 🔊 AI 有声书制作（New!）
将小说转换为专业有声书：

- **多角色配音**：AI 自动识别角色，为旁白/角色分配不同音色
- **TTS 引擎支持**：Edge TTS（免费）、百度 TTS （免费部分5w次/天，足以满足个人创作者）
- **27+ 精选音色**：男声/女声/童声/方言，满足各类小说需求
- **智能音频合并**：自动处理段落衔接，输出高质量 MP3

### 🔄 智能续写
导入已有小说进行智能续写：
- 自动分析原作世界观、人物、伏笔
- 智能同步设定到"小说预设"
- 保持文风一致性

---

## 🚀 快速开始

### 1. 环境准备
- **Node.js** 18+
- **npm** 或 **yarn**
- **Python** 3.8+（Edge TTS 需要）
- **FFmpeg**（有声书功能需要）

#### 安装配音依赖

```bash
# 安装 Edge TTS（免费 TTS 引擎）
pip install edge-tts

# 安装 FFmpeg
# macOS
brew install ffmpeg

# Ubuntu/Debian
sudo apt-get install ffmpeg

# Windows
# 下载地址: https://ffmpeg.org/download.html
# 下载后解压并将 bin 目录添加到系统 PATH 环境变量
```

### 2. 安装启动

```bash
# 克隆项目
git clone https://github.com/Jackno/Novel-AI-Agent.git
cd Novel-AI-Agent/my-app

# 安装依赖
npm install

# 配置环境变量
cp .env.example .env.local
# 编辑 .env.local 填入你的 API Key

# 启动开发服务器
npm run dev
```

访问 http://localhost:3000 开始使用！

### 3. 配置 API Key（必需）

编辑 `.env.local` 文件：

```env
# 选择以下任一方式配置 LLM API：

# 方式一：Anthropic Claude
ANTHROPIC_API_KEY=sk-ant-api03-...

# 方式二：OpenAI 兼容 API（DeepSeek、Moonshot 等）
OPENAI_API_KEY=sk-...
OPENAI_BASE_URL=https://api.deepseek.com/v1

# 有声书功能（可选，至少配置一个 TTS）
BAIDU_TTS_API_KEY=...        # 百度 TTS（免费额度充足）
BAIDU_TTS_SECRET_KEY=...
```

---

## 📖 使用示例

### 创作新小说
1. 点击「新建项目」→ 选择「原创小说」
2. 填写「小说预设」：标题、人物、世界观设定
3. AI 生成大纲 → 审核调整 → 确认
4. 进入正文写作，AI 逐节生成，你实时审校

### 制作有声书
1. 在已完成的小说项目中，点击「有声书」
2. 选择「多角色配音」模式
3. 为旁白和角色分配音色（度逍遥、度丫丫等）
4. 点击「开始配音」，AI 逐章生成
5. 下载 MP3 文件，完成！

---

## 🛠️ 技术栈

- **前端**: Next.js 16 + React + TypeScript + Tailwind CSS
- **后端**: Next.js API Routes
- **存储**: 本地 JSON 文件存储
- **AI**: 支持 Claude、GPT-4、DeepSeek、Moonshot 等
- **TTS**: Edge TTS、百度智能云 TTS

---

## 📚 文档

- [📖 完整技术手册](docs/TECHNICAL_MANUAL.md) - 详细的架构设计、API 文档、开发指南

---

## 🌟 为什么选 Novel AI Agent？

| 特性 | 传统 AI 写作工具 | Novel AI Agent |
|------|-----------------|----------------|
| 创作流程 | 单轮生成 | **五阶段渐进，层层细化** |
| 一致性 | 容易崩人设 | **预设系统 + 状态追踪** |
| 上下文 | 容易遗忘 | **5级记忆，超长上下文** |
| 有声书 | 需第三方工具 | **内置多角色配音** |
| 续写 | 格式混乱 | **智能分析，格式保留** |

---

## 🗺️ 路线图

- [x] 五阶段结构化创作
- [x] 多角色有声书制作
- [x] 智能续写功能
- [x] 5级 AI 记忆系统
- [ ] 导出功能（Word/PDF/ePub）
- [ ] 人物关系图谱可视化
- [ ] 伏笔追踪可视化
- [ ] 团队协作功能

---

## 🤝 贡献

欢迎提交 Issue 和 PR！

**作者**: [@Jackno](https://github.com/Jackno)  
**许可证**: MIT License

---

**Happy Writing & Listening! 🎉**
