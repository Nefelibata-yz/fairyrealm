# FairyRealm 🧚

FairyRealm 是一个面向小学生和初中生的英语学习 SaaS 产品。用户选择一本书，AI 老师（基于 Cloudflare Workers AI）会根据书本内容与学生对话，并即时纠正语法错误。

本项目基于 Cloudflare 全栈生态构建 (Edge Runtime)。

## ⚠️ 重要提示

本项目使用 **npm** 进行包管理。请**不要**使用 pnpm，以免在部署时产生冲突。

## 目录结构

*   `apps/web`: Next.js 前端 (Pages)
*   `apps/worker`: Hono 后端 (Workers)
*   `packages/shared`: 公共类型定义
*   `packages/prompts`: AI 提示词逻辑
*   `migrations`: 数据库定义
*   `scripts`: 初始化脚本

## 本地开发指南

### 1. 环境准备

确保安装了 Node.js 20+ (推荐使用 v20 LTS)。

```bash
# 安装依赖
npm install
```

### 2. 初始化数据库

本项目使用 Cloudflare D1。在本地开发时，我们需要创建本地数据库并导入数据。

```bash
# 导入表结构
cd apps/worker
npx wrangler d1 execute fairyrealm-db --local --file=../../migrations/0000_initial.sql

# 导入测试书籍数据
npx wrangler d1 execute fairyrealm-db --local --file=../../scripts/seed.sql
```

### 3. 启动项目

在根目录下运行以下命令，将同时启动前端和后端：

```bash
npm run dev
```

*   **前端地址**: http://localhost:3000
*   **后端地址**: http://localhost:8787

## 部署指南 (Cloudflare)

### 准备工作

1. Fork 本仓库到你的 GitHub。
2. 登录 Cloudflare 控制台。

### 部署 D1 数据库

1. 在 Cloudflare > Workers & Pages > D1 中创建一个名为 `fairyrealm-db` 的数据库。
2. 复制生成的 `database_id`。
3. 修改 `apps/worker/wrangler.toml` 中的 `database_id` 为你自己的 ID。
4. **重要**: 你需要在本地运行一次远程迁移（或者在 Cloudflare 控制台上传 SQL）：
   ```bash
   cd apps/worker
   npx wrangler d1 execute fairyrealm-db --remote --file=../../migrations/0000_initial.sql
   npx wrangler d1 execute fairyrealm-db --remote --file=../../scripts/seed.sql
   ```

### 部署 Backend (Workers)

通常可以通过 GitHub Actions 自动部署，或者手动部署：

```bash
cd apps/worker
npm run deploy
```

### 部署 Frontend (Pages)

1. 在 Cloudflare Dashboard > Workers & Pages > Create Application > Pages > Connect to Git.
2. 选择你的仓库 `fairyrealm`.
3. **构建设置 (Build settings)**:
    *   **Framework**: Next.js (Static HTML Export option NOT needed, we use next-on-pages)
    *   **Build command**: `npx @cloudflare/next-on-pages@1` (或者 `npm run pages:build` 如果你在 web/package.json 里配了)
    *   **Build output directory**: `.vercel/output/static` (对于 next-on-pages) 或者 `.next`。
    *   **Root directory**: `apps/web`
4. **环境变量 (Environment variables)**:
    *   设置 `NODE_VERSION` 为 `20.10.0`

> **注意**: 如果使用 Monorepo 部署遇到问题，建议在 Pages 的 "Build settings" 中，Root directory 设为 `/`，Build command 设为 `npm run build` (这会构建所有 workspace)，但通常指定 Root directory 为 `apps/web` 并正确配置 build command 更简单。

**由于我们是 Monorepo，推荐 Pages 配置如下：**
*   **Root directory**: `apps/web`
*   **Build command**: `npm install && npx @cloudflare/next-on-pages@1`

(如果 Cloudflare 自动检测不到 workspace 依赖，可能需要在根目录部署)

## 常见问题

*   **Error: missing script "build" in worker**: 已修复，现在 worker 有默认 build 脚本。
*   **Deploy Error**: 确保删除了 `pnpm-lock.yaml`，只保留 `package-lock.json`。
