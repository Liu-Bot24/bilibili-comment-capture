import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const sidepanelHtml = readFileSync(new URL("../sidepanel/sidepanel.html", import.meta.url), "utf8");
const sidepanelEntry = readFileSync(new URL("../src/extension/sidepanel-entry.js", import.meta.url), "utf8");
const sidepanelCss = readFileSync(new URL("../sidepanel/sidepanel.css", import.meta.url), "utf8");
const sidepanelI18n = readFileSync(new URL("../src/extension/sidepanel/i18n.js", import.meta.url), "utf8");

test("side panel is current-page-first and does not expose manual video URL input", () => {
  assert.doesNotMatch(sidepanelHtml, /manual|video-url|备用|手动输入|视频链接/i);
  assert.doesNotMatch(sidepanelEntry, /manual|videoUrl|video-url|备用|手动粘贴|粘贴 BV/i);
});

test("active video area pairs current video controls with AI analysis", () => {
  assert.match(sidepanelHtml, /video-action-strip/);
  assert.match(sidepanelHtml, /id="active-video-card"/);
  assert.match(sidepanelHtml, /id="refresh-active-video"/);
  assert.match(sidepanelHtml, /id="open-ai-analysis"/);
  assert.match(sidepanelHtml, />AI分析</);
  assert.match(sidepanelEntry, /openAiAnalysis/);
});

test("side panel header uses the reviewed product name and a compact language switch", () => {
  assert.match(sidepanelHtml, /B站评论导出助手/);
  assert.match(sidepanelHtml, /class="language-switch"/);
  assert.match(sidepanelHtml, /data-locale-option="en"/);
  assert.match(sidepanelHtml, /data-locale-option="zh"/);
  assert.match(sidepanelHtml, />EN</);
  assert.match(sidepanelHtml, />中文</);
  assert.match(sidepanelEntry, /loadUiLocale/);
  assert.match(sidepanelEntry, /saveUiLocale/);
  assert.match(sidepanelEntry, /applyLocale/);
});

