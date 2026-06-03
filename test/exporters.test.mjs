import test from "node:test";
import assert from "node:assert/strict";
import { exportCaptureResult } from "../src/core/exporters.js";

const result = {
  schemaVersion: "bili-comment-capture/v1",
  generatedAt: "2026-05-24T06:30:00.000Z",
  video: {
    bvid: "BV1XadwBeEzP",
    aid: 116532411630335,
    title: "海绵强强",
    url: "https://www.bilibili.com/video/BV1XadwBeEzP/",
    owner: { mid: "7788", name: "海绵宝宝" },
  },
  source: {
    pageUrl: "https://www.bilibili.com/video/BV1XadwBeEzP/",
  },
  stats: { rootComments: 1, nestedReplies: 1, fetchedRootPages: 1, fetchedReplyPages: 1 },
  options: { rootOrder: "default", replyOrder: "default" },
  pinnedComments: [
    {
      id: "9999",
      author: { mid: "7788", name: "海绵宝宝" },
      content: { message: "置顶说明" },
      metrics: { like: 99, replyCount: 0 },
      source: { section: "pinned", page: 1, indexInPage: 0 },
      createdAt: "1970-01-01T00:01:40.000Z",
      replies: [],
    },
  ],
  comments: [
    {
      id: "1002",
      author: { mid: "202", name: "海绵宝宝" },
      content: { message: "直接评论" },
      metrics: { like: 30, replyCount: 1 },
      source: { section: "normal", page: 1, indexInPage: 0 },
      createdAt: "1970-01-01T00:03:20.000Z",
      replies: [
        {
          id: "2001",
          rootId: "1002",
          parentId: "1002",
          author: { mid: "301", name: "丙" },
          content: { message: "楼中楼回复" },
          metrics: { like: 9, replyCount: 0 },
          source: { section: "reply", page: 1, indexInPage: 0 },
          createdAt: "1970-01-01T00:02:30.000Z",
          replies: [],
        },
      ],
    },
  ],
};

test("exportCaptureResult writes hierarchical AI JSON", () => {
  const exported = exportCaptureResult(result, "json");
  const parsed = JSON.parse(exported.text);

  assert.equal(exported.mimeType, "application/json;charset=utf-8");
  assert.equal(parsed.format, "bilibili-comment-ai-analysis/v1");
  assert.equal(parsed.exportGuide.video.title, "海绵强强");
  assert.equal(parsed.exportGuide.video.ownerName, "海绵宝宝");
  assert.equal(parsed.exportGuide.video.bvid, "BV1XadwBeEzP");
  assert.equal("ownerId" in parsed.exportGuide.video, false);
  assert.equal("aid" in parsed.exportGuide.video, false);
  assert.equal("ownerId" in parsed.video, false);
  assert.equal("aid" in parsed.video, false);
  assert.match(parsed.exportGuide.terms.directComment, /第一层评论/);
  assert.match(parsed.exportGuide.terms.nestedReply, /楼中楼/);
  assert.match(parsed.exportGuide.fields.threadIndex, /threads 数组/);
  assert.match(parsed.exportGuide.fields.isVideoOwner, /UP 主本人/);
  assert.equal("authorId" in parsed.exportGuide.fields, false);
  assert.match(parsed.exportGuide.fields.likeCount, /当前这一条评论或回复本身/);
  assert.match(parsed.exportGuide.fields.replyCount, /直接评论下面/);
  assert.match(parsed.exportGuide.ordering.rootComments, /B 站默认顺序/);
  assert.match(parsed.exportGuide.ordering.nestedReplies, /B 站默认顺序/);
  assert.match(parsed.exportGuide.ordering.nestedReplies, /可见预览/);
  assert.match(parsed.exportGuide.ordering.nestedReplies, /展开列表/);
  assert.equal(parsed.video.bvid, "BV1XadwBeEzP");
  assert.equal(parsed.captureContext.sourceUrl, "https://www.bilibili.com/video/BV1XadwBeEzP/");
  assert.equal(parsed.summary.rootCommentCount, 1);
  assert.equal(parsed.threads[0].threadType, "pinned");
  assert.equal(parsed.threads[0].threadIndex, 0);
  assert.equal(parsed.threads[0].rootComment.level, "root");
  assert.equal(parsed.threads[0].rootComment.authorName, "海绵宝宝");
  assert.equal(parsed.threads[0].rootComment.isVideoOwner, true);
  assert.equal(parsed.threads[0].rootComment.authorRole, "video_owner");
  assert.equal(parsed.threads[0].rootComment.authorIdentityLabel, "【系统标记：该评论作者已通过用户 ID 匹配为视频 UP 主本人】");
  assert.equal("authorId" in parsed.threads[0].rootComment, false);
  assert.equal(parsed.threads[0].rootComment.text, "置顶说明");
  assert.equal(parsed.threads[1].rootComment.authorName, "海绵宝宝");
  assert.equal(parsed.threads[1].threadIndex, 1);
  assert.equal(parsed.threads[1].rootComment.isVideoOwner, false);
  assert.equal(parsed.threads[1].rootComment.authorRole, "viewer");
  assert.equal(parsed.threads[1].rootComment.authorIdentityLabel, "");
  assert.equal(parsed.threads[1].rootComment.replyCount, 1);
  assert.equal(parsed.threads[1].replies[0].level, "reply");
  assert.equal(parsed.threads[1].replies[0].authorName, "丙");
  assert.equal(parsed.threads[1].replies[0].isVideoOwner, false);
  assert.equal("authorId" in parsed.threads[1].replies[0], false);
  assert.equal(parsed.threads[1].replies[0].text, "楼中楼回复");
  assert.equal(parsed.threads[1].replies[0].rootCommentId, "1002");
  assert.equal(parsed.threads[1].replies[0].parentCommentId, "1002");
  assert.equal("pinnedComments" in parsed, false);
  assert.equal("comments" in parsed, false);
  assert.match(exported.filename, /^BV1XadwBeEzP-海绵强强-20260524-063000\.json$/);
});

