import test from "node:test";
import assert from "node:assert/strict";
import { buildSiteResultUrl } from "../src/core/site-link.js";

test("buildSiteResultUrl opens danmu result page for comment analysis", () => {
  const url = new URL(
    buildSiteResultUrl({
      bvid: "BV1HnVV6VEva",
      cid: 123456,
      page: 2,
    })
  );

  assert.equal(url.origin, "https://danmu.liu-qi.cn");
  assert.equal(url.pathname, "/result");
  assert.equal(url.searchParams.get("bvid"), "BV1HnVV6VEva");
  assert.equal(url.searchParams.get("cid"), "123456");
  assert.equal(url.searchParams.get("p"), "2");
  assert.equal(url.searchParams.get("source"), "bilibili-comment-capture");
  assert.equal(url.searchParams.get("analysis"), "comments");
});

test("buildSiteResultUrl can extract BV id from a Bilibili URL", () => {
  const url = new URL(
    buildSiteResultUrl({
      url: "https://www.bilibili.com/video/BV1HnVV6VEva/?p=3",
    })
  );

  assert.equal(url.searchParams.get("bvid"), "BV1HnVV6VEva");
  assert.equal(url.searchParams.get("p"), "3");
});

test("buildSiteResultUrl can use captured video page metadata", () => {
  const url = new URL(
    buildSiteResultUrl({
      video: {
        bvid: "BV1CaptureMeta",
        page: { cid: 876543, page: 4 },
      },
    })
  );

  assert.equal(url.searchParams.get("bvid"), "BV1CaptureMeta");
  assert.equal(url.searchParams.get("cid"), "876543");
  assert.equal(url.searchParams.get("p"), "4");
});
