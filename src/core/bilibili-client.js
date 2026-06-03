import { extractBvid, getUrlPage, normalizeVideoUrl } from "./video.js";
import { extractWbiKeyFromUrl, getMixinKey, signWbiParams } from "./wbi.js";

const API_BASE = "https://api.bilibili.com";

export class BilibiliApiError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = "BilibiliApiError";
    this.code = options.code || "BILIBILI_API_ERROR";
    this.status = options.status || 0;
    this.details = options.details || null;
  }
}

export class BilibiliClient {
  constructor(options = {}) {
    this.fetchImpl = options.fetchImpl || globalThis.fetch?.bind(globalThis);
    this.credentials = options.credentials || "include";
    this.wbiCache = null;
  }

  async fetchVideoView(options = {}) {
    const bvid = options.bvid || extractBvid(options.url);
    if (!bvid) {
      throw new BilibiliApiError("No BV id found in the current Bilibili URL", { code: "MISSING_BVID" });
    }

    const payload = await this.fetchJson("/x/web-interface/view", {
      params: { bvid },
      signal: options.signal,
    });
    const data = requireOkPayload(payload, "video view");
    const pageNumber = Number(options.page) || getUrlPage(options.url);
    const pages = Array.isArray(data.pages) ? data.pages : [];
    const selectedPage = pages.find((page) => Number(page.page) === pageNumber) || pages[0] || null;

    return {
      bvid,
      aid: Number(data.aid) || 0,
      title: data.title || "",
      description: data.desc || "",
      url: normalizeVideoUrl(options.url || bvid),
      owner: data.owner
        ? {
            mid: String(data.owner.mid || ""),
            name: data.owner.name || "",
            avatar: data.owner.face || "",
          }
        : null,
      page: selectedPage
        ? {
            cid: Number(selectedPage.cid) || 0,
            page: Number(selectedPage.page) || 1,
            part: selectedPage.part || "",
            duration: Number(selectedPage.duration) || 0,
          }
        : null,
      pages: pages.map((page) => ({
        cid: Number(page.cid) || 0,
        page: Number(page.page) || 0,
        part: page.part || "",
        duration: Number(page.duration) || 0,
      })),
    };
  }

  async fetchMainComments(options = {}) {
    const params = {
      type: 1,
      oid: options.oid,
      mode: options.mode || 2,
      plat: 1,
      web_location: 1315875,
    };
    if (options.offset) {
      params.pagination_str = JSON.stringify({ offset: options.offset });
    }

    const payload = await this.fetchJson("/x/v2/reply/wbi/main", {
      params,
      signed: true,
      signal: options.signal,
    });
    const data = requireOkPayload(payload, "main comments");
    if (data.v_voucher) {
      throw new BilibiliApiError("Bilibili requested an extra verification voucher for comments", {
        code: "BILIBILI_VOUCHER_REQUIRED",
      });
    }

    return {
      cursor: data.cursor || {},
      replies: Array.isArray(data.replies) ? data.replies : [],
      topReplies: Array.isArray(data.top_replies) ? data.top_replies : [],
      hots: Array.isArray(data.hots) ? data.hots : [],
      config: data.config || null,
      control: data.control || null,
    };
  }

  async fetchNestedReplies(options = {}) {
    const payload = await this.fetchJson("/x/v2/reply/reply", {
      params: {
        type: 1,
        oid: options.oid,
        root: options.root,
        ps: Math.max(1, Math.min(20, Number(options.ps) || 20)),
        pn: Math.max(1, Number(options.pn) || 1),
      },
      signal: options.signal,
    });
    const data = requireOkPayload(payload, "nested replies");

    return {
      page: data.page || {},
      root: data.root || null,
      replies: Array.isArray(data.replies) ? data.replies : [],
    };
  }

  async fetchWbiKeys(options = {}) {
    const now = Date.now();
    if (this.wbiCache && this.wbiCache.expiresAt > now) return this.wbiCache;

    const payload = await this.fetchJson("/x/web-interface/nav", {
      signal: options.signal,
      allowNonZeroCode: true,
    });
    const wbiImg = payload?.data?.wbi_img;
    const imgKey = extractWbiKeyFromUrl(wbiImg?.img_url);
    const subKey = extractWbiKeyFromUrl(wbiImg?.sub_url);
    if (!imgKey || !subKey) {
      throw new BilibiliApiError("Could not resolve Bilibili WBI keys", {
        code: "MISSING_WBI_KEYS",
        details: { responseCode: payload?.code },
      });
    }

    this.wbiCache = {
      imgKey,
      subKey,
      mixinKey: getMixinKey(imgKey, subKey),
      expiresAt: now + 6 * 60 * 60 * 1000,
    };
    return this.wbiCache;
  }

  async fetchJson(pathOrUrl, options = {}) {
    if (!this.fetchImpl) {
      throw new BilibiliApiError("No fetch implementation is available", { code: "FETCH_UNAVAILABLE" });
    }

    const url = new URL(pathOrUrl.startsWith("http") ? pathOrUrl : `${API_BASE}${pathOrUrl}`);
    let query = "";
    if (options.signed) {
      const keys = await this.fetchWbiKeys({ signal: options.signal });
      query = signWbiParams(options.params || {}, keys.mixinKey).query;
    } else {
      query = makeQuery(options.params || {});
    }
    if (query) url.search = query;

    const response = await this.fetchImpl(url.toString(), {
      method: "GET",
      credentials: this.credentials,
      cache: "no-store",
      redirect: "follow",
      signal: options.signal,
      headers: {
        accept: "application/json, text/plain, */*",
      },
    });

    if (!response.ok) {
      throw new BilibiliApiError(`Request failed with HTTP ${response.status}`, {
        code: "HTTP_ERROR",
        status: response.status,
        details: { url: stripQuery(url.toString()) },
      });
    }

    let payload;
    try {
      payload = await response.json();
    } catch (error) {
      throw new BilibiliApiError("Bilibili response was not valid JSON", {
        code: "INVALID_JSON",
        status: response.status,
        details: { cause: error.message },
      });
    }

    if (!options.allowNonZeroCode && Number(payload?.code) !== 0) {
      throw new BilibiliApiError(payload?.message || `Bilibili returned code ${payload?.code}`, {
        code: "BILIBILI_RESPONSE_ERROR",
        details: { responseCode: payload?.code, url: stripQuery(url.toString()) },
      });
    }
    return payload;
  }
}

function requireOkPayload(payload, source) {
  if (!payload || typeof payload !== "object") {
    throw new BilibiliApiError(`${source} returned an empty response`, { code: "EMPTY_RESPONSE" });
  }
  if (Number(payload.code) !== 0) {
    throw new BilibiliApiError(payload.message || `${source} returned code ${payload.code}`, {
      code: "BILIBILI_RESPONSE_ERROR",
      details: { responseCode: payload.code, source },
    });
  }
  return payload.data || {};
}

function makeQuery(params) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") {
      query.set(key, String(value));
    }
  }
  return query.toString();
}

function stripQuery(input) {
  try {
    const url = new URL(input);
    url.search = "";
    return url.toString();
  } catch (_error) {
    return String(input).split("?")[0];
  }
}
