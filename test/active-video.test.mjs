import test from "node:test";
import assert from "node:assert/strict";

import { detectActiveVideoTab } from "../src/extension/sidepanel/active-video.js";

test("detectActiveVideoTab keeps the active tab id for page-backed comment capture", async () => {
  const events = [];
  const chromeApi = {
    tabs: {
      async query() {
        return [
          {
            id: 77,
            title: "测试视频_哔哩哔哩_bilibili",
            url: "https://www.bilibili.com/video/BV1abc123456/",
          },
        ];
      },
    },
  };

  await detectActiveVideoTab(chromeApi, {
    onLoading() {
      events.push({ type: "loading" });
    },
    onReady(video) {
      events.push({ type: "ready", video });
    },
    onMissing(title) {
      events.push({ type: "missing", title });
    },
  });

  assert.equal(events[0].type, "loading");
  assert.equal(events[1].type, "ready");
  assert.equal(events[1].video.tabId, 77);
  assert.equal(events[1].video.bvid, "BV1abc123456");
});

test("detectActiveVideoTab does not treat non-Bilibili URLs containing BV ids as capture targets", async () => {
  const events = [];
  let sentMessage = false;
  const chromeApi = {
    tabs: {
      async query() {
        return [
          {
            id: 88,
            title: "普通网页",
            url: "https://example.com/article/BV1abc123456",
          },
        ];
      },
      async sendMessage() {
        sentMessage = true;
        throw new Error("content script should not be queried on non-Bilibili pages");
      },
    },
  };

  await detectActiveVideoTab(chromeApi, {
    onLoading() {
      events.push({ type: "loading" });
    },
    onReady(video) {
      events.push({ type: "ready", video });
    },
    onMissing(title) {
      events.push({ type: "missing", title });
    },
  });

  assert.equal(sentMessage, false);
  assert.deepEqual(events.map((event) => event.type), ["loading", "missing"]);
  assert.equal(events[1].title, "普通网页");
});
