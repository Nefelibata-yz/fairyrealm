# FairyRealm 🧚

FairyRealm 是一个面向小学生和初中生的英语学习 SaaS 产品。用户选择一本书，AI 老师（基于 Cloudflare Workers AI）会根据书本内容与学生对话，并即时纠正语法错误。

**本项目已完整配置为 Cloudflare Edge 架构，并使用 `@opennextjs/cloudflare` 进行 Pages 部署。**

## ⚠️ 关键部署说明 (必读)

1.  **包管理器**: 本项目 **强制使用 npm**。千万不要使用 pnpm。
2.  **Node.js 版本**: 要求 Node.js 20 或更​​高版本。
3.  **构建命令 (Cloudflare Pages)**:
    *   Command: `npm run pages:build` (这会调用 `opennextjs-cloudflare`)
    *   Output Directory: `.open-next/assets`
4.  **构建命令 (Workers)**: `npm run build`

## 快速开始 (本地开发)

### 1. 安装

```bash
npm install
```

### 2. 初始化数据库 (本地 & 远程)

**本地开发:**
```bash
cd apps/worker
npx wrangler d1 execute fairyrealm-db --local --file=../../migrations/0000_initial.sql
npx wrangler d1 execute fairyrealm-db --local --file=../../scripts/seed.sql
```

**远程部署 (同步数据到生产环境):**
确保 `apps/worker/wrangler.toml` 中的 `database_id` 已正确设置。
```bash
cd apps/worker
npx wrangler d1 execute fairyrealm-db --remote --file=../../migrations/0000_initial.sql
npx wrangler d1 execute fairyrealm-db --remote --file=../../scripts/seed.sql
```

### 3. 启动项目

```bash
# 在根目录运行，同时启动 Frontend (3000) 和 Backend (8787)
npm run dev
```

## Cloudflare Pages 配置指南

*   **Build command**: `npm run pages:build`
*   **Build output directory**: `.open-next/assets`
*   **Root directory**: `apps/web`
*   **Environment Variables**:
    *   `NODE_VERSION`: `20.10.0`
