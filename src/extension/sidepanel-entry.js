import { detectActiveVideoTab, watchActiveVideoTabs } from "./sidepanel/active-video.js";
import { selectAiAnalysisTarget } from "./sidepanel/analysis-target.js";
import { buildSiteResultUrl } from "../core/site-link.js";
import {
  bindCaptureOptionEvents,
  loadCaptureOptions,
  readCaptureOptionsFromForm,
  saveCaptureOptions,
  setCaptureOptionsLocked,
  syncCaptureLimitInputs,
  updateCaptureSummary,
} from "./sidepanel/capture-options-form.js";
import { createCaptureSession } from "./sidepanel/capture-session.js";
import {
  copyAllComments,
  exportCommentsAsJson,
  exportCommentsAsMarkdown,
  renderCapturedComments,
  renderEmptyComments,
  setCommentsFeedback,
} from "./sidepanel/comments-view.js";
import { getSidePanelElements } from "./sidepanel/elements.js";
import { applyLocale, loadUiLocale, saveUiLocale, t } from "./sidepanel/i18n.js";
import {
  clearCaptureError,
  renderCaptureError,
  renderCaptureProgress,
  setCaptureProgress,
} from "./sidepanel/progress-view.js";
import { activateView, setViewEnabled } from "./sidepanel/view-router.js";

const PORT_NAME = "bili-comment-capture";

const elements = getSidePanelElements();
const sidePanelState = {
  activeVideo: null,
  latestCaptureResult: null,
  isCaptureRunning: false,
  runningCaptureOptions: null,
  progressStatus: "waiting",
  latestProgress: null,
};

const captureSession = createCaptureSession({
  chromeApi: chrome,
  portName: PORT_NAME,
  getCaptureTarget: () => sidePanelState.activeVideo,
  getCaptureOptions: () => readCaptureOptionsFromForm(elements),
  onProgress: handleCaptureProgress,
  onDone: handleCaptureDone,
  onError: handleCaptureError,
  onRunningChange: setCaptureRunning,
});

init();

async function init() {
  await loadUiLocale(chrome.storage.local);
  applyLocale(elements);
  bindViewSwitching();
  bindCaptureOptionEvents(elements, handleCaptureOptionChange);
  bindActions();
  await loadCaptureOptions(chrome.storage.local, elements);
  syncCaptureLimitInputs(elements);
  updateCaptureSummary(elements);
  renderEmptyComments(elements);
  watchActiveVideoTabs(chrome, detectActiveVideo);
  await detectActiveVideo();
}

function bindViewSwitching() {
  for (const button of elements.viewButtons) {
    button.addEventListener("click", () => activateView(button.dataset.viewTarget));
  }
}

function bindActions() {
  for (const button of elements.localeButtons) {
    button.addEventListener("click", () => changeLocale(button.dataset.localeOption));
  }
  elements.refreshActiveVideo.addEventListener("click", detectActiveVideo);
  elements.openAiAnalysis.addEventListener("click", openAiAnalysis);
  elements.startCapture.addEventListener("click", startCapture);
  elements.cancelCapture.addEventListener("click", () => captureSession.cancel());
  elements.copyAllComments.addEventListener("click", () =>
    copyAllComments(elements, sidePanelState.latestCaptureResult)
  );
  elements.exportJson.addEventListener("click", () =>
    exportCommentsAsJson(elements, sidePanelState.latestCaptureResult)
  );
  elements.exportMarkdown.addEventListener("click", () =>
    exportCommentsAsMarkdown(elements, sidePanelState.latestCaptureResult)
  );
  elements.commentSearch.addEventListener("input", () =>
    renderCapturedComments(elements, sidePanelState.latestCaptureResult)
  );
}

async function changeLocale(locale) {
  await saveUiLocale(chrome.storage.local, locale);
  applyLocale(elements);
  refreshProgressForLocale();
  updateCaptureSummary(elements);
  if (sidePanelState.latestCaptureResult) {
    renderCapturedComments(elements, sidePanelState.latestCaptureResult);
  } else {
    renderEmptyComments(elements);
  }
  await detectActiveVideo();
}

function handleCaptureOptionChange() {
  syncCaptureLimitInputs(elements);
  updateCaptureSummary(elements);
  void saveCaptureOptions(chrome.storage.local, elements);
}

