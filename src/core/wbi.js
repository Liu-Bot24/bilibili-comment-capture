import md5 from "js-md5";

export const MIXIN_KEY_ENC_TAB = [
  46, 47, 18, 2, 53, 8, 23, 32, 15, 50, 10, 31, 58, 3, 45, 35, 27, 43, 5, 49, 33, 9,
  42, 19, 29, 28, 14, 39, 12, 38, 41, 13, 37, 48, 7, 16, 24, 55, 40, 61, 26, 17, 0,
  1, 60, 51, 30, 4, 22, 25, 54, 21, 56, 59, 6, 63, 57, 62, 11, 36, 20, 34, 44, 52,
];

export function extractWbiKeyFromUrl(input) {
  if (!input) return "";
  try {
    const url = new URL(String(input));
    return (url.pathname.split("/").pop() || "").replace(/\.(png|jpg|webp)$/i, "");
  } catch (_error) {
    return String(input).split("/").pop().replace(/\.(png|jpg|webp)$/i, "");
  }
}

export function getMixinKey(imgKey, subKey) {
  const raw = `${imgKey || ""}${subKey || ""}`;
  if (raw.length < 64) {
    throw new Error("Invalid WBI key material");
  }
  return MIXIN_KEY_ENC_TAB.map((index) => raw[index]).join("").slice(0, 32);
}

export function signWbiParams(params, mixinKey, options = {}) {
  if (!mixinKey) {
    throw new Error("Missing WBI mixin key");
  }

  const wts = Number.isFinite(Number(options.wts)) ? Number(options.wts) : Math.floor(Date.now() / 1000);
  const normalized = {};
  for (const [key, value] of Object.entries({ ...(params || {}), wts })) {
    if (value === undefined || value === null || value === "") continue;
    normalized[key] = String(value).replace(/[!'()*]/g, "");
  }

  const baseQuery = Object.keys(normalized)
    .sort()
    .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(normalized[key])}`)
    .join("&");
  const wRid = md5(`${baseQuery}${mixinKey}`);
  const signedParams = { ...normalized, w_rid: wRid };

  return {
    params: signedParams,
    query: `${baseQuery}&w_rid=${wRid}`,
  };
}

