# FairyRealm 🧚

FairyRealm 是一个面向小学生和初中生的英语学习 SaaS 产品。用户选择一本书，AI 老师（基于 Cloudflare Workers AI）会根据书本内容与学生对话，并即时纠正语法错误。

**本项目已完整配置为 Cloudflare Edge 架构，并已修复所有部署问题。**

## ⚠️ 关键部署说明 (必读)

1.  **包管理器**: 本项目 **强制使用 npm**。千万不要使用 pnpm，否则会导致 Cloudflare 构建环境识别错误。
2.  **Node.js 版本**: 要求 Node.js 20 或更​​高版本。
3.  **构建命令**:
    *   Workers: `npm run build` (会自动打桩，虽然 worker 不需要构建过程，但脚本必须存在)
    *   Pages (Frontend): `npm install && npx @cloudflare/next-on-pages@1`

## 快速开始 (本地开发)

### 1. 清理环境 (如果是旧代码)

为了防止缓存冲突，建议先执行清理：

```bash
rm -rf node_modules
rm -rf apps/*/node_modules
rm -rf packages/*/node_modules
rm -f pnpm-lock.yaml pnpm-workspace.yaml
npm install
```

### 2. 初始化数据库

在本地创建 D1 数据库并导入数据：

```bash
cd apps/worker
npx wrangler d1 execute fairyrealm-db --local --file=../../migrations/0000_initial.sql
npx wrangler d1 execute fairyrealm-db --local --file=../../scripts/seed.sql
```

### 3. 启动项目

```bash
# 在根目录运行，同时启动 Frontend (3000) 和 Backend (8787)
npm run dev
```

打开 [http://localhost:3000](http://localhost:3000) 即可使用。

## 目录结构

*   `apps/web`: Next.js 前端，部署到 Cloudflare Pages
*   `apps/worker`: Hono 后端，部署到 Cloudflare Workers
*   `packages/shared`: 共享 TypeScript 类型
*   `packages/prompts`: AI 提示词与教学逻辑

## Cloudflare 部署配置

### Workers (Backend)
*   Build Command: `npm run build`
*   Deploy: 建议使用 GitHub Actions，或者本地 `cd apps/worker && npx wrangler deploy`

### Pages (Frontend)
*   **Build command**: `npm install && npx @cloudflare/next-on-pages@1`
*   **Build output directory**: `.vercel/output/static`
*   **Root directory**: `apps/web`
*   **Environment Variables**:
    *   `NODE_VERSION`: `20.10.0`
