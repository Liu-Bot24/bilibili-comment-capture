import assert from "node:assert/strict";
import { test } from "node:test";

import { BilibiliClient } from "../src/core/bilibili-client.js";

test("BilibiliClient binds the default global fetch implementation", async () => {
  const originalFetch = globalThis.fetch;
  const calls = [];

  globalThis.fetch = async function fetchWithReceiverCheck(input, init) {
    assert.equal(this, globalThis);
    calls.push({ input, init });
    return new Response(JSON.stringify({ code: 0, data: { ok: true } }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  };

  try {
    const client = new BilibiliClient();
    const payload = await client.fetchJson("/x/test", {
      params: { b: "two", a: 1 },
    });

    assert.deepEqual(payload, { code: 0, data: { ok: true } });
    assert.equal(calls.length, 1);
    assert.equal(calls[0].input, "https://api.bilibili.com/x/test?b=two&a=1");
    assert.equal(calls[0].init.method, "GET");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("fetchVideoView parses BV metadata and selects the requested page", async () => {
  const client = new BilibiliClient({
    async fetchImpl() {
      return jsonResponse({
        code: 0,
        data: {
          aid: 42,
          title: "分 P 视频",
          desc: "简介",
          owner: { mid: 88, name: "UP主", face: "avatar.png" },
          pages: [
            { cid: 1001, page: 1, part: "P1", duration: 60 },
            { cid: 1002, page: 2, part: "P2", duration: 90 },
          ],
        },
      });
    },
  });

  const video = await client.fetchVideoView({ url: "https://www.bilibili.com/video/BV1abc123456/?p=2" });

  assert.equal(video.bvid, "BV1abc123456");
  assert.equal(video.aid, 42);
  assert.equal(video.owner.mid, "88");
  assert.deepEqual(video.page, { cid: 1002, page: 2, part: "P2", duration: 90 });
});

test("fetchMainComments signs WBI requests and rejects voucher-protected comment pages", async () => {
  const calls = [];
  const client = new BilibiliClient({
    async fetchImpl(input) {
      calls.push(input);
      const url = new URL(input);
      if (url.pathname === "/x/web-interface/nav") {
        return jsonResponse({
          code: 0,
          data: {
            wbi_img: {
              img_url: "https://i0.hdslb.com/bfs/wbi/7cd084941338484aae1ad9425b84077c.png",
              sub_url: "https://i0.hdslb.com/bfs/wbi/4932caff0ff746eab6f01bf08b70ac45.png",
            },
          },
        });
      }
      assert.equal(url.pathname, "/x/v2/reply/wbi/main");
      assert.equal(url.searchParams.get("oid"), "42");
      assert.equal(url.searchParams.get("mode"), "3");
      assert.ok(url.searchParams.get("w_rid"));
      return jsonResponse({ code: 0, data: { v_voucher: "need-verify" } });
    },
  });

  await assert.rejects(() => client.fetchMainComments({ oid: 42, mode: 3 }), {
    code: "BILIBILI_VOUCHER_REQUIRED",
  });
  assert.equal(calls.length, 2);
});

test("fetchNestedReplies normalizes page size and response arrays", async () => {
  const client = new BilibiliClient({
    async fetchImpl(input) {
      const url = new URL(input);
      assert.equal(url.pathname, "/x/v2/reply/reply");
      assert.equal(url.searchParams.get("ps"), "20");
      assert.equal(url.searchParams.get("pn"), "2");
      return jsonResponse({
        code: 0,
        data: {
          page: { count: 1 },
          replies: [{ rpid: 1 }],
        },
      });
    },
  });

  const page = await client.fetchNestedReplies({ oid: 42, root: 100, ps: 500, pn: 2 });

  assert.deepEqual(page.page, { count: 1 });
  assert.deepEqual(page.replies, [{ rpid: 1 }]);
});

test("fetchJson surfaces HTTP and invalid JSON failures", async () => {
  const httpClient = new BilibiliClient({
    async fetchImpl() {
      return new Response("nope", { status: 503 });
    },
  });
  await assert.rejects(() => httpClient.fetchJson("/x/test"), { code: "HTTP_ERROR", status: 503 });

  const jsonClient = new BilibiliClient({
    async fetchImpl() {
      return new Response("not-json", { status: 200 });
    },
  });
  await assert.rejects(() => jsonClient.fetchJson("/x/test"), { code: "INVALID_JSON", status: 200 });
});

function jsonResponse(payload) {
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}
