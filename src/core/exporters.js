import { flattenComments } from "./model.js";
import { makeDownloadFilename } from "./video.js";

const FORMAT_INFO = {
  json: { extension: "json", mimeType: "application/json;charset=utf-8" },
  jsonl: { extension: "jsonl", mimeType: "application/x-ndjson;charset=utf-8" },
  markdown: { extension: "md", mimeType: "text/markdown;charset=utf-8" },
};

const VIDEO_OWNER_MARKER = "【系统标记：该评论作者已通过用户 ID 匹配为视频 UP 主本人】";

export function exportCaptureResult(result, format = "json") {
  const info = FORMAT_INFO[format];
  if (!info) {
    throw new Error(`Unsupported export format: ${format}`);
  }

  const generatedAt = result.generatedAt || new Date().toISOString();
  const filename = makeDownloadFilename({
    bvid: result.video?.bvid || "bilibili",
    title: result.video?.title || "comments",
    generatedAt,
    extension: info.extension,
  });

  if (format === "json") {
    return {
      filename,
      mimeType: info.mimeType,
      text: `${JSON.stringify(toAiJson({ ...result, generatedAt }), null, 2)}\n`,
    };
  }

  if (format === "jsonl") {
    const rows = [
      ...flattenComments(result.pinnedComments, { section: "pinned" }),
      ...flattenComments(result.comments, { section: "normal" }),
    ].map((row) => ({
      schemaVersion: result.schemaVersion,
      generatedAt,
      video: result.video,
      ...row,
    }));
    return {
      filename,
      mimeType: info.mimeType,
      text: `${rows.map((row) => JSON.stringify(row)).join("\n")}\n`,
    };
  }

  return {
    filename,
    mimeType: info.mimeType,
    text: toMarkdown({ ...result, generatedAt }),
  };
}

function toAiJson(result) {
  const pinnedComments = result.pinnedComments || [];
  const comments = result.comments || [];
  const stats = result.stats || {};
  const videoOwnerMid = normalizeId(result.video?.owner?.mid);

  return {
    format: "bilibili-comment-ai-analysis/v1",
    generatedAt: result.generatedAt,
    schemaVersion: result.schemaVersion || "bili-comment-capture/v1",
    exportGuide: buildExportGuide(result, { includeCounts: true }),
    video: toAiVideo(result.video || {}, result.source || {}),
    captureContext: {
      sourceUrl: result.source?.pageUrl || result.video?.url || "",
      sourceKind: result.source?.kind || "",
      api: result.source?.api || "",
      rootOrder: result.options?.rootOrder || "",
      replyOrder: result.options?.replyOrder || "",
      rootLimit: finiteOrNull(result.options?.rootMaxItems),
      rootPageLimit: finiteOrNull(result.options?.rootMaxPages),
      replyLimitPerRoot: finiteOrNull(result.options?.replyMaxItemsPerRoot),
      replyPageLimitPerRoot: finiteOrNull(result.options?.replyMaxPagesPerRoot),
      includeReplies: Boolean(result.options?.includeReplies),
      reachedRootEnd: Boolean(stats.reachedRootEnd),
    },
    summary: {
      pinnedCommentCount: stats.pinnedComments ?? pinnedComments.length,
      rootCommentCount: stats.rootComments ?? comments.length,
      nestedReplyCount: stats.nestedReplies ?? countReplies([...pinnedComments, ...comments]),
      fetchedRootPages: stats.fetchedRootPages ?? 0,
      fetchedReplyPages: stats.fetchedReplyPages ?? 0,
    },
    threads: [
      ...pinnedComments.map((comment, index) => toAiThread(comment, "pinned", index, { videoOwnerMid })),
      ...comments.map((comment, index) =>
        toAiThread(comment, "normal", pinnedComments.length + index, { videoOwnerMid })
      ),
    ],
  };
}

function toAiVideo(video, source) {
  const page = video.page || null;
  return {
    bvid: video.bvid || "",
    title: video.title || "",
    url: video.url || source.pageUrl || "",
    ownerName: video.owner?.name || "",
    page: page
      ? {
          cid: page.cid ?? null,
          page: page.page ?? null,
          part: page.part || "",
          duration: page.duration ?? null,
        }
      : null,
  };
}

function toAiThread(comment, threadType, threadIndex, context = {}) {
  const rootComment = toAiComment(comment, "root", {
    rootCommentId: comment.id || null,
    parentCommentId: null,
    videoOwnerMid: context.videoOwnerMid,
  });
  return {
    threadType,
    threadIndex,
    rootComment,
    replies: (comment.replies || []).map((reply, replyIndex) =>
      toAiComment(reply, "reply", {
        rootCommentId: reply.rootId || comment.id || null,
        parentCommentId: reply.parentId || comment.id || null,
        replyIndex,
        videoOwnerMid: context.videoOwnerMid,
      })
    ),
  };
}