async function detectActiveVideo() {
  await detectActiveVideoTab(chrome, {
    onLoading() {
      setActiveVideo(null);
      renderActiveVideoState("loading", t("active.loadingTitle"), t("active.loadingMeta"));
      refreshCaptureControls();
    },
    onReady(video) {
      setActiveVideo(video);
      renderActiveVideoState("ready", video.title, `${video.bvid} · ${t("active.currentVideoPage")}`);
      refreshCaptureControls();
    },
    onMissing(title) {
      setActiveVideo(null);
      renderActiveVideoState("missing", t("active.missingTitle"), title || t("active.missingMeta"));
      refreshCaptureControls();
    },
  });
}

function setActiveVideo(video) {
  sidePanelState.activeVideo = video;
}

function renderActiveVideoState(kind, title, meta) {
  elements.activeVideoCard.classList.toggle("is-ready", kind === "ready");
  elements.activeVideoCard.classList.toggle("is-missing", kind === "missing");
  elements.activeVideoTitle.textContent = title;
  elements.activeVideoMeta.textContent = meta;
}

function startCapture() {
  if (!sidePanelState.activeVideo?.bvid) {
    renderCaptureError(elements, t("error.needVideo"));
    activateView("capture");
    return;
  }

  sidePanelState.latestCaptureResult = null;
  sidePanelState.runningCaptureOptions = readCaptureOptionsFromForm(elements);
  sidePanelState.latestProgress = null;
  sidePanelState.progressStatus = "running";
  setViewEnabled("comments", false);
  renderEmptyComments(elements);
  setCommentsFeedback(elements, "");
  clearCaptureError(elements);
  activateView("capture");
  setCaptureProgress(elements, 6, t("progress.start"));
  captureSession.start();
}

async function openAiAnalysis() {
  const target = selectAiAnalysisTarget({
    activeVideo: sidePanelState.activeVideo,
    latestCaptureResult: sidePanelState.latestCaptureResult,
  });

  if (!target?.bvid) {
    renderCaptureError(elements, t("error.needVideo"));
    return;
  }

  try {
    const url = buildSiteResultUrl({
      bvid: target.bvid,
      url: target.url,
      video: target.video,
    });
    await chrome.tabs.create({ url });
  } catch (error) {
    renderCaptureError(elements, error?.message || t("error.openAnalysis"));
  }
}

function handleCaptureProgress(progress) {
  sidePanelState.progressStatus = "running";
  sidePanelState.latestProgress = progress;
  renderCaptureProgress(elements, progress, sidePanelState.runningCaptureOptions || readCaptureOptionsFromForm(elements));
}

function handleCaptureDone(result) {
  sidePanelState.latestCaptureResult = result;
  sidePanelState.progressStatus = "done";
  sidePanelState.latestProgress = null;
  sidePanelState.runningCaptureOptions = null;
  setCaptureProgress(elements, 100, t("progress.done"));
  renderCapturedComments(elements, result);
  setViewEnabled("comments", true);
  activateView("comments");
}

function handleCaptureError(error) {
  const isAbort = error?.name === "AbortError";
  sidePanelState.progressStatus = isAbort ? "stopped" : "failed";
  sidePanelState.latestProgress = null;
  sidePanelState.runningCaptureOptions = null;
  setCaptureProgress(elements, 100, isAbort ? t("progress.stopped") : t("progress.failed"));
  if (!isAbort) renderCaptureError(elements, error?.message || t("error.captureFailed"));
  activateView("capture");
}

function setCaptureRunning(isRunning) {
  sidePanelState.isCaptureRunning = isRunning;
  elements.cancelCapture.disabled = !isRunning;
  setCaptureOptionsLocked(elements, isRunning);
  refreshCaptureControls();
}

function refreshCaptureControls() {
  elements.startCapture.disabled = sidePanelState.isCaptureRunning || !sidePanelState.activeVideo?.bvid;
  elements.openAiAnalysis.disabled = !sidePanelState.activeVideo?.bvid && !sidePanelState.latestCaptureResult?.video?.bvid;
}

function refreshProgressForLocale() {
  if (sidePanelState.progressStatus === "running" && sidePanelState.latestProgress) {
    renderCaptureProgress(elements, sidePanelState.latestProgress, sidePanelState.runningCaptureOptions || readCaptureOptionsFromForm(elements));
    return;
  }

  const progressKeys = {
    done: "progress.done",
    failed: "progress.failed",
    stopped: "progress.stopped",
    waiting: "progress.waiting",
  };
  const key = progressKeys[sidePanelState.progressStatus] || "progress.waiting";
  const value = sidePanelState.progressStatus === "waiting" ? 0 : 100;
  setCaptureProgress(elements, value, t(key));
}
