<div align="center">

# 🔖 TMarks

**AI 驱动的智能书签管理系统**

[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.3%20%7C%2019-61dafb.svg)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-6.0%20%7C%207-646cff.svg)](https://vitejs.dev/)
[![Cloudflare](https://img.shields.io/badge/Cloudflare-Workers-f38020.svg)](https://workers.cloudflare.com/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

简体中文

[在线演示](https://tmarks.669696.xyz) | [问题反馈](https://github.com/yourusername/tmarks/issues)

---

## 🚀 一键部署

[![Deploy to Cloudflare Pages](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/yourusername/tmarks)

> 点击按钮后,Cloudflare会自动:
> 1. Fork仓库到你的GitHub账号
> 2. 创建Cloudflare Pages项目
> 3. 配置构建设置
> 4. 开始首次部署
>
> ⚠️ **部署后还需要手动配置:**
> - 创建D1数据库并运行迁移
> - 创建KV命名空间
> - 配置环境变量(JWT_SECRET、ENCRYPTION_KEY)
> - 绑定D1和KV资源
>
> 详细步骤请查看 [部署指南](#-部署)

</div>

---

## ✨ 项目简介

TMarks 是一个现代化的智能书签管理系统，结合 AI 技术自动生成标签，让书签管理变得简单高效。

### 核心特性

- 📚 **智能书签管理** - AI自动标签、多维筛选、批量操作、拖拽排序
- 🗂️ **标签页组管理** - 一键收纳标签页、智能分组、快速恢复
- 🌐 **公开分享** - 创建个性化书签展示页、KV缓存加速
- 🔌 **浏览器扩展** - 快速保存、AI推荐、离线支持、自动同步
- 🔐 **安全可靠** - JWT认证、API Key管理、数据加密

### 技术栈

- **前端**: React 18/19 + TypeScript + Vite + TailwindCSS 4
- **后端**: Cloudflare Workers + Pages Functions
- **数据库**: Cloudflare D1 (SQLite)
- **缓存**: Cloudflare KV
- **AI集成**: 支持 OpenAI、Anthropic、DeepSeek、智谱等8+提供商
---

## 🚀 快速开始

### 本地开发

```bash
# 1. 克隆项目
git clone https://github.com/yourusername/tmarks.git
cd tmarks

# 2. 安装依赖
cd tmarks
pnpm install

# 3. 创建数据库并迁移
wrangler d1 create tmarks-prod-db --local
pnpm db:migrate:local

# 4. 启动开发服务器
pnpm dev
# 访问 http://localhost:5173
```

### 浏览器扩展开发

```bash
# 1. 安装依赖
cd tab
pnpm install

# 2. 启动开发模式
pnpm dev

# 3. 加载扩展
# Chrome: chrome://extensions/ → 开发者模式 → 加载已解压的扩展程序 → 选择 tab/dist
# Firefox: about:debugging → 临时载入附加组件 → 选择 tab/dist/manifest.json
```

---

## 🚀 部署

### 快速部署

**前置要求:**
- Cloudflare账号
- GitHub账号
- 安装Wrangler CLI: `npm install -g wrangler`

**步骤:**

1. **Fork仓库并连接**
   - Fork本仓库到你的GitHub
   - 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)
   - Workers & Pages → Create → Connect to Git → 选择你的仓库

2. **配置构建**
   - Root directory: `tmarks`
   - Build command: `pnpm install && pnpm build:deploy`
   - Build output: `.deploy`

3. **创建资源**
   ```bash
   wrangler login
   cd tmarks
   wrangler d1 create tmarks-prod-db
   wrangler kv:namespace create "RATE_LIMIT_KV"
   wrangler kv:namespace create "PUBLIC_SHARE_KV"
   ```

4. **配置wrangler.toml**
   将上一步的ID填入 `tmarks/wrangler.toml`

5. **运行数据库迁移**
   控制台执行下面的sql
   tmarks\migrations\d1_console_pure.sql  我们控制台可以直接执行这个数据初始化
   ```

6. **敏感信息控制台面板配置环境变量**
   Settings → Environment variables → Production:
   - `JWT_SECRET`: `openssl rand -base64 48`
   - `ENCRYPTION_KEY`: `openssl rand -base64 48`

7. **重新部署**
   Deployments → Retry deployment


## 📄 许可证

本项目采用 [MIT License](LICENSE) 开源协议。
