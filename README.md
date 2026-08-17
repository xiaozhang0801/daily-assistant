# 日报助手

<p align="center">
  <img src="src/renderer/assets/app-logo.svg" width="80" height="80" alt="日报助手 Logo">
  <br>
  <strong>截屏观察 · AI 分析 · 一键生成工作日报</strong>
</p>

<p align="center">
  一款基于 Electron + Vue 3 的桌面日报助手，通过定时截屏结合 AI 视觉分析自动识别工作内容，并联动本地 Git 提交记录，按工作/代码/综合三种模式智能生成每日工作日报与周报，所有数据本地存储，隐私可控。
</p>

---

## 功能特性

- **自动截屏采集** — 按可配置间隔（1–60 分钟）自动截取所有显示器画面，支持多屏幕拼接
- **AI 视觉分析** — 截图发送至 AI 视觉模型，自动识别并结构化描述当前工作内容（标题、摘要、分类、置信度）
- **工作事件时间线** — AI 分析结果自动构建时间线，相似连续事件智能合并，减少噪音
- **三种日报生成模式**：
  - **工作模式** — 基于截图分析事件
  - **代码模式** — 基于本地 Git 提交记录
  - **综合模式** — 结合截图事件与 Git 记录
- **周报生成** — 聚合本周已保存日报，AI 一键生成汇总周报
- **Git 活动集成** — 自动发现本地 Git 仓库，提取当日提交记录
- **历史回顾** — 可浏览历史日报，查看每日录制时长、事件数量与报告状态
- **隐私优先** — 所有数据存储在本地 SQLite 数据库，仅截图临时发送至 AI API

## 应用截图

| 今日概览 | 报告编辑 | 设置面板 |
|:---:|:---:|:---:|
| 录制状态、事件时间线、日报生成与编辑 | 浏览本周日报，管理与生成周报 | AI 服务配置、截屏参数、Git 根目录 |

## 技术栈

| 层级 | 技术 |
|------|------|
| 桌面运行时 | Electron |
| 前端框架 | Vue 3 + TypeScript |
| 构建工具 | Vite + electron-vite |
| 数据存储 | SQLite (better-sqlite3) |
| AI 集成 | MiniMax / OpenAI 兼容 API |
| 图标 | Lucide Icons |
| 打包分发 | electron-builder (Windows NSIS) |

## 快速开始

### 环境要求

- Node.js >= 18
- npm

### 安装依赖

```bash
npm install
```

### 开发模式

```bash
npm run dev
```

### 构建生产包

```bash
npm run build
npm run dist:win
```

### 运行测试

```bash
npm test
```

## 使用指南

### 1. 配置 AI 服务

首次打开应用后进入 **设置** 页面，选择 AI 服务商（MiniMax 或 OpenAI 兼容接口），填写 API Key 和模型名称，点击 **测试连接** 确认可用。

### 2. 开始记录

回到 **今日** 页面，应用会按设定间隔自动截屏并通过 AI 分析工作内容。你可随时暂停或恢复录制。

### 3. 生成日报

在工作事件积累足够后，选择日报生成模式（工作/代码/综合），点击 **生成日报**。AI 将根据事件记录生成 Markdown 格式的日报，你可在编辑器中修改后再保存。

### 4. 查看周报

在 **报告** 页面查看本周已保存的日报，点击 **生成周报** 即可汇总。

## 项目结构

```
daily-assistant/
├── src/
│   ├── main/                  # Electron 主进程
│   │   ├── services/
│   │   │   ├── ai/            # AI 服务（MiniMax / OpenAI 兼容）
│   │   │   ├── capture/       # 截屏采集与合成
│   │   │   ├── git/           # Git 活动采集
│   │   │   ├── report/        # 日报/周报生成
│   │   │   ├── storage/       # SQLite 数据库
│   │   │   └── updater/       # 自动更新
│   │   └── ipc/               # IPC 通信层
│   ├── renderer/              # Vue 前端
│   │   ├── pages/             # 页面组件
│   │   ├── components/        # 通用组件
│   │   └── assets/            # 静态资源
│   └── shared/                # 主进程与渲染进程共享类型
├── electron.vite.config.ts
├── package.json
└── vitest.config.ts
```

## 许可

本项目为私人项目，保留所有权利。
