import test from "node:test";
import assert from "node:assert/strict";
import { normalizeApiComment, sortComments } from "../src/core/model.js";

const rootA = {
  rpid: 1001,
  rpid_str: "1001",
  oid: 42,
  type: 1,
  mid: 201,
  root: 0,
  parent: 0,
  dialog: 0,
  count: 2,
  rcount: 2,
  floor: 8,
  ctime: 100,
  like: 4,
  member: { mid: "201", uname: "甲", level_info: { current_level: 5 }, official_verify: { type: -1 } },
  content: { message: "较早但点赞少", emote: { "[doge]": { text: "[doge]", url: "https://example.com/doge.png" } } },
  reply_control: { time_desc: "很久以前发布" },
};

const rootB = {
  rpid: 1002,
  rpid_str: "1002",
  oid: 42,
  type: 1,
  mid: 202,
  root: 0,
  parent: 0,
  dialog: 0,
  count: 1,
  rcount: 1,
  floor: 9,
  ctime: 200,
  like: 30,
  member: { mid: "202", uname: "乙" },
  content: { message: "较新且点赞多" },
  reply_control: { time_desc: "刚刚发布" },
};

const child = {
  rpid: 2001,
  rpid_str: "2001",
  oid: 42,
  type: 1,
  mid: 301,
  root: 1002,
  parent: 1002,
  dialog: 2001,
  count: 0,
  rcount: 0,
  ctime: 150,
  like: 9,
  member: { mid: "301", uname: "丙" },
  content: { message: "楼中楼回复" },
};

test("normalizeApiComment preserves hierarchy and AI-useful metadata", () => {
  const normalized = normalizeApiComment(rootB, { replies: [child], level: "root", sourcePage: 1 });

  assert.equal(normalized.id, "1002");
  assert.equal(normalized.author.name, "乙");
  assert.equal(normalized.metrics.like, 30);
  assert.equal(normalized.content.message, "较新且点赞多");
  assert.equal(normalized.replies[0].id, "2001");
  assert.equal(normalized.replies[0].rootId, "1002");
  assert.equal(normalized.replies[0].parentId, "1002");
  assert.equal("batch" in normalized.source, false);
});

test("sortComments preserves Bilibili default order or switches to latest without mutating input", () => {
  const input = [normalizeApiComment(rootA), normalizeApiComment(rootB)];

  assert.deepEqual(sortComments(input, "default").map((item) => item.id), ["1001", "1002"]);
  assert.deepEqual(sortComments(input, "latest").map((item) => item.id), ["1002", "1001"]);
  assert.deepEqual(input.map((item) => item.id), ["1001", "1002"]);
});

test("sortComments falls back to Bilibili default order for unknown order values", () => {
  const input = [normalizeApiComment(rootA), normalizeApiComment(rootB)];
  assert.deepEqual(sortComments(input, "unsupported").map((item) => item.id), ["1001", "1002"]);
});

test("sortComments keeps Bilibili stable order for comments published in the same second", () => {
  const sameTimeA = normalizeApiComment({ ...rootA, rpid: 3002, rpid_str: "3002", ctime: 300 });
  const sameTimeB = normalizeApiComment({ ...rootB, rpid: 3001, rpid_str: "3001", ctime: 300 });

  assert.deepEqual(sortComments([sameTimeA, sameTimeB], "latest").map((item) => item.id), ["3002", "3001"]);
});
