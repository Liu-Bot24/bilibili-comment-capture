import { extractBvid } from "../core/video.js";

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== "GET_BILI_PAGE_CONTEXT") return false;

  const canonical = document.querySelector('link[rel="canonical"]')?.href || "";
  const ogTitle = document.querySelector('meta[property="og:title"]')?.content || "";
  const url = canonical || location.href;
  sendResponse({
    ok: true,
    url,
    title: ogTitle || document.title || "",
    bvid: extractBvid(url || location.href),
  });
  return false;
});
