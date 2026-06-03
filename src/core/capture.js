import { BilibiliClient } from "./bilibili-client.js";
import { normalizeApiComment, sortComments } from "./model.js";
import { extractBvid } from "./video.js";

export const DEFAULT_CAPTURE_OPTIONS = {
  rootOrder: "default",
  rootMaxPages: 20,
  rootMaxItems: 100,
  includeReplies: true,
  replyOrder: "default",
  replyMaxPagesPerRoot: 1,
  replyMaxItemsPerRoot: 5,
  requestDelayMs: 150,
};

const ORDER_VALUES = new Set(["default", "latest"]);

export function normalizeCaptureOptions(input = {}) {
  return {
    rootOrder: normalizeOrder(input.rootOrder, DEFAULT_CAPTURE_OPTIONS.rootOrder),
    rootMaxPages: normalizeLimit(input.rootMaxPages, DEFAULT_CAPTURE_OPTIONS.rootMaxPages, { min: 1, max: 5000 }),
    rootMaxItems: normalizeLimit(input.rootMaxItems, DEFAULT_CAPTURE_OPTIONS.rootMaxItems, { min: 1, max: 1_000_000 }),
    includeReplies: input.includeReplies !== false,
    replyOrder: normalizeOrder(input.replyOrder, DEFAULT_CAPTURE_OPTIONS.replyOrder),
    replyMaxPagesPerRoot: normalizeLimit(input.replyMaxPagesPerRoot, DEFAULT_CAPTURE_OPTIONS.replyMaxPagesPerRoot, {
      min: 1,
      max: 500,
    }),
    replyMaxItemsPerRoot: normalizeLimit(input.replyMaxItemsPerRoot, DEFAULT_CAPTURE_OPTIONS.replyMaxItemsPerRoot, {
      min: 0,
      max: 100_000,
    }),
    requestDelayMs: normalizeFiniteNumber(input.requestDelayMs, DEFAULT_CAPTURE_OPTIONS.requestDelayMs, {
      min: 0,
      max: 5000,
    }),
  };
}

export async function captureVideoComments(request = {}, runtime = {}) {
  const options = normalizeCaptureOptions(request.options || {});
  const client = runtime.client || new BilibiliClient();
  const signal = runtime.signal || null;
  const onProgress = typeof runtime.onProgress === "function" ? runtime.onProgress : () => {};
  const bvid = request.bvid || extractBvid(request.url);

  checkAbort(signal);
  onProgress({ phase: "video", message: "Resolving video metadata" });
  const video = await client.fetchVideoView({ bvid, url: request.url, signal });
  if (!video.aid) {
    throw new Error("无法识别这个 B 站视频的 AV 号");
  }

  const fetchedRootComments = [];
  const fetchedPinnedComments = [];
  const rootMode = options.rootOrder === "latest" ? 2 : 3;
  let offset = "";
  let rootPage = 0;
  let reachedRootEnd = false;
  const requestedRootOffsets = new Set();

  while (rootPage < options.rootMaxPages) {
    checkAbort(signal);
    if (requestedRootOffsets.has(offset)) {
      reachedRootEnd = true;
      break;
    }
    requestedRootOffsets.add(offset);
    rootPage += 1;
    onProgress({ phase: "root", page: rootPage, fetched: fetchedRootComments.length });
    const page = await client.fetchMainComments({
      oid: video.aid,
      mode: rootMode,
      offset,
      signal,
    });

    const fetchedAt = new Date().toISOString();
    for (const [index, reply] of page.topReplies.entries()) {
      fetchedPinnedComments.push(
        normalizeApiComment(reply, {
          level: "root",
          sourceSection: "pinned",
          sourcePage: rootPage,
          sourceIndex: index,
          sourceOrder: options.rootOrder,
          apiMode: rootMode,
          fetchedAt,
        })
      );
    }

    for (const [index, reply] of page.replies.entries()) {
      fetchedRootComments.push(
        normalizeApiComment(reply, {
          level: "root",
          sourceSection: "normal",
          sourcePage: rootPage,
          sourceIndex: index,
          sourceOrder: options.rootOrder,
          apiMode: rootMode,
          fetchedAt,
        })
      );
    }

    offset = page.cursor?.pagination_reply?.next_offset || "";
    reachedRootEnd = Boolean(page.cursor?.is_end) || !offset || page.replies.length === 0;
    const selectableCount = countSelectableRootComments(fetchedRootComments, fetchedPinnedComments);
    if (reachedRootEnd || hasReachedFiniteCount(selectableCount, options.rootMaxItems)) break;
    await delay(options.requestDelayMs, signal);
  }

  const pinnedComments = dedupeById(fetchedPinnedComments);
  const pinnedIds = new Set(pinnedComments.map((comment) => comment.id).filter(Boolean));
  const selectableRootComments = dedupeById(fetchedRootComments.filter((comment) => !pinnedIds.has(comment.id)));
  const selectedRoots = sortComments(selectableRootComments, options.rootOrder).slice(0, finiteSliceEnd(options.rootMaxItems));
  let fetchedReplyPages = 0;
  let nestedReplies = 0;
  const replyRoots = [...pinnedComments, ...selectedRoots];

  if (options.includeReplies && options.replyMaxItemsPerRoot > 0) {
    for (const [index, root] of replyRoots.entries()) {
      checkAbort(signal);
      if (root.metrics.replyCount <= 0 && !(root.replies || []).length) {
        root.replies = [];
        continue;
      }

      onProgress({
        phase: "reply",
        rootIndex: index + 1,
        rootTotal: replyRoots.length,
        rootId: root.id,
        fetched: nestedReplies,
      });
      const replies = await fetchRepliesForRoot(client, video.aid, root, options, signal, (count) => {
        fetchedReplyPages += count;
      });
      root.replies = replies;
      nestedReplies += replies.length;
      await delay(options.requestDelayMs, signal);
    }
  } else {
    for (const root of replyRoots) root.replies = [];
  }

  const generatedAt = new Date().toISOString();
  return {
    schemaVersion: "bili-comment-capture/v1",
    generatedAt,
    source: {
      kind: "chrome-extension",
      api: "bilibili-web-comment-api",
      pageUrl: request.url || video.url || "",
      commentSystem: {
        rootPagination: "cursor",
        rootCursorField: "cursor.pagination_reply.next_offset",
        rootPageSize: 20,
        replyPagination: "page-number",
        replyPageSize: 20,
      },
    },
    video,
    options: serializeCaptureOptions(options),
    stats: {
      pinnedComments: pinnedComments.length,
      rootComments: selectedRoots.length,
      nestedReplies,
      fetchedRootPages: rootPage,
      fetchedReplyPages,
      fetchedRootCandidates: fetchedRootComments.length,
      fetchedPinnedCandidates: fetchedPinnedComments.length,
      reachedRootEnd,
    },
    pinnedComments,
    comments: selectedRoots,
  };
}

