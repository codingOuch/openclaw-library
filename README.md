# openclaw Library

一个把 openclaw 知识库变成可翻阅书架的 LAN 面板。

A LAN web panel that turns your openclaw knowledge library into a browsable bookshelf.

## 这是什么 / What

openclaw Library 会把 `~/.openclaw/workspace` 下的 Markdown 文件展示成书架上的书，支持阅读、编辑、封面自定义，还有 Git 历史记录翻阅。

It visualizes the markdown files under `~/.openclaw/workspace` as books on shelves, with reading, editing, custom covers, and Git history browsing.

## 截图 / Screenshot

书架页可以看到所有 Root Scrolls（SOUL、IDENTITY、USER 等）、memories、skills、profiles，点击书本打开翻页动画，左边是 Git 提交记录，右边是正文。

## 安装 / Install

```bash
git clone https://github.com/codingOuch/openclaw-library.git
cd openclaw-library
npm install
npm run build
```

## 运行 / Run

```bash
# 开发模式（API + UI 热更新）
npm run dev

# 或者生产模式
npm start
```

启动后打开浏览器访问 `http://<本机IP>:8787`。

After starting, open your browser to `http://<LAN-IP>:8787`.

首次访问需要输入 token，token 会打印在终端启动日志里，或者直接查看项目目录下的 `.token` 文件。

On first visit you'll need to enter a token. The token is printed in the startup log, or read it from the `.token` file in the project directory.

## 文件结构 / Directory Layout

openclaw Library 默认读取以下位置：

By default, it reads from:

| 内容 | 路径 | 环境变量 |
|------|------|----------|
| Root Scrolls（SOUL、IDENTITY 等） | `~/.openclaw/workspace/*.md` | `OPENCLAW_WORKSPACE` |
| Memories | `~/.openclaw/workspace/memory/**/*.md` | `OPENCLAW_WORKSPACE` |
| Skills | `~/.openclaw/workspace/skills/*/SKILL.md` | `OPENCLAW_SKILLS` |
| Home | `~` | `OPENCLAW_HOME` |

## 环境变量 / Environment Variables

所有路径都可以通过环境变量自定义：

All paths can be customized via environment variables:

```bash
OPENCLAW_HOME=/home/user          # 用户主目录 / user home dir
OPENCLAW_WORKSPACE=/path/to/workspace   # workspace 根目录 / workspace root
OPENCLAW_SKILLS=/path/to/skills         # skills 目录 / skills dir
PORT=8787                          # 服务端口 / server port
HOST=0.0.0.0                       # 绑定地址 / bind address
```

## 作为 openclaw Skill 使用 / Use as an openclaw Skill

创建一个 skill 文件，让 openclaw 在需要时自动启动 Library 面板：

Create a skill file so openclaw can launch the Library panel when needed:

**`skills/library/SKILL.md`**：

```markdown
---
name: library
description: >
  Open the local openclaw knowledge library as a browsable bookshelf.
  Use when the user wants to browse, search, or edit their openclaw
  knowledge base (SOUL, memories, skills, profiles).
---

## Start Library

```bash
cd /path/to/openclaw-library && npm start &
```

## 功能 / Features

- **书架浏览** — 按类型分组展示（Root Scrolls、Memories、Skills、Profiles），支持封面/书脊两种布局
- **翻书动画** — 点击书本打开翻页动画，封面飞到屏幕中央然后翻开
- **Markdown 编辑** — 解锁后可编辑正文，保存前显示 diff 对比
- **Git 历史** — 左页显示最近 12 条本地 Git 提交记录，可查看历史版本
- **自定义封面** — 支持上传本地图片作为书本封面
- **全文搜索** — 搜索书名和正文内容（需要 openclaw 面板 API 支持）
- **中英文切换** — 设置中可切换界面语言
- **Demo 模式** — 访问 `http://<IP>:8787/?demo=1` 无需 token 即可体验

- **Bookshelf browsing** — Grouped by type (Root Scrolls, Memories, Skills, Profiles), cover/spine layouts
- **Book flip animation** — Opening a book triggers a cover fly-in and page-flip animation
- **Markdown editing** — Unlock to edit, with diff preview before saving
- **Git history** — Left page shows last 12 local Git commits, browse historical versions
- **Custom covers** — Upload local images as book covers
- **Full-text search** — Search titles and body text (requires openclaw panel API)
- **zh/en i18n** — Toggle UI language in settings
- **Demo mode** — Visit `http://<IP>:8787/?demo=1` to try without a token

## 技术栈 / Tech Stack

React 18 + TypeScript + Vite 7 + Express 5 + framer-motion
