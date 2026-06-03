import { extractBvid, getUrlPage } from "./video.js";

export const SITE_RESULT_URL = "https://danmu.liu-qi.cn/result";
export const SITE_RESULT_SOURCE = "bilibili-comment-capture";
export const SITE_RESULT_ANALYSIS = "comments";

export function buildSiteResultUrl(options = {}) {
  const video = options.video || null;
  const bvid = options.bvid || extractBvid(options.url) || video?.bvid || "";
  if (!bvid) {
    throw new Error("No BV id found for site analysis page");
  }

  const target = new URL(options.siteBaseUrl || SITE_RESULT_URL);
  target.searchParams.set("bvid", bvid);
  target.searchParams.set("source", options.source || SITE_RESULT_SOURCE);
  target.searchParams.set("analysis", options.analysis || SITE_RESULT_ANALYSIS);

  const cid = options.cid || video?.cid || video?.page?.cid;
  if (cid) {
    target.searchParams.set("cid", String(cid));
  }

  const videoPage = typeof video?.page === "object" ? video.page.page : video?.page;
  const page = options.page || videoPage || getUrlPage(options.url);
  if (page) {
    target.searchParams.set("p", String(page));
  }

  return target.toString();
}