function toAiComment(comment, level, context = {}) {
  const isVideoOwner = isCommentByVideoOwner(comment, context.videoOwnerMid);
  return {
    commentId: comment.id || "",
    level,
    authorName: comment.author?.name || "",
    isVideoOwner,
    authorRole: isVideoOwner ? "video_owner" : "viewer",
    authorIdentityLabel: isVideoOwner ? VIDEO_OWNER_MARKER : "",
    text: comment.content?.message || "",
    createdAt: comment.createdAt || null,
    ctime: comment.ctime ?? null,
    likeCount: comment.metrics?.like ?? 0,
    replyCount: comment.metrics?.replyCount ?? 0,
    rootCommentId: context.rootCommentId ?? comment.rootId ?? null,
    parentCommentId: context.parentCommentId ?? comment.parentId ?? null,
    sourceSection: comment.source?.section || "",
    sourcePage: comment.source?.page ?? null,
    indexInPage: comment.source?.indexInPage ?? null,
    replyIndex: context.replyIndex ?? null,
    floor: comment.floor ?? null,
    pictures: comment.content?.pictures || [],
  };
}

function toMarkdown(result) {
  const guide = buildExportGuide(result, { includeCounts: true });
  const videoOwnerMid = normalizeId(result.video?.owner?.mid);
  const lines = [
    `# ${result.video?.title || "Bilibili Comments"}`,
    "",
    "## 导出说明",
    "",
    `- 视频标题：${guide.video.title}`,
    `- UP 主：${formatOwnerForMarkdown(guide.video)}`,
    `- BV 号：${guide.video.bvid}`,
    `- URL: ${guide.video.url}`,
    `- 导出时间：${result.generatedAt}`,
    `- 主评论排序：${guide.ordering.rootComments}`,
    `- 楼中楼排序：${guide.ordering.nestedReplies}`,
    `- 评论统计：置顶评论 ${guide.counts.pinnedCommentCount} 条，直接评论 ${guide.counts.directCommentCount} 条，楼中楼 ${guide.counts.nestedReplyCount} 条。`,
    "",
    "### 结构规则",
    "",
    `- 直接评论：${guide.terms.directComment}`,
    `- 楼中楼：${guide.terms.nestedReply}`,
    `- 置顶评论：${guide.terms.pinnedComment}`,
    `- 评论串：${guide.structure.thread}`,
    `- 评论顺序编号：${guide.fields.threadIndex}`,
    `- 楼中楼顺序编号：${guide.fields.replyIndex}`,
    `- 评论 ID：${guide.fields.commentId}`,
    `- UP 主本人标记：${guide.fields.isVideoOwner}`,
    `- 点赞数：${guide.fields.likeCount}`,
    `- 回复数：${guide.fields.replyCount}`,
    "",
  ];

  if (result.pinnedComments?.length) {
    lines.push("## 置顶评论", "");
    for (const comment of result.pinnedComments) {
      appendCommentMarkdown(lines, comment, { headingLevel: "###", videoOwnerMid });
    }
  }

  if (result.comments?.length) {
    lines.push("## 直接评论", "");
  }

  for (const [index, comment] of (result.comments || []).entries()) {
    appendCommentMarkdown(lines, comment, { prefix: `${index + 1}.`, headingLevel: "###", videoOwnerMid });
  }

  return `${lines.join("\n").trim()}\n`;
}

function finiteOrNull(value) {
  return Number.isFinite(value) ? value : null;
}

function countReplies(comments) {
  return comments.reduce((sum, comment) => sum + (comment.replies?.length || 0), 0);
}

