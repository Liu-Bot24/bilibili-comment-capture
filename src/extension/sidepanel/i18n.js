const UI_LOCALE_STORAGE_KEY = "uiLocale";
const DEFAULT_LOCALE = "en";
const ZH_LOCALE = "zh";

const messages = {
  en: {
    "action.aiAnalysis": "AI Analysis",
    "action.copyAll": "Copy All",
    "action.exportJson": "Export JSON",
    "action.exportMarkdown": "Export Markdown",
    "action.refresh": "Refresh",
    "action.refreshActiveVideo": "Detect current tab again",
    "action.startCapture": "Start Capture",
    "action.stop": "Stop",
    "active.currentVideoPage": "Current video page",
    "active.loadingMeta": "Waiting for page info",
    "active.loadingTitle": "Reading current tab",
    "active.missingMeta": "Switch to a video page, then refresh",
    "active.missingTitle": "Current tab is not a Bilibili video",
    "active.openVideo": "Open a Bilibili video page first",
    "app.title": "Bilibili Comment Export Helper",
    "capture.includeReplies": "Enable capture",
    "capture.noItemLimit": "No comment limit",
    "capture.noPageLimit": "No page limit",
    "capture.noReplyLimit": "No reply limit",
    "capture.noRoundLimit": "No round limit",
    "capture.replyExpandRounds": "Max pages",
    "capture.replyKeepCount": "Max replies",
    "capture.replies": "Nested Replies",
    "capture.replyOrder": "Nested reply order",
    "capture.root": "Main Comments",
    "capture.rootKeepCount": "Max comments",
    "capture.rootLoadRounds": "Max loads",
    "capture.rootOrder": "Main comment order",
    "capture.scope": "Comment capture",
    "capture.summaryAllItems": "No comment limit",
    "capture.summaryAllLoads": "No round limit",
    "capture.summaryItems": "Keep {count}",
    "capture.summaryLoads": "First {count} loads",
    "capture.title": "Capture Conditions",
    "comment.metrics": "{time} · {likes} likes · {replies} replies",
    "copy.done": "Copied all",
    "empty.noComments": "No comments captured.",
    "empty.noMatches": "No comments contain \"{query}\".",
    "error.captureFailed": "Capture failed.",
    "error.needVideo": "Switch to a Bilibili video page first.",
    "error.openAnalysis": "Unable to open AI analysis page.",
    "nav.language": "Interface language",
    "nav.views": "Feature switch",
    "order.default": "Default Order",
    "order.latest": "Latest",
    "order.timeDesc": "Time Desc",
    "progress.done": "Capture complete",
    "progress.failed": "Capture failed",
    "progress.readVideo": "Reading video info",
    "progress.replies": "Replies {current}/{total}",
    "progress.root": "Main comments load {page} · collected {count}",
    "progress.running": "Running",
    "progress.start": "Preparing comment capture",
    "progress.stopped": "Capture stopped",
    "progress.waiting": "Waiting",
    "thread.pinned": "Pinned",
    "results.emptyList": "Captured comments will appear here as compact text.",
    "results.emptyMeta": "Result source appears after capture",
    "results.emptyTitle": "No result",
    "results.notCaptured": "Not captured yet",
    "results.scope": "This result",
    "results.stats": "{pinned}{roots} main · {replies} replies",
    "results.statsPinned": "{count} pinned · ",
    "results.title": "Results",
    "results.untitledVideo": "Untitled video",
    "search.comments": "Search comments",
    "status.exportedJson": "Exported JSON",
    "status.exportedMarkdown": "Exported Markdown",
    "tab.capture": "Capture",
    "tab.results": "Results",
  },
  zh: {
    "action.aiAnalysis": "AI分析",
    "action.copyAll": "复制全部",
    "action.exportJson": "导出 JSON",
    "action.exportMarkdown": "导出 Markdown",
    "action.refresh": "重新识别",
    "action.refreshActiveVideo": "重新识别当前标签页",
    "action.startCapture": "开始抓取评论",
    "action.stop": "停止",
    "active.currentVideoPage": "当前视频页",
    "active.loadingMeta": "等待页面信息",
    "active.loadingTitle": "读取当前标签页",
    "active.missingMeta": "切换到视频页后刷新",
    "active.missingTitle": "当前标签页不是 B 站视频",
    "active.openVideo": "请先打开一个 B 站视频页",
    "app.title": "B站评论导出助手",
    "capture.includeReplies": "启用抓取",
    "capture.noItemLimit": "不限制条数",
    "capture.noPageLimit": "不限制页数",
    "capture.noReplyLimit": "不限制回复数",
    "capture.noRoundLimit": "不限制轮数",
    "capture.replyExpandRounds": "最多展开页数",
    "capture.replyKeepCount": "最多保留回复数",
    "capture.replies": "楼中楼",
    "capture.replyOrder": "楼中楼排序",
    "capture.root": "主评论",
    "capture.rootKeepCount": "最多保留条数",
    "capture.rootLoadRounds": "最多加载轮数",
    "capture.rootOrder": "主评论排序",
    "capture.scope": "评论抓取",
    "capture.summaryAllItems": "不限制条数",
    "capture.summaryAllLoads": "不限制轮数",
    "capture.summaryItems": "保留 {count} 条",
    "capture.summaryLoads": "前 {count} 轮",
    "capture.title": "抓取条件",
    "comment.metrics": "{time} · {likes}赞 · {replies}回复",
    "copy.done": "已复制全部",
    "empty.noComments": "没有抓取到评论。",
    "empty.noMatches": "没有找到包含“{query}”的评论。",
    "error.captureFailed": "抓取失败。",
    "error.needVideo": "请先切换到哔哩哔哩视频页。",
    "error.openAnalysis": "无法打开 AI 分析页面。",
    "nav.language": "界面语言",
    "nav.views": "功能切换",
    "order.default": "默认顺序",
    "order.latest": "最新",
    "order.timeDesc": "时间倒序",
    "progress.done": "抓取完成",
    "progress.failed": "抓取失败",
    "progress.readVideo": "读取视频信息",
    "progress.replies": "楼中楼 {current}/{total}",
    "progress.root": "主评论第 {page} 轮 · 已收集 {count} 条",
    "progress.running": "运行中",
    "progress.start": "准备抓取评论",
    "progress.stopped": "已停止抓取",
    "progress.waiting": "等待任务",
    "thread.pinned": "置顶",
    "results.emptyList": "抓取完成后，评论会在这里以紧凑文本显示。",
    "results.emptyMeta": "抓取完成后会显示本次结果来源",
    "results.emptyTitle": "暂无结果",
    "results.notCaptured": "尚未抓取",
    "results.scope": "本次结果",
    "results.stats": "{pinned}{roots} 主评论 · {replies} 楼中楼",
    "results.statsPinned": "{count} 置顶 · ",
    "results.title": "查看结果",
    "results.untitledVideo": "未命名视频",
    "search.comments": "搜索评论",
    "status.exportedJson": "已导出 JSON",
    "status.exportedMarkdown": "已导出 Markdown",
    "tab.capture": "抓取评论",
    "tab.results": "查看结果",
  },
};

