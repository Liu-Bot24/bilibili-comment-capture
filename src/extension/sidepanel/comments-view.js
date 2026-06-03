import { exportCaptureResult } from "../../core/exporters.js";
import { t } from "./i18n.js";

export function renderEmptyComments(elements) {
  elements.resultTitle.textContent = t("results.emptyTitle");
  elements.resultMeta.textContent = t("results.emptyMeta");
  elements.resultStats.textContent = t("results.notCaptured");
  elements.commentList.textContent = "";
  elements.commentList.append(emptyMessage(t("results.emptyList")));
  elements.commentSearch.value = "";
  elements.commentSearch.disabled = true;
  elements.copyAllComments.disabled = true;
  elements.exportJson.disabled = true;
  elements.exportMarkdown.disabled = true;
}

export function renderCapturedComments(elements, result) {
  elements.commentList.textContent = "";
  elements.resultTitle.textContent = result?.video?.title || t("results.untitledVideo");
  elements.resultMeta.textContent = `${result?.video?.bvid || ""} · ${result?.source?.pageUrl || ""}`.trim();

  const allThreads = toThreads(result);
  const searchQuery = elements.commentSearch.value || "";
  const threads = filterCommentThreads(allThreads, searchQuery);
  const stats = result?.stats || {};
  const pinned = stats.pinnedComments ? t("results.statsPinned", { count: formatNumber(stats.pinnedComments) }) : "";
  elements.resultStats.textContent = t("results.stats", {
    pinned,
    roots: formatNumber(stats.rootComments),
    replies: formatNumber(stats.nestedReplies),
  });
  elements.commentSearch.disabled = allThreads.length === 0;
  elements.copyAllComments.disabled = allThreads.length === 0;
  elements.exportJson.disabled = allThreads.length === 0;
  elements.exportMarkdown.disabled = allThreads.length === 0;

  if (!allThreads.length) {
    elements.commentList.append(emptyMessage(t("empty.noComments")));
    return;
  }

  if (!threads.length) {
    elements.commentList.append(emptyMessage(t("empty.noMatches", { query: searchQuery.trim() })));
    return;
  }

  for (const thread of threads) {
    elements.commentList.append(renderCommentThread(thread));
  }
}

export function filterCommentThreads(threads, query) {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return threads;
  return (threads || []).filter((thread) => threadMatchesSearch(thread, normalizedQuery));
}

export async function copyAllComments(elements, result) {
  if (!result) return;
  const threads = toThreads(result);
  if (!threads.length) return;

  const text = formatCopyText(result);
  try {
    await navigator.clipboard.writeText(text);
  } catch (_error) {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    document.body.append(textarea);
    textarea.select();
    document.execCommand("copy");
    textarea.remove();
  }
  setCommentsFeedback(elements, t("copy.done"));
}

export function exportCommentsAsJson(elements, result) {
  exportComments(elements, result, "json", t("status.exportedJson"));
}

export function exportCommentsAsMarkdown(elements, result) {
  exportComments(elements, result, "markdown", t("status.exportedMarkdown"));
}

function exportComments(elements, result, format, feedback) {
  if (!result) return;
  const exported = exportCaptureResult(result, format);
  const blob = new Blob([exported.text], { type: exported.mimeType });
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = exported.filename;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
  setCommentsFeedback(elements, feedback);
}

export function setCommentsFeedback(elements, message) {
  elements.commentsFeedback.textContent = message;
}

function renderCommentThread({ comment, label }) {
  const item = document.createElement("article");
  item.className = "comment-thread";

  const head = document.createElement("div");
  head.className = "comment-line-head";
  const author = document.createElement("span");
  author.className = "comment-author";
  author.textContent = `${label} · ${comment.author?.name || "Unknown"}`;
  const metrics = document.createElement("span");
  metrics.textContent = t("comment.metrics", {
    time: formatTime(comment.ctime),
    likes: formatNumber(comment.metrics?.like || 0),
    replies: formatNumber(comment.metrics?.replyCount || 0),
  });
  head.append(author, metrics);

  const text = document.createElement("div");
  text.className = "comment-text";
  text.textContent = comment.content?.message || "";
  item.append(head, text);

  if (comment.replies?.length) {
    const replies = document.createElement("div");
    replies.className = "comment-replies";
    for (const reply of comment.replies) {
      replies.append(renderReplyLine(reply));
    }
    item.append(replies);
  }
  return item;
}

function renderReplyLine(reply) {
  const line = document.createElement("div");
  line.className = "comment-reply";
  const name = document.createElement("strong");
  name.textContent = reply.author?.name || "Unknown";
  line.append(name, document.createTextNode(`：${reply.content?.message || ""}`));
  return line;
}

function threadMatchesSearch(thread, query) {
  const comment = thread?.comment || {};
  return (
    textMatches(thread?.label, query) ||
    textMatches(comment.author?.name, query) ||
    textMatches(comment.content?.message, query) ||
    textMatches(comment.id, query) ||
    (comment.replies || []).some((reply) =>
      textMatches(reply.author?.name, query) ||
      textMatches(reply.content?.message, query) ||
      textMatches(reply.id, query)
    )
  );
}

function textMatches(value, query) {
  return normalizeSearchText(value).includes(query);
}

export function formatCopyText(result) {
  return exportCaptureResult(result, "markdown").text;
}

function toThreads(result) {
  return [
    ...(result?.pinnedComments || []).map((comment) => ({ comment, label: t("thread.pinned") })),
    ...(result?.comments || []).map((comment, index) => ({ comment, label: `#${index + 1}` })),
  ];
}

function emptyMessage(text) {
  const empty = document.createElement("p");
  empty.className = "empty-state";
  empty.textContent = text;
  return empty;
}

function normalizeSearchText(value) {
  return String(value || "").trim().toLowerCase();
}

function formatNumber(value) {
  return new Intl.NumberFormat("zh-CN").format(Number(value) || 0);
}

function formatTime(ctime) {
  if (!ctime) return "";
  const date = new Date(Number(ctime) * 1000);
  return `${date.getMonth() + 1}-${date.getDate()} ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}
