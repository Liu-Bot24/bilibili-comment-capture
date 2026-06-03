import test from "node:test";
import assert from "node:assert/strict";

import { createPageCommentClient } from "../src/extension/page-comment-client.js";

test("page comment client fetches root comments through the Bilibili page component", async () => {
  const calls = [];
  const fallback = makeFallbackClient();
  const chromeApi = {
    scripting: {
      async executeScript(call) {
        calls.push(call);
        const pageResult = await runInjectedFunctionInFakePage(call.func, call.args[0], {
          comments: [
            makeComment(100, "置顶作者", { isTop: true }),
            makeComment(101, "页面第一条"),
            makeComment(102, "页面第二条"),
          ],
          nextOffset: "page-2",
        });
        return [
          {
            result: pageResult,
          },
        ];
      },
    },
  };

  const client = createPageCommentClient({ chromeApi, tabId: 88, fallbackClient: fallback });
  const page = await client.fetchMainComments({ oid: 42, mode: 3, offset: "" });

  assert.equal(fallback.mainCalls.length, 0);
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0].target, { tabId: 88 });
  assert.equal(calls[0].world, "MAIN");
  assert.deepEqual(calls[0].args[0], { oid: 42, type: 1, mode: 3, offset: "", seekRpid: "" });
  assert.deepEqual(page.topReplies.map((comment) => comment.rpid_str), ["100"]);
  assert.deepEqual(page.replies.map((comment) => comment.rpid_str), ["101", "102"]);
  assert.equal(page.cursor.pagination_reply.next_offset, "page-2");
});

test("page comment client inherits the active page comment seek target", async () => {
  const fallback = makeFallbackClient();
  const chromeApi = {
    scripting: {
      async executeScript(call) {
        const pageResult = await runInjectedFunctionInFakePage(call.func, call.args[0], {
          comments: [
            makeComment(304152465680, "页面定位评论"),
            makeComment(304148908272, "普通热评"),
          ],
          nextOffset: "page-2",
          liveElement: { seekRpid: "304152465680" },
          onCreated(element) {
            assert.equal(element.seekRpid, "304152465680");
          },
        });
        return [{ result: pageResult }];
      },
    },
  };

  const client = createPageCommentClient({ chromeApi, tabId: 88, fallbackClient: fallback });
  const page = await client.fetchMainComments({ oid: 42, mode: 3, offset: "" });

  assert.equal(fallback.mainCalls.length, 0);
  assert.deepEqual(page.replies.map((comment) => comment.rpid_str), ["304152465680", "304148908272"]);
});

test("page comment client reads the existing page component order before creating a hidden component", async () => {
  const fallback = makeFallbackClient();
  const pageEnv = {
    comments: [makeComment(999, "隐藏组件顺序")],
    nextOffset: "hidden-next",
    liveElement: {
      oid: "42",
      type: 1,
      mode: 3,
      paginationStr: JSON.stringify({ offset: "page-2" }),
      showEnd: false,
      count: 2,
      list: [makeComment(301286509361, "页面第一条"), makeComment(301305219889, "页面第二条")],
      getAttribute(name) {
        if (name === "data-params") return "1,42";
        if (name === "mode") return "3";
        return "";
      },
    },
  };
  const chromeApi = {
    scripting: {
      async executeScript(call) {
        const pageResult = await runInjectedFunctionInFakePage(call.func, call.args[0], pageEnv);
        return [{ result: pageResult }];
      },
    },
  };

  const client = createPageCommentClient({ chromeApi, tabId: 88, fallbackClient: fallback });
  const page = await client.fetchMainComments({ oid: 42, mode: 3, offset: "" });

  assert.equal(fallback.mainCalls.length, 0);
  assert.equal(pageEnv.createdElement, undefined);
  assert.deepEqual(page.replies.map((comment) => comment.rpid_str), ["301286509361", "301305219889"]);
  assert.equal(page.cursor.pagination_reply.next_offset, "page-2");
});

