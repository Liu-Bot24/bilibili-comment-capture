import test from "node:test";
import assert from "node:assert/strict";
import { normalizeCaptureOptions } from "../src/core/capture.js";

test("normalizeCaptureOptions defaults to the user's sample workflow", () => {
  const options = normalizeCaptureOptions({});

  assert.equal(options.rootOrder, "default");
  assert.equal(options.rootMaxPages, 20);
  assert.equal(options.rootMaxItems, 100);
  assert.equal(options.includeReplies, true);
  assert.equal(options.replyOrder, "default");
  assert.equal(options.replyMaxItemsPerRoot, 5);
});

test("normalizeCaptureOptions supports all-pages and all-items independently", () => {
  const options = normalizeCaptureOptions({
    rootMaxPages: "all",
    rootMaxItems: "all",
    replyMaxPagesPerRoot: "all",
    replyMaxItemsPerRoot: "all",
  });

  assert.equal(options.rootMaxPages, Infinity);
  assert.equal(options.rootMaxItems, Infinity);
  assert.equal(options.replyMaxPagesPerRoot, Infinity);
  assert.equal(options.replyMaxItemsPerRoot, Infinity);
});

test("normalizeCaptureOptions clamps invalid numeric values to stable bounds", () => {
  const options = normalizeCaptureOptions({
    rootMaxPages: -10,
    rootMaxItems: 0,
    replyMaxPagesPerRoot: 9999,
    replyMaxItemsPerRoot: -1,
    requestDelayMs: -50,
  });

  assert.equal(options.rootMaxPages, 1);
  assert.equal(options.rootMaxItems, 1);
  assert.equal(options.replyMaxPagesPerRoot, 500);
  assert.equal(options.replyMaxItemsPerRoot, 0);
  assert.equal(options.requestDelayMs, 0);
});

test("normalizeCaptureOptions falls back from unknown ordering to documented defaults", () => {
  const options = normalizeCaptureOptions({
    rootOrder: "random",
    replyOrder: "thread_magic",
  });

  assert.equal(options.rootOrder, "default");
  assert.equal(options.replyOrder, "default");
});
