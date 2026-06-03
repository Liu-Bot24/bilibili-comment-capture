import test from "node:test";
import assert from "node:assert/strict";

import { selectAiAnalysisTarget } from "../src/extension/sidepanel/analysis-target.js";

test("selectAiAnalysisTarget prefers the displayed capture result over a different active tab", () => {
  const target = selectAiAnalysisTarget({
    activeVideo: {
      bvid: "BVactive",
      url: "https://www.bilibili.com/video/BVactive/",
    },
    latestCaptureResult: {
      source: { pageUrl: "https://www.bilibili.com/video/BVcaptured/?p=2" },
      video: {
        bvid: "BVcaptured",
        url: "https://www.bilibili.com/video/BVcaptured/?p=2",
        page: { cid: 222, page: 2 },
      },
    },
  });

  assert.equal(target.bvid, "BVcaptured");
  assert.equal(target.url, "https://www.bilibili.com/video/BVcaptured/?p=2");
  assert.equal(target.video.page.cid, 222);
  assert.equal(target.video.page.page, 2);
});

test("selectAiAnalysisTarget falls back to the active video before any capture result exists", () => {
  const target = selectAiAnalysisTarget({
    activeVideo: {
      bvid: "BVactive",
      url: "https://www.bilibili.com/video/BVactive/",
    },
    latestCaptureResult: null,
  });

  assert.equal(target.bvid, "BVactive");
  assert.equal(target.url, "https://www.bilibili.com/video/BVactive/");
  assert.equal(target.video.bvid, "BVactive");
});
