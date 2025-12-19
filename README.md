# FairyRealm 🧚

FairyRealm 是一个面向小学生和初中生的英语学习 SaaS 产品。用户可以选择一本书，并与扮演英语老师的 AI 进行对话。AI 会根据书本内容进行回答，并纠正学生的语法错误。

## 核心功能

*   **RAG (Retrieval-Augmented Generation)**: AI 基于书本内容回答，防止胡编乱造。
*   **AI 老师角色**: 始终使用英文回答，指出语法错误并提供正确示例。
*   **全栈架构**:这是基于 Cloudflare 生态系统（Pages, Workers, D1, Workers AI）构建的 Monorepo 项目。

## 技术栈

*   **语言**: TypeScript
*   **前端**: Next.js (Cloudflare Pages)
*   **后端**: Hono (Cloudflare Workers)
*   **数据库**: Cloudflare D1 (SQLite)
*   **AI**: Cloudflare Workers AI
*   **包管理**: pnpm workspace

## 目录结构

*   `apps/web`: 前端应用
*   `apps/worker`: 后端 API
*   `packages/shared`: 前后端共享类型
*   `packages/prompts`: AI 提示词管理
*   `migrations`: 数据库表结构变更
*   `scripts`: 数据初始化脚本

## 快速开始

### 1. 安装依赖

在项目根目录下运行：

```bash
pnpm install
```

### 2. 初始化数据库 (本地开发)

首先，确保 D1 数据库已创建（本项目使用 `fairyrealm-db`）。

执行数据库迁移（创建表）：

```bash
cd apps/worker
npx wrangler d1 execute fairyrealm-db --local --file=../../migrations/0000_initial.sql
```

导入测试数据：

```bash
# 在 apps/worker 目录下
npx wrangler d1 execute fairyrealm-db --local --file=../../scripts/seed.sql
```

### 3. 启动开发服务器

**启动后端 (Worker)**:

在 `apps/worker` 目录下：

```bash
pnpm dev
# 运行在 http://localhost:8787
```

**启动前端 (Next.js)**:

在 `apps/web` 目录下：

```bash
pnpm dev
# 运行在 http://localhost:3000
```

打开浏览器访问 `http://localhost:3000` 即可开始使用。

## 部署

本项目配置为通过 GitHub Actions 自动部署到 Cloudflare Pages 和 Workers。
