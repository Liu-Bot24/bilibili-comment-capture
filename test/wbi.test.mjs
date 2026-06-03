import test from "node:test";
import assert from "node:assert/strict";
import { extractWbiKeyFromUrl, getMixinKey, signWbiParams } from "../src/core/wbi.js";

test("extractWbiKeyFromUrl extracts the disguised key from Bilibili WBI image URLs", () => {
  assert.equal(
    extractWbiKeyFromUrl("https://i0.hdslb.com/bfs/wbi/7cd084941338484aae1ad9425b84077c.png"),
    "7cd084941338484aae1ad9425b84077c"
  );
});

test("getMixinKey follows the documented Bilibili WBI permutation", () => {
  const mixinKey = getMixinKey(
    "7cd084941338484aae1ad9425b84077c",
    "4932caff0ff746eab6f01bf08b70ac45"
  );
  assert.equal(mixinKey, "ea1db124af3c7062474693fa704f4ff8");
});

test("signWbiParams sorts and encodes params before adding w_rid", () => {
  const signed = signWbiParams(
    {
      foo: "one one four",
      bar: "五一四",
      baz: 1919810,
    },
    "ea1db124af3c7062474693fa704f4ff8",
    { wts: 1702204169 }
  );

  assert.equal(
    signed.query,
    "bar=%E4%BA%94%E4%B8%80%E5%9B%9B&baz=1919810&foo=one%20one%20four&wts=1702204169&w_rid=04e50b58980e3e3cee8cbc0cc4c1c530"
  );
  assert.equal(signed.params.w_rid, "04e50b58980e3e3cee8cbc0cc4c1c530");
});

test("signWbiParams omits empty values and strips characters Bilibili ignores", () => {
  const signed = signWbiParams(
    {
      keep: "A!*()'",
      empty: "",
      nil: null,
    },
    "ea1db124af3c7062474693fa704f4ff8",
    { wts: 1702204169 }
  );

  assert.match(signed.query, /^keep=A&wts=1702204169&w_rid=/);
  assert.equal(Object.hasOwn(signed.params, "empty"), false);
  assert.equal(Object.hasOwn(signed.params, "nil"), false);
});

