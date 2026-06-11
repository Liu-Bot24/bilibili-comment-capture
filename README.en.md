# Bilibili Comment Export Helper

![Bilibili Comment Export Helper preview](assets/github-preview.png)

Languages: [简体中文](./README.md) · [English](./README.en.md)

This is a comment browser extension for Bilibili video pages. It also works with the danmaku analysis site [danmu.liu-qi.cn](https://danmu.liu-qi.cn/) for deep AI comment analysis. It can capture, search, copy, and export comments from Bilibili video pages, and it can open the matching AI deep analysis page with one click.

## What It Is

Bilibili Comment Export Helper adds a comment panel to the right side of Bilibili video pages, so you can capture, view, search, copy, and export comments without leaving the current page.

You can use it on its own as a comment export tool. If you also use [danmu.liu-qi.cn](https://danmu.liu-qi.cn/) for danmaku analysis, the `AI分析` button opens the matching result page and enters the comment AI analysis flow.

## Features

- Detect the current Bilibili video page
- Capture pinned comments and direct comments
- Capture main comments in Bilibili's default order or by time
- Capture nested replies when needed
- Search comments by keyword
- Read captured comments in a compact side panel
- Copy all comment text
- Export comments as Markdown
- Export comments as JSON
- Open the AI deep analysis page

## Installation

### Install From Chrome Web Store

The recommended installation method is the Chrome Web Store:

[Install B站评论导出助手](https://chromewebstore.google.com/detail/bilibili-comment-helper-c/emfgghgdlmihojemgbgljgibiagiohdj)

After installation, open a Bilibili video page and use the comment panel on the right side of the page.

### Load From Source

1. Open Chrome or Edge.
2. Go to `chrome://extensions/`.
3. Turn on Developer mode.
4. Click `Load unpacked`.
5. Select this project folder.

## Usage

1. Sign in to Bilibili and open a regular video page.
2. Open the `Bilibili Comment Export Helper` panel on the right side.
3. In `Capture`, set the capture range for main comments and nested replies.
4. Click `Start Capture`.
5. After capture finishes, search or read comments in `Results`.
6. Click `Copy All`, `Export Markdown`, or `Export JSON`.
7. Click `AI分析` to open [danmu.liu-qi.cn](https://danmu.liu-qi.cn/) and enter the comment AI analysis entry.

## Export Formats

JSON export is suitable for AI analysis. It keeps the video title, uploader name, BV id, capture options, ordering notes, summary counts, pinned comments, direct comments, and nested reply relationships.

Markdown export is suitable for human reading. It starts with a short guide that explains the comment structure and field meanings, then lists comment threads. Each thread contains one direct comment and its nested replies.

Exports mark comments confirmed by user id to be from the video uploader, so matching nicknames alone are not treated as uploader identity.

## Scope

- Mainly supports regular Bilibili video pages
- Comment capture depends on Bilibili's current public web comment APIs

## Permissions And Privacy

The extension only requests the minimum permissions needed for comment features:

- `activeTab`: detect the current tab when the side panel opens
- `sidePanel`: show the comment panel in Chrome's side panel
- `storage`: save capture options and interface language
- `https://www.bilibili.com/*`: read the current Bilibili video page context
- `https://api.bilibili.com/*`: request Bilibili video metadata, comments, and nested replies

The extension does not upload captured comment text and does not include analytics, advertising, or remote code. See [PRIVACY.md](PRIVACY.md) for details.
