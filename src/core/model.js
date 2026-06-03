export const COMMENT_ORDERS = new Set(["default", "latest"]);

export function normalizeApiComment(comment, options = {}) {
  const id = toId(comment?.rpid_str || comment?.rpid);
  const rootId = toId(comment?.root_str || comment?.root);
  const parentId = toId(comment?.parent_str || comment?.parent);
  const ctime = toNumber(comment?.ctime, 0);
  const suppliedReplies = Array.isArray(options.replies) ? options.replies : Array.isArray(comment?.replies) ? comment.replies : [];

  return {
    id,
    rpid: id,
    oid: toId(comment?.oid),
    type: toNumber(comment?.type, 1),
    level: options.level || (rootId && rootId !== "0" ? "reply" : "root"),
    rootId: rootId && rootId !== "0" ? rootId : null,
    parentId: parentId && parentId !== "0" ? parentId : null,
    dialogId: toId(comment?.dialog_str || comment?.dialog) || null,
    floor: toNumber(comment?.floor, 0),
    createdAt: ctime > 0 ? new Date(ctime * 1000).toISOString() : null,
    ctime,
    author: normalizeAuthor(comment?.member, comment?.mid),
    content: normalizeContent(comment?.content),
    metrics: {
      like: toNumber(comment?.like, 0),
      replyCount: toNumber(comment?.rcount ?? comment?.count, 0),
      childCount: toNumber(comment?.count, 0),
    },
    flags: {
      upLiked: Boolean(comment?.up_action?.like),
      upReplied: Boolean(comment?.up_action?.reply),
      invisible: Boolean(comment?.invisible),
      folded: Boolean(comment?.folder?.is_folded),
    },
    source: {
      section: options.sourceSection || options.section || (options.level === "reply" ? "reply" : "normal"),
      page: toNumber(options.sourcePage, 0),
      indexInPage: toNumber(options.sourceIndex, 0),
      order: options.sourceOrder || "",
      apiMode: options.apiMode || null,
      fetchedAt: options.fetchedAt || null,
    },
    replyControl: comment?.reply_control
      ? {
          timeDesc: comment.reply_control.time_desc || "",
          location: comment.reply_control.location || "",
        }
      : null,
    raw: {
      state: comment?.state ?? null,
      attr: comment?.attr ?? null,
      assist: comment?.assist ?? null,
      rpid_str: comment?.rpid_str || null,
      root_str: comment?.root_str || null,
      parent_str: comment?.parent_str || null,
    },
    replies: suppliedReplies.map((reply) =>
      normalizeApiComment(reply, {
        level: "reply",
        sourceSection: "reply",
        sourcePage: options.replySourcePage || options.sourcePage || 0,
        sourceIndex: options.replySourceIndex || 0,
        sourceOrder: options.replySourceOrder || options.sourceOrder || "",
        apiMode: options.replyApiMode || null,
        fetchedAt: options.fetchedAt || null,
      })
    ),
  };
}

export function sortComments(comments, order = "default") {
  const normalizedOrder = COMMENT_ORDERS.has(order) ? order : "default";
  if (normalizedOrder === "default") return [...(comments || [])];

  return [...(comments || [])].sort((a, b) => {
    const left = toNumber(a?.ctime, 0);
    const right = toNumber(b?.ctime, 0);
    if (left !== right) return right - left;
    return 0;
  });
}

export function flattenComments(comments, options = {}) {
  const rows = [];
  for (const comment of comments || []) {
    const section = comment.source?.section || options.section || "normal";
    rows.push(toFlatRow(comment, "root", { section, path: [comment.id].filter(Boolean) }));
    for (const reply of comment.replies || []) {
      rows.push(toFlatRow(reply, "reply", {
        section: reply.source?.section || "reply",
        path: [comment.id, reply.id].filter(Boolean),
      }));
    }
  }
  return rows;
}

function toFlatRow(comment, level, context = {}) {
  return {
    section: context.section || comment.source?.section || (level === "reply" ? "reply" : "normal"),
    level,
    id: comment.id,
    rootId: comment.rootId || (level === "reply" ? comment.rootId : null),
    parentId: comment.parentId || null,
    path: context.path || [comment.id].filter(Boolean),
    author: comment.author,
    content: comment.content,
    metrics: comment.metrics,
    createdAt: comment.createdAt,
    ctime: comment.ctime,
    floor: comment.floor,
    source: comment.source,
  };
}

function normalizeAuthor(member, fallbackMid) {
  return {
    mid: toId(member?.mid || fallbackMid),
    name: member?.uname || member?.name || "",
    avatar: member?.avatar || "",
    level: toNumber(member?.level_info?.current_level, 0),
    officialType: toNumber(member?.official_verify?.type, -1),
    officialDesc: member?.official_verify?.desc || "",
    vipLabel: member?.vip?.label?.text || "",
  };
}

function normalizeContent(content) {
  const emote = content?.emote && typeof content.emote === "object" ? content.emote : {};
  const pictures = Array.isArray(content?.pictures) ? content.pictures : [];
  return {
    message: content?.message || "",
    platform: toNumber(content?.plat, 0),
    device: content?.device || "",
    emotes: Object.values(emote).map((item) => ({
      text: item?.text || "",
      url: item?.url || "",
      size: toNumber(item?.meta?.size, 0),
    })),
    pictures: pictures.map((item) => ({
      url: item?.img_src || item?.url || "",
      width: toNumber(item?.img_width || item?.width, 0),
      height: toNumber(item?.img_height || item?.height, 0),
    })),
  };
}

function toId(value) {
  if (value === undefined || value === null || value === "") return "";
  return String(value);
}

function toNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}