test("AI analysis button stays compact beside the active video card", () => {
  assert.match(sidepanelCss, /grid-template-columns:\s*minmax\(0,\s*1fr\)\s*88px/);
  assert.match(sidepanelCss, /\.video-strip\s*\{[\s\S]*?min-height:\s*44px/);
  assert.match(sidepanelCss, /\.ai-analysis-button\s*\{[\s\S]*?height:\s*44px/);
  assert.doesNotMatch(sidepanelCss, /grid-template-columns:\s*minmax\(0,\s*2fr\)\s*minmax\(88px,\s*1fr\)/);
});

test("AI analysis label is not visually weaker than JSON export", () => {
  assert.match(sidepanelCss, /\.ai-analysis-button\s*\{[^}]*font-size:\s*13px/);
  assert.match(sidepanelCss, /\.ai-analysis-button\s*\{[^}]*font-weight:\s*820/);
  assert.doesNotMatch(sidepanelCss, /\.ai-analysis-button\s*\{[^}]*font-size:\s*11px/);
});

test("side panel uses a reviewed Chinese product name without redundant binding status", () => {
  assert.match(sidepanelHtml, /B站评论导出助手/);
  assert.doesNotMatch(sidepanelHtml, /B站评论抓取器|Bili Comment Lens|已绑定视频/);
  assert.doesNotMatch(sidepanelEntry, /已绑定视频/);
});

test("side panel separates capture and reading into two clear tabs", () => {
  assert.match(sidepanelHtml, /data-view-target="capture"/);
  assert.match(sidepanelHtml, /data-view-target="comments"/);
  assert.doesNotMatch(sidepanelHtml, /data-view-target="settings"|data-view-panel="settings"|>设置</);
  assert.match(sidepanelHtml, />抓取评论</);
  assert.match(sidepanelHtml, />查看结果</);
  assert.match(sidepanelEntry, /activateView\("capture"\)/);
  assert.match(sidepanelEntry, /activateView\("comments"\)/);
});

test("capture tab names the comment capture task and avoids confusing sort options", () => {
  const capturePanel = panelHtml("capture");

  assert.match(capturePanel, /抓取条件/);
  assert.match(capturePanel, /评论抓取/);
  assert.match(sidepanelHtml, /默认顺序/);
  assert.match(sidepanelHtml, /最新/);
  assert.doesNotMatch(sidepanelHtml, /最早|最少|最热|加载批次|展开批次|全部批次|全部条|每楼取/);
  assert.match(sidepanelHtml, /不限制轮数/);
  assert.match(sidepanelHtml, /不限制条数/);
  assert.doesNotMatch(capturePanel, /comment-thread-list|comment-list|复制评论|导出评论|评论查看|查看结果/);
  assert.doesNotMatch(sidepanelHtml, /request-delay|请求间隔/);
});

test("reply latest option is labelled as time descending instead of latest", () => {
  const capturePanel = panelHtml("capture");
  const rootOrderFieldset = capturePanel.match(/<fieldset class="inline-choice" aria-label="主评论排序"[\s\S]*?<\/fieldset>/)?.[0] || "";
  const replyOrderFieldset = capturePanel.match(/<fieldset class="inline-choice two" aria-label="楼中楼排序"[\s\S]*?<\/fieldset>/)?.[0] || "";

  assert.match(rootOrderFieldset, /name="root-order" value="latest"[\s\S]*data-i18n="order\.latest">最新/);
  assert.match(replyOrderFieldset, /name="reply-order" value="latest"[\s\S]*data-i18n="order\.timeDesc">时间倒序/);
  assert.doesNotMatch(replyOrderFieldset, /data-i18n="order\.latest">最新/);
  assert.match(sidepanelI18n, /"order\.timeDesc": "Time Desc"/);
  assert.match(sidepanelI18n, /"order\.timeDesc": "时间倒序"/);
});

test("capture numeric fields use explanatory aligned labels", () => {
  for (const label of ["最多加载轮数", "最多保留条数", "最多展开页数", "最多保留回复数"]) {
    assert.match(sidepanelHtml, new RegExp(label));
    assert.match(sidepanelI18n, new RegExp(label));
  }

  assert.match(sidepanelI18n, /"capture\.rootLoadRounds": "Max loads"/);
  assert.match(sidepanelI18n, /"capture\.rootKeepCount": "Max comments"/);
  assert.match(sidepanelI18n, /"capture\.replyExpandRounds": "Max pages"/);
  assert.match(sidepanelI18n, /"capture\.replyKeepCount": "Max replies"/);
  assert.doesNotMatch(sidepanelHtml, /向下加载|>每条展开<|每条最多|主评论最多加载轮数|主评论最多保留条数|每条主评论最多展开页数|每条主评论最多抓取回复数|楼中楼最多展开轮数|楼中楼每条保留条数/);
  assert.doesNotMatch(sidepanelI18n, /"Load down"|"Keep up to"|"Expand each"|"Per thread max"|Max main loads|Max main comments|Max pages per main comment|Max replies per main comment|Max reply expands|Max replies each|主评论最多加载轮数|主评论最多保留条数|每条主评论最多展开页数|每条主评论最多抓取回复数|楼中楼最多展开轮数|楼中楼每条保留条数/);
});

test("capture all-limit checkboxes use aligned limit wording", () => {
  const capturePanel = panelHtml("capture");

  for (const label of ["不限制轮数", "不限制条数", "不限制页数", "不限制回复数"]) {
    assert.match(capturePanel, new RegExp(label));
    assert.match(sidepanelI18n, new RegExp(label));
  }

  assert.match(capturePanel, /id="root-loads-all"[\s\S]*data-i18n="capture\.noRoundLimit">不限制轮数/);
  assert.match(capturePanel, /id="root-items-all"[\s\S]*data-i18n="capture\.noItemLimit">不限制条数/);
  assert.match(capturePanel, /id="reply-loads-all"[\s\S]*data-i18n="capture\.noPageLimit">不限制页数/);
  assert.match(capturePanel, /id="reply-items-all"[\s\S]*data-i18n="capture\.noReplyLimit">不限制回复数/);
  assert.doesNotMatch(capturePanel, /加载到末尾|每条翻到最后页|每条保留全部回复|展开到末尾/);
  assert.doesNotMatch(sidepanelI18n, /capture\.expandToEnd|Fetch all pages each|Keep all replies each|每条翻到最后页|每条保留全部回复/);
});

test("reply capture toggle is a neutral section switch instead of a blue action", () => {
  const capturePanel = panelHtml("capture");

  assert.match(capturePanel, /<label class="section-enable-toggle">\s*<input id="include-replies" type="checkbox" checked>\s*<span data-i18n="capture\.includeReplies">启用抓取<\/span>\s*<\/label>/);
  assert.doesNotMatch(capturePanel, /<label class="check-row strong">\s*<input id="include-replies"/);
  const sectionToggleRule = sidepanelCss.match(/\.section-enable-toggle\s*\{(?<body>[^}]*)\}/)?.groups.body || "";
  assert.doesNotMatch(sectionToggleRule, /var\(--accent/);
  assert.doesNotMatch(sidepanelCss, /\.check-row\.strong/);
});

test("side panel replaces the old popup surface", () => {
  assert.doesNotMatch(sidepanelHtml, /popup/i);
  assert.doesNotMatch(sidepanelEntry, /popup/i);
});

test("reader tab presents dense comments with copy and export actions", () => {
  const readerPanel = panelHtml("comments");

  assert.match(readerPanel, /查看结果/);
  assert.match(readerPanel, /本次结果/);
  assert.match(readerPanel, /comment-thread-list/);
  assert.match(readerPanel, /导出 JSON/);
  assert.match(readerPanel, /导出 Markdown/);
  assert.match(readerPanel, /复制全部/);
  assert.match(readerPanel, /id="comment-search"/);
  assert.match(readerPanel, /type="search"/);
  assert.match(readerPanel, /placeholder="搜索评论"/);
  assert.match(readerPanel, /data-i18n="action\.exportMarkdown"/);
  assert.match(readerPanel, /data-i18n="action\.exportJson"/);
  assert.doesNotMatch(readerPanel, /复制评论/);
  assert.ok(readerPanel.indexOf("复制全部") < readerPanel.indexOf("导出 Markdown"));
  assert.ok(readerPanel.indexOf("导出 Markdown") < readerPanel.indexOf("导出 JSON"));
  assert.match(readerPanel, /class="primary-button" id="export-json"/);
  assert.match(readerPanel, /class="secondary-button" id="copy-all-comments"/);
  assert.ok(readerPanel.indexOf("comment-actions") < readerPanel.indexOf("comment-thread-list"));
  assert.ok(readerPanel.indexOf("comment-actions") < readerPanel.indexOf("comment-search"));
  assert.ok(readerPanel.indexOf("comment-search") < readerPanel.indexOf("comment-thread-list"));
  assert.match(sidepanelEntry, /activateView\("comments"\)/);
  assert.match(sidepanelEntry, /commentSearch/);
  assert.match(sidepanelEntry, /copyAllComments/);
  assert.match(sidepanelEntry, /exportCommentsAsJson/);
  assert.match(sidepanelEntry, /exportCommentsAsMarkdown/);
});

function panelHtml(name) {
  const start = sidepanelHtml.indexOf(`data-view-panel="${name}"`);
  assert.notEqual(start, -1, `expected ${name} panel to exist`);
  const sectionStart = sidepanelHtml.lastIndexOf("<section", start);
  const nextPanel = sidepanelHtml.indexOf('<section class="view-panel"', start + 1);
  const sectionEnd = nextPanel === -1 ? sidepanelHtml.indexOf("</main>", start) : nextPanel;
  return sidepanelHtml.slice(sectionStart, sectionEnd);
}