function buildExportGuide(result, options = {}) {
  const video = toAiVideo(result.video || {}, result.source || {});
  const pinnedComments = result.pinnedComments || [];
  const comments = result.comments || [];
  const stats = result.stats || {};

  return {
    purpose: "这份文件用于让 AI 或人工阅读 B 站视频评论抓取结果。请先阅读 exportGuide，再分析 threads 或 Markdown 评论正文。",
    video: {
      title: video.title,
      ownerName: video.ownerName,
      bvid: video.bvid,
      url: video.url,
      page: video.page,
    },
    structure: {
      threads: "threads 是评论串数组，按本次导出的展示顺序排列。每个 thread 都由一条直接评论 rootComment 和它下面的 replies 组成。",
      thread: "一条评论串代表一个视频第一层评论及其下方楼中楼回复；置顶评论也按同样结构表达。",
      rootComment: "rootComment 是直接评论，即视频评论区第一层评论。",
      replies: "replies 是楼中楼，即直接评论下面的第二层回复数组。",
    },
    terms: {
      directComment: "视频评论区第一层评论；在 JSON 中对应 rootComment，在 Markdown 中对应“直接评论”。",
      nestedReply: "直接评论下面的回复；也就是通常说的楼中楼。在 JSON 中对应 replies 数组里的每一项，在 Markdown 中对应直接评论下方的“楼中楼”。",
      pinnedComment: "B 站置顶评论；它也是第一层直接评论，但 threadType 为 pinned，统计时单独列出。",
    },
    fields: {
      threadIndex: "从 0 开始，表示该评论串在本导出 threads 数组中的位置，不是 B 站楼层号。",
      replyIndex: "从 0 开始，表示该回复在所属直接评论 replies 数组中的位置。",
      commentId: "B 站评论 RPID，可用于唯一识别一条评论或回复。",
      authorName: "评论人的公开昵称。",
      isVideoOwner: `如果评论作者的用户 ID 与视频 UP 主用户 ID 完全一致，则追加 ${VIDEO_OWNER_MARKER}；只看用户 ID，不按昵称判断，所以同名高仿不会被标记。`,
      text: "评论或回复的正文内容。",
      likeCount: "指当前这一条评论或回复本身收到的点赞数。",
      replyCount: "指当前直接评论下面的楼中楼回复总数；楼中楼自身通常没有下级回复。",
      rootCommentId: "所属直接评论的评论 ID；直接评论自身等于自己的 commentId。",
      parentCommentId: "父评论 ID；楼中楼通常指向所属直接评论或被回复的楼中楼。",
      sourcePage: "本工具抓取该评论时所在的接口分页页码。",
      indexInPage: "该评论在抓取到的接口分页内的原始序号，从 0 开始。",
      floor: "B 站返回的楼层字段；可能为空或不连续，不应当替代 threadIndex 作为本导出顺序。",
    },
    ordering: {
      rootComments: describeOrder(result.options?.rootOrder, "root"),
      nestedReplies: describeOrder(result.options?.replyOrder, "reply"),
    },
    counts: options.includeCounts
      ? {
          pinnedCommentCount: stats.pinnedComments ?? pinnedComments.length,
          directCommentCount: stats.rootComments ?? comments.length,
          nestedReplyCount: stats.nestedReplies ?? countReplies([...pinnedComments, ...comments]),
        }
      : undefined,
  };
}

function describeOrder(order, level) {
  if (order === "latest") {
    return level === "root"
      ? "最新评论顺序，按发布时间从新到旧排列直接评论。"
      : "时间倒序，按本次抓取到的楼中楼发布时间从新到旧排列；这不是 B 站全量楼中楼最新评论流。";
  }

  return level === "root"
    ? "B 站默认顺序，本工具按接口返回的默认/综合热度展示顺序保留直接评论，不额外按点赞数或时间重排。"
    : "B 站默认顺序，本工具先保留页面当前可见预览里的楼中楼顺序，再用展开列表接口补足后续回复并去重，不额外按点赞数或时间重排。";
}

function formatOwnerForMarkdown(video) {
  return video.ownerName || "未知";
}

function appendCommentMarkdown(lines, comment, options = {}) {
  const headingLevel = options.headingLevel || "##";
  const prefix = options.prefix ? `${options.prefix} ` : "";
  const label = options.prefix ? "直接评论" : "置顶评论";
  lines.push(`${headingLevel} ${prefix}${label} · ${formatCommentAuthor(comment, options.videoOwnerMid)}`);
  if (comment.id) lines.push(`- 评论 ID：${comment.id}`);
  if (comment.createdAt) lines.push(`- 发布时间：${comment.createdAt}`);
  lines.push(`- 点赞数：${comment.metrics?.like ?? 0}`);
  lines.push(`- 回复数：${comment.metrics?.replyCount ?? comment.replies?.length ?? 0}`);
  lines.push("");
  lines.push("内容：");
  lines.push("");
  lines.push(comment.content?.message || "");
  lines.push("");

  if (comment.replies?.length) {
    lines.push("#### 楼中楼", "");
  }

  for (const [replyIndex, reply] of (comment.replies || []).entries()) {
    lines.push(`- 楼中楼 #${replyIndex + 1} · ${formatCommentAuthor(reply, options.videoOwnerMid)}`);
    if (reply.id) lines.push(`  - 评论 ID：${reply.id}`);
    if (reply.rootId || comment.id) lines.push(`  - 所属直接评论 ID：${reply.rootId || comment.id}`);
    if (reply.parentId) lines.push(`  - 父评论 ID：${reply.parentId}`);
    if (reply.createdAt) lines.push(`  - 发布时间：${reply.createdAt}`);
    lines.push(`  - 点赞数：${reply.metrics?.like ?? 0}`);
    lines.push("  - 内容：");
    for (const line of String(reply.content?.message || "").split("\n")) {
      lines.push(`    ${line}`);
    }
    lines.push("");
  }
}

function formatCommentAuthor(comment, videoOwnerMid) {
  const name = comment.author?.name || "Unknown";
  return isCommentByVideoOwner(comment, videoOwnerMid) ? `${name}${VIDEO_OWNER_MARKER}` : name;
}

function isCommentByVideoOwner(comment, videoOwnerMid) {
  const ownerMid = normalizeId(videoOwnerMid);
  return Boolean(ownerMid && normalizeId(comment.author?.mid) === ownerMid);
}

function normalizeId(value) {
  if (value === undefined || value === null || value === "") return "";
  return String(value);
}
