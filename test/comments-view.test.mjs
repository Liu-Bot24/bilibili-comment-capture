import test from "node:test";
import assert from "node:assert/strict";
import { filterCommentThreads, formatCopyText } from "../src/extension/sidepanel/comments-view.js";

const threads = [
  {
    label: "#1",
    comment: {
      author: { name: "甲" },
      content: { message: "今天风很大" },
      replies: [{ author: { name: "乙" }, content: { message: "确实如此" } }],
    },
  },
  {
    label: "#2",
    comment: {
      author: { name: "丙" },
      content: { message: "完全不同的话题" },
      replies: [{ author: { name: "丁" }, content: { message: "楼中楼命中词" } }],
    },
  },
];

test("filterCommentThreads keeps all threads when query is blank", () => {
  assert.deepEqual(filterCommentThreads(threads, "  "), threads);
});

test("filterCommentThreads matches root comments and nested replies", () => {
  assert.deepEqual(filterCommentThreads(threads, "风很大").map((thread) => thread.label), ["#1"]);
  assert.deepEqual(filterCommentThreads(threads, "楼中楼命中").map((thread) => thread.label), ["#2"]);
});

test("filterCommentThreads searches author names without treating a miss as a match", () => {
  assert.deepEqual(filterCommentThreads(threads, "乙").map((thread) => thread.label), ["#1"]);
  assert.deepEqual(filterCommentThreads(threads, "不存在").map((thread) => thread.label), []);
});

test("formatCopyText uses the structured Markdown export instead of lossy plain text", () => {
  const text = formatCopyText({
    schemaVersion: "bili-comment-capture/v1",
    generatedAt: "2026-06-04T00:00:00.000Z",
    video: {
      bvid: "BV1copy",
      title: "复制测试",
      url: "https://www.bilibili.com/video/BV1copy/",
      owner: { mid: "88", name: "UP主" },
    },
    source: { pageUrl: "https://www.bilibili.com/video/BV1copy/" },
    options: { rootOrder: "default", replyOrder: "default" },
    stats: { rootComments: 1, nestedReplies: 1, pinnedComments: 0 },
    pinnedComments: [],
    comments: [
      {
        id: "100",
        author: { mid: "88", name: "UP主" },
        content: { message: "主评论内容" },
        metrics: { like: 3, replyCount: 1 },
        replies: [
          {
            id: "101",
            rootId: "100",
            parentId: "100",
            author: { mid: "99", name: "观众" },
            content: { message: "楼中楼内容" },
            metrics: { like: 1, replyCount: 0 },
          },
        ],
      },
    ],
  });

  assert.match(text, /## 导出说明/);
  assert.match(text, /结构规则/);
  assert.match(text, /评论 ID：100/);
  assert.match(text, /所属直接评论 ID：100/);
  assert.match(text, /UP 主本人标记/);
  assert.match(text, /【系统标记：该评论作者已通过用户 ID 匹配为视频 UP 主本人】/);
});
