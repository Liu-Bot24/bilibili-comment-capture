import { extractBvid } from "../../core/video.js";
import { t } from "./i18n.js";

let activeVideoDetectionTimer = null;
let activeVideoDetectionSeq = 0;

export function watchActiveVideoTabs(chromeApi, detect) {
  chromeApi.tabs?.onActivated?.addListener(() => scheduleActiveVideoDetection(detect));
  chromeApi.tabs?.onUpdated?.addListener((_tabId, changeInfo) => {
    if (changeInfo.status === "complete" || changeInfo.url) scheduleActiveVideoDetection(detect);
  });
}

export function scheduleActiveVideoDetection(detect) {
  clearTimeout(activeVideoDetectionTimer);
  activeVideoDetectionTimer = setTimeout(detect, 120);
}

export async function detectActiveVideoTab(chromeApi, hooks) {
  const seq = ++activeVideoDetectionSeq;
  hooks.onLoading();

  const [tab] = await chromeApi.tabs.query({ active: true, currentWindow: true });
  if (seq !== activeVideoDetectionSeq) return;
  if (!tab?.id) {
    hooks.onMissing(t("active.openVideo"));
    return;
  }

  const pageUrl = tab.url || "";
  const urlBvid = isBilibiliVideoPage(pageUrl) ? extractBvid(pageUrl) : "";
  if (urlBvid) {
    hooks.onReady(toActiveVideo({ title: tab.title, url: pageUrl, bvid: urlBvid, tabId: tab.id }));
    return;
  }

  if (!isBilibiliVideoPage(pageUrl)) {
    hooks.onMissing(tab.title);
    return;
  }

  try {
    const context = await chromeApi.tabs.sendMessage(tab.id, { type: "GET_BILI_PAGE_CONTEXT" });
    if (seq !== activeVideoDetectionSeq) return;
    if (context?.ok && context.bvid) {
      hooks.onReady(toActiveVideo({ ...context, tabId: tab.id }));
      return;
    }
  } catch (_error) {
    // Non-Bilibili pages usually have no content script to answer this request.
  }

  if (seq !== activeVideoDetectionSeq) return;
  hooks.onMissing(tab.title);
}

function isBilibiliVideoPage(input) {
  try {
    const url = new URL(input);
    return url.hostname === "www.bilibili.com" && url.pathname.startsWith("/video/");
  } catch (_error) {
    return false;
  }
}

function toActiveVideo(context) {
  return {
    title: cleanTitle(context.title || "哔哩哔哩视频"),
    url: context.url || "",
    bvid: context.bvid || extractBvid(context.url),
    tabId: context.tabId || null,
  };
}

function cleanTitle(title) {
  return String(title).replace(/_哔哩哔哩_bilibili$/i, "").trim();
}