test("page comment client advances the existing page component and returns only newly appended comments", async () => {
  const fallback = makeFallbackClient();
  const liveElement = {
    oid: "42",
    type: 1,
    mode: 3,
    paginationStr: JSON.stringify({ offset: "page-2" }),
    showEnd: false,
    count: 3,
    list: [makeComment(101, "已经加载")],
    getAttribute(name) {
      if (name === "data-params") return "1,42";
      if (name === "mode") return "3";
      return "";
    },
    async getList() {
      this.list = [...this.list, makeComment(201, "新增第一条"), makeComment(202, "新增第二条")];
      this.paginationStr = JSON.stringify({ offset: "page-3" });
    },
  };
  const pageEnv = {
    comments: [makeComment(999, "隐藏组件顺序")],
    nextOffset: "hidden-next",
    liveElement,
  };
  const chromeApi = {
    scripting: {
      async executeScript(call) {
        const pageResult = await runInjectedFunctionInFakePage(call.func, call.args[0], pageEnv);
        return [{ result: pageResult }];
      },
    },
  };

  const client = createPageCommentClient({ chromeApi, tabId: 88, fallbackClient: fallback });
  const page = await client.fetchMainComments({ oid: 42, mode: 3, offset: "page-2" });

  assert.equal(fallback.mainCalls.length, 0);
  assert.equal(pageEnv.createdElement, undefined);
  assert.deepEqual(page.replies.map((comment) => comment.rpid_str), ["201", "202"]);
  assert.equal(page.cursor.pagination_reply.next_offset, "page-3");
});

test("page comment client falls back only when no tab id is available", async () => {
  const fallback = makeFallbackClient();
  const chromeApi = {
    scripting: {
      async executeScript() {
        throw new Error("should not be called without tab id");
      },
    },
  };

  const client = createPageCommentClient({ chromeApi, tabId: null, fallbackClient: fallback });
  const page = await client.fetchMainComments({ oid: 42, mode: 2, offset: "next" });

  assert.deepEqual(fallback.mainCalls, [{ oid: 42, mode: 2, offset: "next" }]);
  assert.deepEqual(page.replies.map((comment) => comment.rpid_str), ["900"]);
});

test("page comment client reports page bridge failures instead of silently using a different order", async () => {
  const fallback = makeFallbackClient();
  const chromeApi = {
    scripting: {
      async executeScript() {
        return [{ result: { ok: false, message: "bili-comments component is not ready" } }];
      },
    },
  };

  const client = createPageCommentClient({ chromeApi, tabId: 88, fallbackClient: fallback });

  await assert.rejects(
    () => client.fetchMainComments({ oid: 42, mode: 3, offset: "" }),
    /无法读取当前页面的评论顺序/
  );
  assert.equal(fallback.mainCalls.length, 0);
});

function makeFallbackClient() {
  return {
    mainCalls: [],
    async fetchVideoView(options) {
      return { bvid: options.bvid || "BV1", aid: 42, title: "测试视频" };
    },
    async fetchNestedReplies() {
      return { page: { count: 0 }, root: null, replies: [] };
    },
    async fetchMainComments(options) {
      this.mainCalls.push(options);
      return {
        cursor: { is_end: true, pagination_reply: { next_offset: "" } },
        topReplies: [],
        replies: [makeComment(900, "备用接口")],
        hots: [],
        config: null,
        control: null,
      };
    },
  };
}

function makeComment(id, name, options = {}) {
  return {
    rpid: id,
    rpid_str: String(id),
    oid: 42,
    type: 1,
    root: 0,
    parent: 0,
    ctime: id,
    like: 0,
    count: 0,
    rcount: 0,
    member: { mid: String(id + 1000), uname: name },
    content: { message: `${name}内容` },
    reply_control: options.isTop ? { is_up_top: true } : {},
  };
}

async function runInjectedFunctionInFakePage(func, args, result) {
  const originalDocument = globalThis.document;
  const originalCustomElements = globalThis.customElements;
  const injected = (0, eval)(`(${func.toString()})`);

  class FakeBiliComments {
    constructor() {
      this.style = { cssText: "" };
      this.paginationStr = "";
      this.showEnd = false;
      this.count = 0;
      this.list = [];
    }

    async getList() {
      this.list = result.comments;
      this.paginationStr = JSON.stringify({ offset: result.nextOffset });
      this.count = result.comments.length;
    }

    remove() {}
  }

  globalThis.document = {
    querySelector(selector) {
      assert.equal(selector, "bili-comments");
      return result.liveElement || null;
    },
    createElement(tagName) {
      assert.equal(tagName, "bili-comments");
      const element = new FakeBiliComments();
      result.createdElement = element;
      return element;
    },
    documentElement: {
      appendChild() {},
    },
  };
  globalThis.customElements = {
    get(tagName) {
      assert.equal(tagName, "bili-comments");
      return FakeBiliComments;
    },
    whenDefined() {
      return Promise.resolve();
    },
  };

  try {
    const output = await injected(args);
    if (typeof result.onCreated === "function") result.onCreated(result.createdElement);
    return output;
  } finally {
    globalThis.document = originalDocument;
    globalThis.customElements = originalCustomElements;
  }
}
