import test from "node:test";
import assert from "node:assert/strict";
import { captureVideoComments } from "../src/core/capture.js";

class FakeClient {
  constructor() {
    this.rootPages = [];
    this.replyPages = [];
    this.topReply = null;
  }

  async fetchVideoView() {
    return {
      bvid: "BV1XadwBeEzP",
      aid: 42,
      title: "海绵强强",
      url: "https://www.bilibili.com/video/BV1XadwBeEzP/",
    };
  }

  async fetchMainComments() {
    return this.fetchMainCommentsWithOptions({});
  }

  async fetchMainCommentsWithOptions({ mode } = {}) {
    const page = this.rootPages.length + 1;
    this.rootPages.push(page);
    this.lastRootMode = mode;
    return {
      cursor: {
        is_end: page >= 3,
        pagination_reply: { next_offset: `page-${page + 1}` },
      },
      replies: Array.from({ length: 20 }, (_, index) => makeComment(page * 100 + index, { ctime: page * 100 + index })),
      topReplies: page === 1 && this.topReply ? [this.topReply] : [],
    };
  }

  async fetchNestedReplies({ pn }) {
    this.replyPages.push(pn);
    return {
      page: { count: 40, num: pn, size: 20 },
      replies: Array.from({ length: 20 }, (_, index) =>
        makeComment(pn * 1000 + index, { root: 100, parent: 100, ctime: pn * 1000 + index, like: index })
      ),
    };
  }
}

FakeClient.prototype.fetchMainComments = FakeClient.prototype.fetchMainCommentsWithOptions;

test("captureVideoComments keeps Bilibili default order and stops once the root limit is reached", async () => {
  const client = new FakeClient();
  const result = await captureVideoComments(
    {
      url: "https://www.bilibili.com/video/BV1XadwBeEzP/",
      options: {
        rootMaxPages: 3,
        rootMaxItems: 5,
        includeReplies: false,
      },
    },
    { client }
  );

  assert.deepEqual(client.rootPages, [1]);
  assert.equal(client.lastRootMode, 3);
  assert.equal(result.stats.fetchedRootPages, 1);
  assert.equal("fetchedRootBatches" in result.stats, false);
  assert.equal(result.comments.length, 5);
  assert.deepEqual(result.comments.map((comment) => comment.id), ["100", "101", "102", "103", "104"]);
});

test("captureVideoComments continues root pages until the root limit is reachable", async () => {
  const client = new FakeClient();
  const result = await captureVideoComments(
    {
      url: "https://www.bilibili.com/video/BV1XadwBeEzP/",
      options: {
        rootMaxPages: 3,
        rootMaxItems: 25,
        includeReplies: false,
      },
    },
    { client }
  );

  assert.deepEqual(client.rootPages, [1, 2]);
  assert.equal(result.stats.fetchedRootPages, 2);
  assert.equal(result.comments.length, 25);
  assert.deepEqual(result.comments.slice(0, 3).map((comment) => comment.id), ["100", "101", "102"]);
  assert.deepEqual(result.comments.slice(-3).map((comment) => comment.id), ["202", "203", "204"]);
});

test("captureVideoComments uses Bilibili latest mode only when latest is selected", async () => {
  const client = new FakeClient();
  const result = await captureVideoComments(
    {
      url: "https://www.bilibili.com/video/BV1XadwBeEzP/",
      options: {
        rootOrder: "latest",
        rootMaxPages: 1,
        rootMaxItems: 3,
        includeReplies: false,
      },
    },
    { client }
  );

  assert.equal(client.lastRootMode, 2);
  assert.deepEqual(result.comments.map((comment) => comment.id), ["119", "118", "117"]);
});

test("captureVideoComments stops default nested reply loading once the reply limit is reached", async () => {
  const client = new FakeClient();
  const result = await captureVideoComments(
    {
      url: "https://www.bilibili.com/video/BV1XadwBeEzP/",
      options: {
        rootMaxPages: 1,
        rootMaxItems: 1,
        includeReplies: true,
        replyMaxPagesPerRoot: 2,
        replyMaxItemsPerRoot: 5,
        replyOrder: "default",
      },
    },
    { client }
  );

  assert.deepEqual(client.replyPages, [1]);
  assert.equal(result.stats.fetchedReplyPages, 1);
  assert.equal(result.comments[0].replies.length, 5);
  assert.deepEqual(result.comments[0].replies.map((reply) => reply.id), ["1000", "1001", "1002", "1003", "1004"]);
});

test("captureVideoComments fetches requested nested pages before slicing time-desc replies", async () => {
  const client = new FakeClient();
  const result = await captureVideoComments(
    {
      url: "https://www.bilibili.com/video/BV1XadwBeEzP/",
      options: {
        rootMaxPages: 1,
        rootMaxItems: 1,
        includeReplies: true,
        replyMaxPagesPerRoot: 2,
        replyMaxItemsPerRoot: 5,
        replyOrder: "latest",
      },
    },
    { client }
  );

  assert.deepEqual(client.replyPages, [1, 2]);
  assert.equal(result.stats.fetchedReplyPages, 2);
  assert.equal(result.comments[0].replies.length, 5);
  assert.deepEqual(result.comments[0].replies.map((reply) => reply.id), ["2019", "2018", "2017", "2016", "2015"]);
});

