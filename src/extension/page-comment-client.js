import { BilibiliApiError, BilibiliClient } from "../core/bilibili-client.js";

export function createPageCommentClient({ chromeApi, tabId, fallbackClient = new BilibiliClient() } = {}) {
  return {
    fetchVideoView(options) {
      return fallbackClient.fetchVideoView(options);
    },
    fetchNestedReplies(options) {
      return fallbackClient.fetchNestedReplies(options);
    },
    async fetchMainComments(options = {}) {
      if (!tabId) return fallbackClient.fetchMainComments(options);
      const bridgeResult = await fetchPageCommentBatch(chromeApi, tabId, {
        oid: options.oid,
        type: 1,
        mode: options.mode || 3,
        offset: options.offset || "",
        seekRpid: options.seekRpid || "",
      });

      if (!bridgeResult.ok) {
        throw new BilibiliApiError("无法读取当前页面的评论顺序，请刷新当前 B 站视频页后重试", {
          code: "PAGE_COMMENT_BRIDGE_UNAVAILABLE",
          details: { message: bridgeResult.message || "unknown page bridge error" },
        });
      }

      return toMainCommentPage(bridgeResult);
    },
  };
}

async function fetchPageCommentBatch(chromeApi, tabId, args) {
  if (!chromeApi?.scripting?.executeScript) {
    return { ok: false, message: "chrome.scripting.executeScript is unavailable" };
  }

  try {
    const [injection] = await chromeApi.scripting.executeScript({
      target: { tabId },
      world: "MAIN",
      func: fetchBilibiliCommentBatchInPage,
      args: [args],
    });
    return injection?.result || { ok: false, message: "empty page bridge result" };
  } catch (error) {
    return { ok: false, message: error?.message || String(error) };
  }
}

function toMainCommentPage(result) {
  const topReplies = [];
  const replies = [];

  for (const reply of Array.isArray(result.replies) ? result.replies : []) {
    if (reply?.reply_control?.is_up_top === true) {
      topReplies.push(reply);
    } else {
      replies.push(reply);
    }
  }

  return {
    cursor: result.cursor || {},
    replies,
    topReplies,
    hots: [],
    config: null,
    control: null,
  };
}

async function fetchBilibiliCommentBatchInPage(args) {
  const tagName = "bili-comments";
  const timeoutMs = 10_000;
  const startedAt = Date.now();

  function waitForComponent() {
    if (customElements.get(tagName)) return Promise.resolve();
    const remaining = Math.max(1, timeoutMs - (Date.now() - startedAt));
    return waitWithTimeout(customElements.whenDefined(tagName), remaining, "bili-comments component is not ready");
  }

  function waitWithTimeout(promise, ms, message) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(message)), ms);
      Promise.resolve(promise).then(
        (value) => {
          clearTimeout(timer);
          resolve(value);
        },
        (error) => {
          clearTimeout(timer);
          reject(error);
        }
      );
    });
  }

  function nextOffsetFrom(paginationStr) {
    try {
      return JSON.parse(paginationStr || "{}")?.offset || "";
    } catch (_error) {
      return "";
    }
  }

  function toPlainComments(comments) {
    return JSON.parse(JSON.stringify(comments || []));
  }

  function readActiveSeekRpid(liveElement) {
    if (args.offset) return "";
    const value =
      args.seekRpid ||
      liveElement?.seekRpid ||
      liveElement?.getAttribute?.("seek-rpid") ||
      liveElement?.getAttribute?.("seek_rpid") ||
      "";
    return value ? String(value) : "";
  }

  function readElementSubject(element) {
    const params = String(element?.getAttribute?.("data-params") || "");
    const [attrType, attrOid] = params.split(",");
    return {
      oid: String(element?.oid || attrOid || ""),
      type: Number(element?.type || attrType || 1),
      mode: Number(element?.mode || element?.getAttribute?.("mode") || 3),
    };
  }

  function isMatchingLiveElement(element) {
    if (!element) return false;
    const subject = readElementSubject(element);
    return (
      subject.oid === String(args.oid || "") &&
      subject.type === (Number(args.type) || 1) &&
      subject.mode === (Number(args.mode) || 3)
    );
  }

  function makeBatchResult(element, comments) {
    return {
      ok: true,
      cursor: {
        is_end: Boolean(element.showEnd),
        pagination_reply: { next_offset: nextOffsetFrom(element.paginationStr) },
        all_count: Number(element.count) || 0,
      },
      replies: toPlainComments(comments),
    };
  }

  async function readFromLiveElement(element) {
    if (!isMatchingLiveElement(element)) return null;
    const currentList = Array.isArray(element.list) ? element.list : [];

    if (!args.offset) {
      if (currentList.length > 0) return makeBatchResult(element, currentList);
      if (typeof element.getList === "function") {
        await waitWithTimeout(element.getList(), timeoutMs, "bili-comments.getList timed out");
        return makeBatchResult(element, Array.isArray(element.list) ? element.list : []);
      }
      return null;
    }

    if (typeof element.getList !== "function") return null;
    const liveOffset = nextOffsetFrom(element.paginationStr);
    if (liveOffset && liveOffset !== String(args.offset)) return null;

    const beforeLength = currentList.length;
    await waitWithTimeout(element.getList(), timeoutMs, "bili-comments.getList timed out");
    const nextList = Array.isArray(element.list) ? element.list : [];
    return makeBatchResult(element, nextList.slice(beforeLength));
  }

  try {
    await waitForComponent();
    const liveElement = document.querySelector?.(tagName);
    const liveResult = await readFromLiveElement(liveElement);
    if (liveResult) return liveResult;

    const activeSeekRpid = readActiveSeekRpid(liveElement);
    const element = document.createElement(tagName);
    element.style.cssText =
      "position:fixed;left:-10000px;top:-10000px;width:1px;height:1px;overflow:hidden;opacity:0;pointer-events:none;";
    document.documentElement.appendChild(element);

    try {
      element.oid = String(args.oid || "");
      element.type = Number(args.type) || 1;
      element.mode = Number(args.mode) || 3;
      element.paginationStr = JSON.stringify({ offset: args.offset || "" });
      element.seekRpid = activeSeekRpid;
      element.cmFromTrackId = "";
      element.showSpinner = false;
      element.showEnd = false;
      element.showContinuations = false;
      element.maxViewLimit = 0;
      element.disableUpActions = true;
      element.fixedCommentBox = false;
      element.loadedID = {};
      element.invisibleID = {};
      element.list = [];

      if (typeof element.getList !== "function") {
        return { ok: false, message: "bili-comments.getList is unavailable" };
      }

      await waitWithTimeout(element.getList(), timeoutMs, "bili-comments.getList timed out");
      return makeBatchResult(element, Array.isArray(element.list) ? element.list : []);
    } finally {
      element.remove();
    }
  } catch (error) {
    return { ok: false, message: error?.message || String(error) };
  }
}
