import test from "node:test";
import assert from "node:assert/strict";
import { extractBvid, getUrlPage, makeDownloadFilename, safeFilenamePart } from "../src/core/video.js";

test("extractBvid reads BV ids from common Bilibili video URLs", () => {
  assert.equal(
    extractBvid("https://www.bilibili.com/video/BV1XadwBeEzP/?spm_id_from=333.1007"),
    "BV1XadwBeEzP"
  );
  assert.equal(extractBvid("BV1XadwBeEzP"), "BV1XadwBeEzP");
});

test("extractBvid rejects non-BV input", () => {
  assert.equal(extractBvid("https://www.bilibili.com/list/watchlater"), "");
  assert.equal(extractBvid(""), "");
});

test("getUrlPage reads multi-part page numbers and falls back to first page", () => {
  assert.equal(getUrlPage("https://www.bilibili.com/video/BV1XadwBeEzP/?p=3"), 3);
  assert.equal(getUrlPage("https://www.bilibili.com/video/BV1XadwBeEzP/?page=2"), 2);
  assert.equal(getUrlPage("not a url"), 1);
});

test("safeFilenamePart keeps readable CJK text while removing filesystem hazards", () => {
  assert.equal(safeFilenamePart("海绵/强强:*?<>|  评论"), "海绵_强强_ 评论");
  assert.equal(safeFilenamePart("   ...   "), "bilibili-comments");
});

test("makeDownloadFilename includes bvid, title, timestamp, and extension", () => {
  const filename = makeDownloadFilename({
    bvid: "BV1XadwBeEzP",
    title: "海绵强强",
    generatedAt: "2026-05-24T06:30:00.000Z",
    extension: "jsonl",
  });
  assert.equal(filename, "BV1XadwBeEzP-海绵强强-20260524-063000.jsonl");
});

