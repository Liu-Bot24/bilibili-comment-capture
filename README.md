# B站评论导出助手

![Stars](https://img.shields.io/github/stars/Liu-Bot24/bilibili-comment-capture?style=flat&label=Stars&cache=20260704) ![Forks](https://img.shields.io/github/forks/Liu-Bot24/bilibili-comment-capture?style=flat&label=Forks&cache=20260704) ![Views 14d](https://github-stats.liu-qi.cn/api/badge/Liu-Bot24/bilibili-comment-capture/views14d.svg?v=4) ![Clones 14d](https://github-stats.liu-qi.cn/api/badge/Liu-Bot24/bilibili-comment-capture/clones14d.svg?v=4) ![Downloads](https://img.shields.io/github/downloads/Liu-Bot24/bilibili-comment-capture/total?style=flat&label=Downloads&cache=20260704) ![Release](https://img.shields.io/github/v/release/Liu-Bot24/bilibili-comment-capture?style=flat&label=Release&cache=20260704)

![B站评论导出助手预览](assets/github-preview.png)

Languages: [简体中文](./README.md) · [English](./README.en.md)

这是一款用于 B 站视频页的评论浏览器扩展，也可以配合弹幕分析网站 [danmu.liu-qi.cn](https://danmu.liu-qi.cn/) 进行评论深度 AI 分析。它可在 B 站视频页抓取、搜索、复制和导出评论，并可一键把当前视频带到 AI 深度分析页。

## 这是一个什么插件

B站评论导出助手会在 B 站视频页的右侧区域增加一个评论面板，让你不用离开当前页面，就能直接抓取、查看、搜索、复制和导出评论。

它可以单独作为评论导出工具使用；如果你正在配合 [danmu.liu-qi.cn](https://danmu.liu-qi.cn/) 做弹幕分析，也可以把当前视频一键带到网站结果页，并进入评论 AI 分析流程。

## 你可以用它做什么

- 直接识别当前 B 站视频页
- 抓取置顶评论和直接评论
- 按 B 站默认顺序或时间顺序抓取主评论
- 按需抓取楼中楼回复
- 按关键词搜索评论内容
- 在侧边栏紧凑查看抓取结果
- 复制全部评论文本
- 导出 Markdown 评论文件
- 导出 JSON 评论文件
- 一键跳到 AI 深度分析页

## 安装

### 从 Chrome Web Store 安装

推荐直接从 Chrome Web Store 安装：

[安装 B站评论导出助手](https://chromewebstore.google.com/detail/bilibili-comment-helper-c/emfgghgdlmihojemgbgljgibiagiohdj)

安装后打开 B 站视频页，即可在页面右侧使用评论面板。

### 从源码加载

1. 打开 Chrome 或 Edge。
2. 进入 `chrome://extensions/`。
3. 开启右上角的“开发者模式”。
4. 点击“加载已解压的扩展程序”。
5. 选择本项目目录。

## 使用

1. 登录哔哩哔哩并打开一个普通视频页。
2. 在右侧打开“B站评论导出助手”面板。
3. 在“抓取评论”中设置主评论和楼中楼的抓取范围。
4. 点击 `开始抓取评论`。
5. 抓取完成后，在“查看结果”中搜索或浏览评论。
6. 点击 `复制全部`、`导出 Markdown` 或 `导出 JSON`。
7. 点击 `AI分析` 打开 [danmu.liu-qi.cn](https://danmu.liu-qi.cn/) 并进入评论 AI 分析入口。

## 导出格式

JSON 导出适合交给 AI 分析。它会保留视频标题、UP 主、BV 号、抓取条件、排序说明、统计信息、置顶评论、直接评论和楼中楼回复之间的层级关系。

Markdown 导出适合人工阅读。文件开头会说明评论结构和字段含义，正文按评论串展示，每个评论串包含一条直接评论和它下方的楼中楼回复。

导出内容会标记通过用户 ID 确认为视频 UP 主本人的评论，避免仅凭昵称误判同名账号。

## 适用范围

- 主要支持哔哩哔哩普通视频页
- 评论抓取依赖 B 站当前公开视频评论接口

## 权限与隐私

扩展只申请实现评论功能所需的最小权限：

- `activeTab`：在打开侧边栏时识别当前标签页
- `sidePanel`：在 Chrome 侧边栏显示评论面板
- `storage`：保存抓取选项和界面语言
- `https://www.bilibili.com/*`：读取当前 B 站视频页上下文
- `https://api.bilibili.com/*`：请求 B 站视频信息、评论和楼中楼回复

扩展不会上传抓取到的评论正文，不包含统计、广告或远程代码。详细说明见 [PRIVACY.md](PRIVACY.md)。
