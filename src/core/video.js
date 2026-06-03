const BVID_RE = /(BV[0-9A-Za-z]{10,})/;

export function extractBvid(input) {
  if (!input) return "";
  const match = String(input).match(BVID_RE);
  return match ? match[1] : "";
}

export function getUrlPage(input) {
  if (!input) return 1;
  try {
    const url = new URL(String(input));
    const page = Number(url.searchParams.get("p") || url.searchParams.get("page") || 1);
    return Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
  } catch (_error) {
    return 1;
  }
}

export function safeFilenamePart(input, fallback = "bilibili-comments") {
  const safe = String(input || "")
    .replace(/[\\/:*?"<>|]+/g, "_")
    .replace(/[\u0000-\u001f\u007f]+/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^\.+|\.+$/g, "")
    .trim();
  return safe || fallback;
}

export function makeDownloadFilename(options = {}) {
  const bvid = safeFilenamePart(options.bvid || "bilibili", "bilibili");
  const title = safeFilenamePart(options.title || "comments", "comments");
  const extension = safeFilenamePart(String(options.extension || "json").replace(/^\.+/, ""), "json").toLowerCase();
  const generatedAt = options.generatedAt ? new Date(options.generatedAt) : new Date();
  const stamp = Number.isFinite(generatedAt.getTime())
    ? generatedAt.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "").replace("T", "-")
    : new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "").replace("T", "-");
  return `${bvid}-${title}-${stamp}.${extension}`;
}

export function normalizeVideoUrl(input) {
  const bvid = extractBvid(input);
  return bvid ? `https://www.bilibili.com/video/${bvid}/` : "";
}