test("captureVideoComments keeps visible nested reply previews before endpoint backfill for default replies", async () => {
  const client = new FakeClient();
  client.fetchMainCommentsWithOptions = async function fetchMainCommentsWithOptions({ mode } = {}) {
    this.rootPages.push(1);
    this.lastRootMode = mode;
    return {
      cursor: {
        is_end: true,
        pagination_reply: { next_offset: "" },
      },
      topReplies: [],
      replies: [
        makeComment(100, {
          count: 5,
          rcount: 5,
          ctime: 100,
          replies: [
            makeComment(501, { root: 100, parent: 100, ctime: 30 }),
            makeComment(401, { root: 100, parent: 100, ctime: 50 }),
          ],
        }),
      ],
    };
  };
  client.fetchMainComments = client.fetchMainCommentsWithOptions;
  client.fetchNestedReplies = async function fetchNestedReplies({ pn }) {
    this.replyPages.push(pn);
    return {
      page: { count: 5, num: pn, size: 20 },
      replies: [
        makeComment(401, { root: 100, parent: 100, ctime: 50 }),
        makeComment(501, { root: 100, parent: 100, ctime: 30 }),
        makeComment(301, { root: 100, parent: 100, ctime: 20 }),
        makeComment(201, { root: 100, parent: 100, ctime: 10 }),
        makeComment(101, { root: 100, parent: 100, ctime: 5 }),
      ],
    };
  };

  const result = await captureVideoComments(
    {
      url: "https://www.bilibili.com/video/BV1XadwBeEzP/",
      options: {
        rootMaxPages: 1,
        rootMaxItems: 1,
        includeReplies: true,
        replyMaxPagesPerRoot: 2,
        replyMaxItemsPerRoot: 5,
        replyOrder: "default",
      },
    },
    { client }
  );

  assert.deepEqual(client.replyPages, [1]);
  assert.deepEqual(result.comments[0].replies.map((reply) => reply.id), ["501", "401", "301", "201", "101"]);
});

test("captureVideoComments fetches nested replies to backfill short visible previews", async () => {
  const client = new FakeClient();
  client.fetchMainCommentsWithOptions = async function fetchMainCommentsWithOptions({ mode } = {}) {
    this.rootPages.push(1);
    this.lastRootMode = mode;
    return {
      cursor: {
        is_end: true,
        pagination_reply: { next_offset: "" },
      },
      topReplies: [],
      replies: [
        makeComment(100, {
          count: 10,
          rcount: 10,
          ctime: 100,
          replies: [
            makeComment(501, { root: 100, parent: 100, ctime: 50 }),
            makeComment(401, { root: 100, parent: 100, ctime: 40 }),
          ],
        }),
      ],
    };
  };
  client.fetchMainComments = client.fetchMainCommentsWithOptions;
  client.fetchNestedReplies = async function fetchNestedReplies({ pn }) {
    this.replyPages.push(pn);
    return {
      page: { count: 10, num: pn, size: 20 },
      replies: [
        makeComment(101, { root: 100, parent: 100, ctime: 10 }),
        makeComment(201, { root: 100, parent: 100, ctime: 20 }),
        makeComment(301, { root: 100, parent: 100, ctime: 30 }),
        makeComment(401, { root: 100, parent: 100, ctime: 40 }),
        makeComment(501, { root: 100, parent: 100, ctime: 50 }),
      ],
    };
  };

  const result = await captureVideoComments(
    {
      url: "https://www.bilibili.com/video/BV1XadwBeEzP/",
      options: {
        rootMaxPages: 1,
        rootMaxItems: 1,
        includeReplies: true,
        replyMaxPagesPerRoot: 1,
        replyMaxItemsPerRoot: 5,
        replyOrder: "default",
      },
    },
    { client }
  );

  assert.deepEqual(client.replyPages, [1]);
  assert.deepEqual(result.comments[0].replies.map((reply) => reply.id), ["501", "401", "101", "201", "301"]);
});

test("captureVideoComments continues nested reply pages until the reply limit is reachable", async () => {
  const client = new FakeClient();
  const result = await captureVideoComments(
    {
      url: "https://www.bilibili.com/video/BV1XadwBeEzP/",
      options: {
        rootMaxPages: 1,
        rootMaxItems: 1,
        includeReplies: true,
        replyMaxPagesPerRoot: 2,
        replyMaxItemsPerRoot: 25,
        replyOrder: "latest",
      },
    },
    { client }
  );

  assert.deepEqual(client.replyPages, [1, 2]);
  assert.equal(result.stats.fetchedReplyPages, 2);
  assert.equal(result.comments[0].replies.length, 25);
  assert.deepEqual(result.comments[0].replies.slice(0, 3).map((reply) => reply.id), ["2019", "2018", "2017"]);
  assert.deepEqual(result.comments[0].replies.slice(-3).map((reply) => reply.id), ["1017", "1016", "1015"]);
});

