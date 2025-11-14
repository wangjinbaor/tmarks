<div align="center">

# 🔖 TMarks

**AI 驱动的智能书签管理系统**

[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.3%20%7C%2019-61dafb.svg)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-6.0%20%7C%207-646cff.svg)](https://vitejs.dev/)
[![Cloudflare](https://img.shields.io/badge/Cloudflare-Workers-f38020.svg)](https://workers.cloudflare.com/)
[![许可证](https://img.shields.io/badge/许可证-MIT-green.svg)](LICENSE)

简体中文

[在线演示](https://tmarks.669696.xyz) | [视频教程](https://bushutmarks.pages.dev/course/tmarks) | [问题反馈](https://github.com/ai-tmarks/tmarks/issues) | [功能建议](https://github.com/ai-tmarks/tmarks/discussions)

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
git clone https://github.com/ai-tmarks/tmarks.git
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

### 📹 视频教程

**完整部署教程视频**: [点击观看](https://bushutmarks.pages.dev/course/tmarks)

跟随视频教程，3 分钟完成部署。

---

### 快速部署

**前置要求:**
- Cloudflare 账号
- GitHub 账号

**部署步骤:**

1. **Fork 仓库**
   - Fork 本仓库到你的 GitHub

2. **创建 Cloudflare Pages 项目**
   - 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)
   - Workers & Pages → 创建 → 连接到 Git → 选择你的 Fork 仓库
   - 配置构建设置：
     - 根目录：`tmarks`
     - 构建命令：`pnpm install && pnpm build:deploy`
     - 构建输出目录：`.deploy`
   - 保存并部署（首次部署会失败，继续下一步配置）

3. **创建 D1 数据库和 KV 命名空间**

   在配置项目之前,需要先创建必要的资源:

   **a. 创建 D1 数据库：**
   - 进入 [Cloudflare Dashboard](https://dash.cloudflare.com/)
   - 左侧菜单选择 **Workers & Pages** → **D1 SQL Database**
   - 点击右上角 **Create database** 按钮
   - 数据库名称输入：`tmarks-prod-db`
   - 点击 **Create** 创建数据库

   **b. 创建 KV 命名空间（可选但推荐）：**

   > 💡 **说明**: 两个 KV 命名空间都是可选的,不创建也能正常运行,但会影响性能和安全性:
   > - `RATE_LIMIT_KV`: 用于 API 访问频率限制。**不创建时将关闭速率限制,可能导致 API 被滥用**
   > - `PUBLIC_SHARE_KV`: 用于缓存公开分享页面。**不创建时每次访问都查询数据库,响应较慢**
   >
   > **推荐**: 生产环境建议创建这两个 KV,开发测试可以跳过

   - 左侧菜单选择 **Workers & Pages** → **KV**
   - 点击右上角 **Create a namespace** 按钮
   - 创建第一个 KV 命名空间（推荐）：
     - 命名空间名称：`RATE_LIMIT_KV`
     - 点击 **Add** 创建
   - 重复上述步骤,创建第二个 KV 命名空间（推荐）：
     - 命名空间名称：`PUBLIC_SHARE_KV`
     - 点击 **Add** 创建

4. **在项目中绑定资源**

   进入你的 Pages 项目 → 设置：

   **a. 绑定 D1 数据库：**
   - 设置 → 函数 → D1 数据库绑定 → 添加绑定
   - 变量名：`DB`
   - D1 数据库：选择刚才创建的 `tmarks-prod-db`
   - 点击 **Save** 保存

   **b. 绑定 KV 命名空间（如果创建了KV）：**
   - 设置 → 函数 → KV 命名空间绑定 → 添加绑定
   - 第一个 KV（如果创建了 RATE_LIMIT_KV）：
     - 变量名：`RATE_LIMIT_KV`
     - KV 命名空间：选择刚才创建的 `RATE_LIMIT_KV`
     - 点击 **Save** 保存
   - 点击 **添加绑定** 继续添加第二个 KV（如果创建了 PUBLIC_SHARE_KV）：
     - 变量名：`PUBLIC_SHARE_KV`
     - KV 命名空间：选择刚才创建的 `PUBLIC_SHARE_KV`
     - 点击 **Save** 保存

   > 💡 **提示**: 如果跳过了 KV 创建,可以跳过此步骤,应用仍可正常运行

   **c. 配置环境变量：**
   - 路径：项目设置 → 环境变量 → 生产环境
   - 建议添加以下业务配置（括号为推荐值，可按需调整）：
     - `ALLOW_REGISTRATION`：是否允许新用户注册，推荐 "true"（设为非 "true" 的任意值——包括 "false" 或留空——都会关闭注册；**推荐的关闭方式是直接删除该变量，避免多处配置造成混淆**）
     - `ENVIRONMENT`：当前运行环境，生产环境请设为 "production"
     - `JWT_ACCESS_TOKEN_EXPIRES_IN`：访问 Token 有效期，推荐 "365d"
     - `JWT_REFRESH_TOKEN_EXPIRES_IN`：刷新 Token 有效期，推荐 "365d"
   - ⚠️ 敏感环境变量（务必通过 Dashboard 配置，不要写入代码仓库）：
     - `JWT_SECRET`：JWT 签名密钥，建议使用至少 48 位随机字符串
     - `ENCRYPTION_KEY`：数据加密密钥，建议使用至少 48 位随机字符串
   - 本地或自托管部署时，可参考 `tmarks/wrangler.toml.example` 中的 `[vars]` 示例配置（业务配置可直接照抄，敏感密钥仅在 Dashboard 中填写真实值）。

5. **初始化数据库**

   数据库创建后需要执行 SQL 脚本初始化表结构：

   - 进入 **Workers & Pages** → **D1 SQL Database**
   - 点击打开 `tmarks-prod-db` 数据库
   - 点击 **Console** 标签页
   - 打开仓库中的 `tmarks/migrations/d1_console_pure.sql` 文件
   - 复制完整的 SQL 内容
   - 粘贴到 D1 控制台的输入框中
   - 点击 **Execute** 执行 SQL
   - 等待执行完成,确认所有表都创建成功

6. **重新部署**
   - 回到 Pages 项目页面 → 部署 → 查看部署
   - 找到之前失败的部署,点击 **重试部署**
   - 或者推送一个新的提交触发自动部署
   - 等待构建完成即可访问你的 TMarks 应用

**后续更新:**
- 直接推送代码到 GitHub，Cloudflare 会自动构建部署
- 所有配置都保存在 Dashboard 中，不会被代码更新影响

---


## 📄 许可证

本项目采用 [MIT License](LICENSE) 开源协议。
