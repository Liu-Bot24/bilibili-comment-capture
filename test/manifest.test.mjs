import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { inflateSync } from "node:zlib";

const rootDir = resolve(import.meta.dirname, "..");
const STATIC_IMPORT_PATTERN = /(?:^|\n)\s*import\s+(?:[\w*{]|["'])/;
const BARE_IMPORT_PATTERN = /from\s+["'](?!\.{0,2}\/|\/|chrome-extension:\/\/)[^"']+["']/;

test("manifest uses MV3 with narrow Bilibili permissions", () => {
  const manifest = JSON.parse(readFileSync(resolve(rootDir, "manifest.json"), "utf8"));

  assert.equal(manifest.manifest_version, 3);
  assert.equal(manifest.default_locale, "en");
  assert.equal(manifest.name, "__MSG_extensionName__");
  assert.equal(manifest.short_name, "__MSG_extensionShortName__");
  assert.equal(manifest.description, "__MSG_extensionDescription__");
  assert.equal(manifest.minimum_chrome_version, "114");
  assert.equal(manifest.action.default_title, "__MSG_actionTitle__");
  assert.deepEqual(manifest.permissions.sort(), ["activeTab", "scripting", "sidePanel", "storage"].sort());
  assert.deepEqual(manifest.host_permissions.sort(), [
    "https://api.bilibili.com/*",
    "https://www.bilibili.com/*",
  ].sort());
  assert.equal(manifest.background.service_worker, "background/background.js");
  assert.equal(manifest.side_panel.default_path, "sidepanel/sidepanel.html");
  assert.equal(manifest.action.default_popup, undefined);
});

test("manifest locales cover comment helper language set with search-friendly translated names", () => {
  const expectedLocales = ["en", "hi", "id", "ja", "ko", "ms", "th", "vi", "zh_CN", "zh_TW"];
  const localeRoot = resolve(rootDir, "_locales");

  assert.deepEqual(readdirSync(localeRoot).sort(), expectedLocales.sort());

  for (const locale of expectedLocales) {
    const messages = JSON.parse(readFileSync(resolve(localeRoot, locale, "messages.json"), "utf8"));
    for (const key of ["extensionName", "extensionShortName", "extensionDescription", "actionTitle"]) {
      assert.equal(typeof messages[key]?.message, "string", `${locale} ${key} should exist`);
      assert.ok(messages[key].message.length > 0, `${locale} ${key} should not be empty`);
    }
    assert.ok(messages.extensionName.message.length <= 75, `${locale} extensionName should fit Chrome manifest name limit`);
    assert.ok(messages.extensionShortName.message.length <= 12, `${locale} extensionShortName should fit Chrome manifest short_name limit`);
    assert.ok(
      messages.extensionDescription.message.length <= 132,
      `${locale} extensionDescription should fit Chrome manifest description limit`
    );
  }

  const zh = JSON.parse(readFileSync(resolve(localeRoot, "zh_CN/messages.json"), "utf8"));
  const en = JSON.parse(readFileSync(resolve(localeRoot, "en/messages.json"), "utf8"));
  assert.equal(zh.extensionShortName.message, "B站评论导出助手");
  assert.match(zh.extensionName.message, /^B站评论导出助手 - /);
  assert.match(zh.extensionName.message, /抓取|复制|导出|搜索|评论/);
  assert.match(en.extensionName.message, /^Bilibili Comment Helper - /);
  assert.match(en.extensionName.message, /Capture|Copy|Export|Search|Comment/);
});

test("extension icon follows the companion helper blue-green family", () => {
  const icon = readFileSync(resolve(rootDir, "icons/icon.svg"), "utf8");

  assert.match(icon, /#00A1D6/i);
  assert.match(icon, /#33C4A5/i);
  assert.doesNotMatch(icon, /#FB7299/i);
});

test("raster icons keep transparent corners instead of baked white corners", () => {
  for (const size of [16, 32, 48, 128]) {
    const icon = readPng(resolve(rootDir, `icons/icon${size}.png`));
    let translucentEdgePixels = 0;
    assert.equal(icon.width, size);
    assert.equal(icon.height, size);
    assert.equal(icon.pixel(0, 0).alpha, 0, `icon${size}.png top-left corner should be transparent`);
    assert.equal(icon.pixel(size - 1, 0).alpha, 0, `icon${size}.png top-right corner should be transparent`);
    assert.equal(icon.pixel(0, size - 1).alpha, 0, `icon${size}.png bottom-left corner should be transparent`);
    assert.equal(icon.pixel(size - 1, size - 1).alpha, 0, `icon${size}.png bottom-right corner should be transparent`);
    assert.notEqual(icon.pixel(0, 0).red, 255, `icon${size}.png corner must not bake a white background`);

    for (let y = 0; y < size; y += 1) {
      for (let x = 0; x < size; x += 1) {
        const pixel = icon.pixel(x, y);
        if (pixel.alpha > 0 && pixel.alpha < 255) {
          translucentEdgePixels += 1;
          assert.ok(
            pixel.red < 245 || pixel.green < 245 || pixel.blue < 245,
            `icon${size}.png translucent edge must not carry white RGB at ${x},${y}`
          );
        }
      }
    }
    assert.ok(translucentEdgePixels > 0, `icon${size}.png should preserve antialiased transparent edges`);
  }
});

test("declared extension runtime source files exist", () => {
  const manifest = JSON.parse(readFileSync(resolve(rootDir, "manifest.json"), "utf8"));
  const runtimeFiles = [
    manifest.background.service_worker,
    manifest.side_panel.default_path,
    ...(manifest.content_scripts?.[0]?.js || []),
    ...(manifest.content_scripts?.[0]?.css || []),
  ];

  for (const file of runtimeFiles) {
    assert.equal(existsSync(resolve(rootDir, file)), true, `${file} should exist`);
  }
});

test("classic extension HTML does not use remote scripts", () => {
  const html = readFileSync(resolve(rootDir, "sidepanel/sidepanel.html"), "utf8");

  assert.doesNotMatch(html, /https?:\/\//);
  assert.match(html, /<script type="module" src="sidepanel\.js"><\/script>/);
});

test("root runtime files are bundled for direct Chrome unpacked loading", () => {
  const background = readFileSync(resolve(rootDir, "background/background.js"), "utf8");
  const content = readFileSync(resolve(rootDir, "content/content.js"), "utf8");
  const sidepanel = readFileSync(resolve(rootDir, "sidepanel/sidepanel.js"), "utf8");

  assert.doesNotMatch(background, BARE_IMPORT_PATTERN, "background must not import bare npm packages");
  assert.doesNotMatch(background, /\.\.\/src\//, "background must not import source modules at runtime");
  assert.doesNotMatch(content, STATIC_IMPORT_PATTERN, "content scripts must be classic bundled scripts");
  assert.doesNotMatch(content, /\.\.\/src\//, "content must not import source modules at runtime");
  assert.doesNotMatch(sidepanel, BARE_IMPORT_PATTERN, "side panel must not import bare npm packages");
  assert.doesNotMatch(sidepanel, /\.\.\/src\//, "side panel must not import source modules at runtime");
});

test("background configures action clicks to open the side panel", () => {
  const backgroundSource = readFileSync(resolve(rootDir, "src/extension/background-entry.js"), "utf8");

  assert.match(backgroundSource, /chrome\.sidePanel\.setPanelBehavior/);
  assert.match(backgroundSource, /openPanelOnActionClick:\s*true/);
});

test("store pack script removes stale archives before zipping current dist", () => {
  const script = readFileSync(resolve(rootDir, "scripts/pack-store.mjs"), "utf8");

  assert.match(script, /rm\(zipPath,\s*\{\s*force:\s*true/);
});

test("pack scripts keep release and Chrome Web Store packages separate", () => {
  const packageJson = JSON.parse(readFileSync(resolve(rootDir, "package.json"), "utf8"));
  const gitignore = readFileSync(resolve(rootDir, ".gitignore"), "utf8");
  const storeScript = readFileSync(resolve(rootDir, "scripts/pack-store.mjs"), "utf8");
  const releaseScript = readFileSync(resolve(rootDir, "scripts/pack-release.mjs"), "utf8");

  assert.equal(packageJson.scripts["pack:release"], "node scripts/pack-release.mjs");
  assert.equal(packageJson.scripts["pack:store"], "node scripts/pack-store.mjs");
  assert.match(gitignore, /^chrome-web-store\/$/m);
  assert.match(gitignore, /^releases\/$/m);
  assert.match(storeScript, /chrome-web-store/);
  assert.match(storeScript, /zipPath/);
  assert.match(storeScript, /cwd:\s*resolve\(rootDir,\s*"dist"\)/);
  assert.doesNotMatch(storeScript, /releaseRootName/);
  assert.match(releaseScript, /"releases"/);
  assert.doesNotMatch(releaseScript, /chrome-web-store/);
  assert.match(releaseScript, /releaseRootName/);
  assert.match(releaseScript, /cwd:\s*stagingDir/);
});

function readPng(file) {
  const bytes = readFileSync(file);
  let offset = 8;
  let width = 0;
  let height = 0;
  let colorType = 0;
  const idat = [];

  while (offset < bytes.length) {
    const length = bytes.readUInt32BE(offset);
    offset += 4;
    const type = bytes.toString("ascii", offset, offset + 4);
    offset += 4;
    const data = bytes.subarray(offset, offset + length);
    offset += length + 4;

    if (type === "IHDR") {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      colorType = data[9];
    } else if (type === "IDAT") {
      idat.push(data);
    } else if (type === "IEND") {
      break;
    }
  }

  assert.equal(colorType, 6, `${file} must be RGBA PNG`);

  const channels = 4;
  const raw = inflateSync(Buffer.concat(idat));
  const stride = width * channels;
  const rows = [];
  let rawOffset = 0;
  let previous = Buffer.alloc(stride);

  for (let y = 0; y < height; y += 1) {
    const filter = raw[rawOffset];
    rawOffset += 1;
    const row = Buffer.from(raw.subarray(rawOffset, rawOffset + stride));
    rawOffset += stride;
    unfilterPngRow(row, previous, channels, filter);
    rows.push(row);
    previous = row;
  }

  return {
    width,
    height,
    pixel(x, y) {
      const index = x * channels;
      return {
        red: rows[y][index],
        green: rows[y][index + 1],
        blue: rows[y][index + 2],
        alpha: rows[y][index + 3],
      };
    },
  };
}

function unfilterPngRow(row, previous, channels, filter) {
  for (let index = 0; index < row.length; index += 1) {
    const left = index >= channels ? row[index - channels] : 0;
    const up = previous[index] || 0;
    const upperLeft = index >= channels ? previous[index - channels] || 0 : 0;

    if (filter === 1) {
      row[index] = (row[index] + left) & 255;
    } else if (filter === 2) {
      row[index] = (row[index] + up) & 255;
    } else if (filter === 3) {
      row[index] = (row[index] + Math.floor((left + up) / 2)) & 255;
    } else if (filter === 4) {
      row[index] = (row[index] + paethPredictor(left, up, upperLeft)) & 255;
    } else {
      assert.equal(filter, 0, "unsupported PNG filter");
    }
  }
}

function paethPredictor(left, up, upperLeft) {
  const estimate = left + up - upperLeft;
  const leftDistance = Math.abs(estimate - left);
  const upDistance = Math.abs(estimate - up);
  const upperLeftDistance = Math.abs(estimate - upperLeft);
  if (leftDistance <= upDistance && leftDistance <= upperLeftDistance) return left;
  if (upDistance <= upperLeftDistance) return up;
  return upperLeft;
}