let currentLocale = ZH_LOCALE;

export async function loadUiLocale(storage, languages = navigator.languages) {
  const stored = await storage.get([UI_LOCALE_STORAGE_KEY]);
  currentLocale = normalizeLocale(stored[UI_LOCALE_STORAGE_KEY]) || pickLocale(languages);
  return currentLocale;
}

export async function saveUiLocale(storage, locale) {
  currentLocale = normalizeLocale(locale) || ZH_LOCALE;
  await storage.set({ [UI_LOCALE_STORAGE_KEY]: currentLocale });
  return currentLocale;
}

export function getCurrentLocale() {
  return currentLocale;
}

export function applyLocale(elements, locale = currentLocale) {
  currentLocale = normalizeLocale(locale) || ZH_LOCALE;
  document.documentElement.lang = currentLocale === ZH_LOCALE ? "zh-CN" : "en";
  document.title = t("app.title");

  for (const node of document.querySelectorAll("[data-i18n]")) {
    node.textContent = t(node.dataset.i18n);
  }
  for (const node of document.querySelectorAll("[data-i18n-placeholder]")) {
    node.placeholder = t(node.dataset.i18nPlaceholder);
  }
  for (const node of document.querySelectorAll("[data-i18n-aria]")) {
    node.setAttribute("aria-label", t(node.dataset.i18nAria));
  }
  for (const node of document.querySelectorAll("[data-i18n-title]")) {
    node.title = t(node.dataset.i18nTitle);
  }
  for (const button of elements.localeButtons || []) {
    const isActive = button.dataset.localeOption === currentLocale;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  }
}

export function t(key, params = {}) {
  const dictionary = messages[currentLocale] || messages[ZH_LOCALE];
  const template = dictionary[key] || messages.en[key] || messages.zh[key] || key;
  return formatMessage(template, params);
}

function pickLocale(languages = []) {
  const list = Array.isArray(languages) ? languages : [languages];
  for (const language of list) {
    const locale = normalizeLocale(language);
    if (locale) return locale;
  }
  return DEFAULT_LOCALE;
}

function normalizeLocale(language) {
  const value = String(language || "").trim().toLowerCase();
  if (!value) return "";
  return value.startsWith("zh") ? ZH_LOCALE : DEFAULT_LOCALE;
}

function formatMessage(template, params) {
  return String(template).replace(/\{([a-zA-Z0-9_]+)\}/g, (match, name) =>
    Object.prototype.hasOwnProperty.call(params, name) ? String(params[name]) : match
  );
}
