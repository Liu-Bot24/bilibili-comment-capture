import { captureVideoComments } from "../core/capture.js";
import { createPageCommentClient } from "./page-comment-client.js";

const PORT_NAME = "bili-comment-capture";

configureSidePanel();

chrome.runtime.onConnect.addListener((port) => {
  if (port.name !== PORT_NAME) return;

  let activeController = null;

  port.onMessage.addListener((message) => {
    if (message?.type === "START_CAPTURE") {
      if (activeController) activeController.abort();
      activeController = new AbortController();
      runCapture(port, message.payload || {}, activeController)
        .catch((error) => {
          port.postMessage({ type: "ERROR", error: serializeError(error) });
        })
        .finally(() => {
          activeController = null;
        });
      return;
    }

    if (message?.type === "CANCEL_CAPTURE" && activeController) {
      activeController.abort();
    }
  });

  port.onDisconnect.addListener(() => {
    if (activeController) activeController.abort();
  });
});

function configureSidePanel() {
  if (!chrome.sidePanel?.setPanelBehavior) return;
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {
    // Older Chrome builds can still open the panel from the side panel menu.
  });
}

async function runCapture(port, payload, controller) {
  port.postMessage({ type: "PROGRESS", payload: { phase: "start", message: "开始抓取评论" } });
  const result = await captureVideoComments(
    {
      url: payload.url,
      bvid: payload.bvid,
      options: payload.options,
    },
    {
      client: createPageCommentClient({ chromeApi: chrome, tabId: payload.tabId }),
      signal: controller.signal,
      onProgress(progress) {
        port.postMessage({ type: "PROGRESS", payload: progress });
      },
    }
  );

  await chrome.storage.local.set({
    lastCaptureSummary: {
      generatedAt: result.generatedAt,
      videoTitle: result.video?.title || "",
      bvid: result.video?.bvid || "",
      stats: result.stats,
    },
  });
  port.postMessage({ type: "DONE", payload: { result } });
}

function serializeError(error) {
  return {
    name: error?.name || "Error",
    message: error?.message || "Unknown error",
    code: error?.code || "",
    status: error?.status || 0,
    details: error?.details || null,
  };
}
