import { t } from "./i18n.js";

export function renderCaptureProgress(elements, progress, options) {
  if (progress.phase === "start") {
    setCaptureProgress(elements, 8, t("progress.start"));
    return;
  }
  if (progress.phase === "video") {
    setCaptureProgress(elements, 12, t("progress.readVideo"));
    return;
  }
  if (progress.phase === "root") {
    const max = isAllLimit(options.rootMaxPages) ? Math.max(progress.page || 1, 20) : options.rootMaxPages;
    const percent = Math.min(72, 12 + ((progress.page || 1) / max) * 42);
    setCaptureProgress(elements, percent, t("progress.root", { page: progress.page || 1, count: progress.fetched || 0 }));
    return;
  }
  if (progress.phase === "reply") {
    const percent = 58 + ((progress.rootIndex || 1) / Math.max(1, progress.rootTotal || 1)) * 34;
    setCaptureProgress(elements, percent, t("progress.replies", { current: progress.rootIndex || 1, total: progress.rootTotal || 1 }));
    return;
  }
  setCaptureProgress(elements, 8, progress.message || t("progress.running"));
}

function isAllLimit(value) {
  return value === "all" || value === Infinity;
}

export function setCaptureProgress(elements, percent, text) {
  const value = Math.max(0, Math.min(100, Math.round(percent)));
  elements.progressBar.style.width = `${value}%`;
  elements.progressTrack.setAttribute("aria-valuenow", String(value));
  elements.progressText.textContent = text;
}

export function renderCaptureError(elements, message) {
  elements.errorText.hidden = false;
  elements.errorText.textContent = message;
}

export function clearCaptureError(elements) {
  elements.errorText.hidden = true;
  elements.errorText.textContent = "";
}