async function fetchRepliesForRoot(client, oid, root, options, signal, onPageCount) {
  const replies = getVisibleInlineReplies(root, options.replyOrder);
  let pageNumber = 1;
  const pageSize = 20;
  const canStopOnItemLimit = options.replyOrder !== "latest";

  if (hasReachedFiniteLimit(replies, options.replyMaxItemsPerRoot)) {
    return dedupeById(replies).slice(0, finiteSliceEnd(options.replyMaxItemsPerRoot));
  }

  while (pageNumber <= options.replyMaxPagesPerRoot) {
    checkAbort(signal);
    const page = await client.fetchNestedReplies({
      oid,
      root: root.id,
      pn: pageNumber,
      ps: pageSize,
      signal,
    });
    onPageCount(1);

    const beforeUniqueCount = dedupeById(replies).length;
    const fetchedAt = new Date().toISOString();
    for (const [index, reply] of page.replies.entries()) {
      replies.push(
        normalizeApiComment(reply, {
          level: "reply",
          sourceSection: "reply",
          sourcePage: pageNumber,
          sourceIndex: index,
          sourceOrder: options.replyOrder,
          apiMode: "reply",
          fetchedAt,
        })
      );
    }

    const total = Number(page.page?.count) || replies.length;
    const uniqueCount = dedupeById(replies).length;
    const noNewReplies = uniqueCount === beforeUniqueCount && page.replies.length > 0;
    if (
      page.replies.length === 0 ||
      noNewReplies ||
      (canStopOnItemLimit && hasReachedFiniteCount(uniqueCount, options.replyMaxItemsPerRoot)) ||
      uniqueCount >= total
    )
      break;
    pageNumber += 1;
    await delay(options.requestDelayMs, signal);
  }

  return sortComments(dedupeById(replies), options.replyOrder).slice(0, finiteSliceEnd(options.replyMaxItemsPerRoot));
}

function getVisibleInlineReplies(root, order) {
  if (order !== "default") return [];
  return Array.isArray(root?.replies) ? [...root.replies] : [];
}

function normalizeLimit(value, fallback, bounds) {
  if (value === "all" || value === Infinity) return Infinity;
  return normalizeFiniteNumber(value, fallback, bounds);
}

function normalizeOrder(value, fallback) {
  if (ORDER_VALUES.has(value)) return value;
  return fallback;
}

function normalizeFiniteNumber(value, fallback, bounds) {
  const number = Number(value ?? fallback);
  const finite = Number.isFinite(number) ? Math.floor(number) : fallback;
  return Math.min(bounds.max, Math.max(bounds.min, finite));
}

function finiteSliceEnd(value) {
  return value === Infinity ? undefined : value;
}

function hasReachedFiniteLimit(comments, limit) {
  return hasReachedFiniteCount(dedupeById(comments).length, limit);
}

function hasReachedFiniteCount(count, limit) {
  return limit !== Infinity && count >= limit;
}

function countSelectableRootComments(rootComments, pinnedComments) {
  const pinnedIds = new Set(dedupeById(pinnedComments).map((comment) => comment.id).filter(Boolean));
  return dedupeById(rootComments.filter((comment) => !pinnedIds.has(comment.id))).length;
}

export function serializeCaptureOptions(options) {
  const serialized = {};
  for (const [key, value] of Object.entries(options)) {
    serialized[key] = value === Infinity ? "all" : value;
  }
  return serialized;
}

function dedupeById(comments) {
  const seen = new Set();
  const output = [];
  for (const comment of comments) {
    if (!comment.id || seen.has(comment.id)) continue;
    seen.add(comment.id);
    output.push(comment);
  }
  return output;
}

function delay(ms, signal) {
  checkAbort(signal);
  if (!ms) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    if (signal) {
      signal.addEventListener(
        "abort",
        () => {
          clearTimeout(timer);
          reject(new DOMException("Capture was cancelled", "AbortError"));
        },
        { once: true }
      );
    }
  });
}

function checkAbort(signal) {
  if (signal?.aborted) {
    throw new DOMException("Capture was cancelled", "AbortError");
  }
}
