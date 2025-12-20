# FairyRealm 🧚 - AI English Learning Assistant

FairyRealm 是一款专为中小学生设计的沉浸式英语学习 SaaS 产品。通过与 AI 老师进行基于书籍内容的实时对话，学生可以在真实的语境中提升英语能力，并获得即时的语法纠正和专业建议。

## ✨ 核心特性

-   **沉浸式学习**: 基于经典书籍内容进行对话，告别枯燥的单词记忆。
-   **AI 即时反馈**: 基于 Cloudflare Workers AI，提供精准的语法、词汇反馈和鼓励。
-   **Edge 原生架构**: 运行在 Cloudflare 全球边缘网络，极致响应速度。
-   **自适应设计**: 完美适配桌面端与移动端设备。
-   **灵活认证**: 支持游客试用模式和正式学徒账号。

## 🛠 技术栈

-   **Frontend**: Next.js 14 (App Router), CSS Modules
-   **Backend**: Cloudflare Workers
-   **Database**: Cloudflare D1 (SQL Database)
-   **AI**: Cloudflare Workers AI (@cf/meta/llama-3-8b-instruct)
-   **Deployment**: Cloudflare Pages & Workers

## 🚀 快速开始

### 1. 环境准备
- Node.js 20+
- Cloudflare 账号 (用于 AI 和 D1)

### 2. 开发环境配置
```bash
# 安装依赖 (强制使用 npm)
npm install

# 登录 Cloudflare (本地调用 AI 环境必需)
npx wrangler login

# 初始化本地数据库
cd apps/worker
npx wrangler d1 execute fairyrealm-db --local --file=../../migrations/0000_initial.sql
npx wrangler d1 execute fairyrealm-db --local --file=../../scripts/seed.sql
```

### 3. 启动项目
在根目录下运行：
```bash
npm run dev
```
- 前端：`http://localhost:3000`
- 后端：`http://localhost:8787`

## 🌍 部署说明

### 环境变量配置
在 Cloudflare Pages 设置中配置以下变量：
- `NEXT_PUBLIC_API_URL`: 后端 API 地址 (例如 `https://api.fairyrealm.xyz`)
- `NODE_VERSION`: `20.10.0`

### 构建配置
- **Build Command**: `npm run pages:build`
- **Output Directory**: `.open-next/assets`
- **Root Directory**: `apps/web`

---
Copyright © 2025 FairyRealm Team. Built with ❤️ on Cloudflare.