test("captureVideoComments can load root comments to the end when the comment limit is unlimited", async () => {
  const client = new FakeClient();
  const result = await captureVideoComments(
    {
      url: "https://www.bilibili.com/video/BV1XadwBeEzP/",
      options: {
        rootMaxPages: "all",
        rootMaxItems: "all",
        includeReplies: false,
      },
    },
    { client }
  );

  assert.deepEqual(client.rootPages, [1, 2, 3]);
  assert.equal(result.stats.fetchedRootPages, 3);
  assert.equal(result.comments.length, 60);
});

test("captureVideoComments can load nested replies to the end when the reply limit is unlimited", async () => {
  const client = new FakeClient();
  const result = await captureVideoComments(
    {
      url: "https://www.bilibili.com/video/BV1XadwBeEzP/",
      options: {
        rootMaxPages: 1,
        rootMaxItems: 1,
        includeReplies: true,
        replyMaxPagesPerRoot: "all",
        replyMaxItemsPerRoot: "all",
        replyOrder: "latest",
      },
    },
    { client }
  );

  assert.deepEqual(client.replyPages, [1, 2]);
  assert.equal(result.stats.fetchedReplyPages, 2);
  assert.equal(result.comments[0].replies.length, 40);
});

test("captureVideoComments preserves pinned top-level comments outside the normal candidate slice", async () => {
  const client = new FakeClient();
  client.topReply = makeComment(9999, { ctime: 9999, like: 9999 });
  const result = await captureVideoComments(
    {
      url: "https://www.bilibili.com/video/BV1XadwBeEzP/",
      options: {
        rootMaxPages: 1,
        rootMaxItems: 1,
        includeReplies: false,
      },
    },
    { client }
  );

  assert.equal(result.pinnedComments.length, 1);
  assert.equal(result.pinnedComments[0].id, "9999");
  assert.equal(result.pinnedComments[0].source.section, "pinned");
  assert.equal(result.comments.length, 1);
  assert.notEqual(result.comments[0].id, "9999");
});

test("captureVideoComments dedupes normal root comments and does not count pinned duplicates toward the normal limit", async () => {
  const client = new FakeClient();
  client.topReply = makeComment(100, { ctime: 1000, like: 1000 });
  client.fetchMainCommentsWithOptions = async function fetchMainCommentsWithOptions({ mode } = {}) {
    const page = this.rootPages.length + 1;
    this.rootPages.push(page);
    this.lastRootMode = mode;
    return {
      cursor: {
        is_end: page >= 2,
        pagination_reply: { next_offset: page >= 2 ? "" : "page-2" },
      },
      topReplies: page === 1 ? [this.topReply] : [],
      replies:
        page === 1
          ? [makeComment(100), makeComment(101), makeComment(101)]
          : [makeComment(102), makeComment(103)],
    };
  };
  client.fetchMainComments = client.fetchMainCommentsWithOptions;

  const result = await captureVideoComments(
    {
      url: "https://www.bilibili.com/video/BV1XadwBeEzP/",
      options: {
        rootMaxPages: 3,
        rootMaxItems: 3,
        includeReplies: false,
      },
    },
    { client }
  );

  assert.deepEqual(client.rootPages, [1, 2]);
  assert.deepEqual(result.comments.map((comment) => comment.id), ["101", "102", "103"]);
});

test("captureVideoComments stops when the root cursor repeats while loading without finite limits", async () => {
  const client = new FakeClient();
  client.fetchMainCommentsWithOptions = async function fetchMainCommentsWithOptions({ mode } = {}) {
    const page = this.rootPages.length + 1;
    this.rootPages.push(page);
    this.lastRootMode = mode;
    return {
      cursor: {
        is_end: false,
        pagination_reply: { next_offset: "same-offset" },
      },
      topReplies: [],
      replies: [makeComment(100 + page)],
    };
  };
  client.fetchMainComments = client.fetchMainCommentsWithOptions;

  const result = await captureVideoComments(
    {
      url: "https://www.bilibili.com/video/BV1XadwBeEzP/",
      options: {
        rootMaxPages: "all",
        rootMaxItems: "all",
        includeReplies: false,
      },
    },
    { client }
  );

  assert.deepEqual(client.rootPages, [1, 2]);
  assert.equal(result.stats.reachedRootEnd, true);
});

function makeComment(id, overrides = {}) {
  return {
    rpid: id,
    rpid_str: String(id),
    oid: 42,
    type: 1,
    mid: id + 1000,
    root: overrides.root || 0,
    parent: overrides.parent || 0,
    dialog: 0,
    count: overrides.count ?? (overrides.root ? 0 : 40),
    rcount: overrides.rcount ?? (overrides.root ? 0 : 40),
    ctime: overrides.ctime || id,
    like: overrides.like ?? id,
    member: { mid: String(id + 1000), uname: `用户${id}` },
    content: { message: `评论 ${id}` },
    replies: overrides.replies || [],
  };
}
