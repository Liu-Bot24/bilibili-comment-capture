import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const visibleTextFiles = [
  "manifest.json",
  "README.md",
  "README.en.md",
  "sidepanel/sidepanel.html",
  "PRIVACY.md",
];

test("user-facing copy has no old English Lens brand", () => {
  for (const file of visibleTextFiles) {
    const text = readText(file);
    assert.doesNotMatch(text, /Bili Comment Lens|Comment Lens|\bLens\b|B站评论抓取器/, file);
  }
});

test("user-facing copy does not expose rejected comment sorting and batch terms", () => {
  for (const file of visibleTextFiles) {
    const text = readText(file);
    assert.doesNotMatch(text, /最热|最早|最少|批次|全部批次|全部条|每楼取/, file);
  }
});

test("README does not describe npm as an extension installation method", () => {
  for (const file of ["README.md", "README.en.md"]) {
    const text = readText(file);
    assert.doesNotMatch(text, /npm\s+(install|i)\b/i, file);
    assert.doesNotMatch(text, /npm .*安装.*插件/i, file);
  }
});

test("README keeps the companion site context and Chrome Web Store install flow", () => {
  const zh = readText("README.md");
  const en = readText("README.en.md");

  assert.match(zh, /danmu\.liu-qi\.cn/);
  assert.match(zh, /也可以配合弹幕分析网站/);
  assert.match(zh, /单独作为评论导出工具使用/);
  assert.match(zh, /一键跳到 AI 深度分析页/);
  assert.match(zh, /从 Chrome Web Store 安装/);
  assert.match(zh, /chromewebstore\.google\.com\/detail\/bilibili-comment-helper-c\/emfgghgdlmihojemgbgljgibiagiohdj/);
  assert.match(zh, /从源码加载/);
  assert.equal((zh.match(/加载已解压的扩展程序/g) || []).length, 1);
  assert.doesNotMatch(zh, /也属于/);
  assert.doesNotMatch(zh, /Release ZIP|版本号|两者在 Chrome/);
  assert.doesNotMatch(zh, /多分 P|分 P 信息/);
  assert.doesNotMatch(zh, /当前版本|尚未|未正式|未发布|还没有|正在建设|临时使用|暂不|没做完|未完成/);

  assert.match(en, /danmu\.liu-qi\.cn/);
  assert.match(en, /also works with the danmaku analysis site/i);
  assert.match(en, /on its own as a comment export tool/i);
  assert.match(en, /AI deep analysis page/i);
  assert.match(en, /Install From Chrome Web Store/i);
  assert.match(en, /chromewebstore\.google\.com\/detail\/bilibili-comment-helper-c\/emfgghgdlmihojemgbgljgibiagiohdj/);
  assert.match(en, /Load From Source/i);
  assert.equal((en.match(/Load unpacked/g) || []).length, 1);
  assert.doesNotMatch(en, /Release ZIP|During development|extracted .* folder/i);
  assert.doesNotMatch(en, /multi-part videos|current page information/i);
  assert.doesNotMatch(
    en,
    /current version|not officially live|not published|not listed|under development|temporary use|not ready|unfinished/i
  );
});

function readText(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}