test("exportCaptureResult writes flattened JSONL with parent linkage", () => {
  const exported = exportCaptureResult(result, "jsonl");
  const rows = exported.text.trim().split("\n").map((line) => JSON.parse(line));

  assert.equal(exported.mimeType, "application/x-ndjson;charset=utf-8");
  assert.equal(rows.length, 3);
  assert.equal(rows[0].section, "pinned");
  assert.deepEqual(rows[0].path, ["9999"]);
  assert.equal(rows[1].level, "root");
  assert.equal(rows[2].level, "reply");
  assert.equal(rows[2].rootId, "1002");
  assert.deepEqual(rows[2].path, ["1002", "2001"]);
});

test("exportCaptureResult writes readable Markdown hierarchy", () => {
  const exported = exportCaptureResult(result, "markdown");

  assert.equal(exported.mimeType, "text/markdown;charset=utf-8");
  assert.match(exported.text, /# 海绵强强/);
  assert.match(exported.text, /## 导出说明/);
  assert.match(exported.text, /视频标题：海绵强强/);
  assert.match(exported.text, /UP 主：海绵宝宝/);
  assert.doesNotMatch(exported.text, /UP 主：.*MID/);
  assert.doesNotMatch(exported.text, /AV 号/);
  assert.doesNotMatch(exported.text, /116532411630335/);
  assert.match(exported.text, /BV 号：BV1XadwBeEzP/);
  assert.match(exported.text, /直接评论：视频评论区第一层评论/);
  assert.match(exported.text, /楼中楼：直接评论下面的回复/);
  assert.match(exported.text, /评论顺序编号：/);
  assert.match(exported.text, /UP 主本人标记：/);
  assert.doesNotMatch(exported.text, /作者 ID/);
  assert.match(exported.text, /### 置顶评论 · 海绵宝宝【系统标记：该评论作者已通过用户 ID 匹配为视频 UP 主本人】/);
  assert.doesNotMatch(exported.text, /### 1\. 直接评论 · 海绵宝宝【系统标记：该评论作者已通过用户 ID 匹配为视频 UP 主本人】/);
  assert.doesNotMatch(exported.text, /（UP主本人）/);
  assert.match(exported.text, /点赞数：指当前这一条评论或回复本身收到的点赞数/);
  assert.match(exported.text, /主评论排序：B 站默认顺序/);
  assert.match(exported.text, /楼中楼排序：B 站默认顺序/);
  assert.match(exported.text, /可见预览/);
  assert.match(exported.text, /展开列表/);
  assert.doesNotMatch(exported.text, /## 评论正文\n\n## /);
  assert.match(exported.text, /置顶说明/);
  assert.match(exported.text, /直接评论/);
  assert.match(exported.text, /楼中楼回复/);
});

test("export guide describes nested reply latest mode as time descending", () => {
  const resultWithLatestReplies = {
    ...result,
    options: { ...result.options, rootOrder: "latest", replyOrder: "latest" },
  };

  const jsonExport = exportCaptureResult(resultWithLatestReplies, "json");
  const parsed = JSON.parse(jsonExport.text);
  const markdownExport = exportCaptureResult(resultWithLatestReplies, "markdown");

  assert.match(parsed.exportGuide.ordering.rootComments, /最新评论顺序/);
  assert.match(parsed.exportGuide.ordering.nestedReplies, /时间倒序/);
  assert.doesNotMatch(parsed.exportGuide.ordering.nestedReplies, /最新评论顺序/);
  assert.match(markdownExport.text, /主评论排序：最新评论顺序/);
  assert.match(markdownExport.text, /楼中楼排序：时间倒序/);
  assert.doesNotMatch(markdownExport.text, /楼中楼排序：最新评论顺序/);
});

test("exportCaptureResult uses source page URL when video metadata has no URL", () => {
  const exported = exportCaptureResult(
    {
      ...result,
      video: { ...result.video, url: "" },
    },
    "markdown"
  );

  assert.match(exported.text, /URL: https:\/\/www\.bilibili\.com\/video\/BV1XadwBeEzP\//);
});

test("exportCaptureResult rejects unsupported formats", () => {
  assert.throws(() => exportCaptureResult(result, "xlsx"), /Unsupported export format/);
});
