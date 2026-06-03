export function getSidePanelElements() {
  return {
    viewButtons: [...document.querySelectorAll("[data-view-target]")],
    viewPanels: [...document.querySelectorAll("[data-view-panel]")],
    localeButtons: [...document.querySelectorAll("[data-locale-option]")],
    activeVideoCard: byId("active-video-card"),
    activeVideoTitle: byId("active-video-title"),
    activeVideoMeta: byId("active-video-meta"),
    refreshActiveVideo: byId("refresh-active-video"),
    openAiAnalysis: byId("open-ai-analysis"),
    captureSummary: byId("capture-summary"),
    captureOptionControls: [...document.querySelectorAll("#view-capture input")],
    rootLoads: byId("root-loads"),
    rootLoadsAll: byId("root-loads-all"),
    rootItems: byId("root-items"),
    rootItemsAll: byId("root-items-all"),
    includeReplies: byId("include-replies"),
    replyOptionsPanel: document.querySelector(".reply-comment-options"),
    replyOptionControls: [...document.querySelectorAll(".reply-comment-options input:not(#include-replies)")],
    replyLoads: byId("reply-loads"),
    replyLoadsAll: byId("reply-loads-all"),
    replyItems: byId("reply-items"),
    replyItemsAll: byId("reply-items-all"),
    startCapture: byId("start-capture"),
    cancelCapture: byId("cancel-capture"),
    progressTrack: document.querySelector(".progress-track"),
    progressBar: byId("progress-bar"),
    progressText: byId("progress-text"),
    errorText: byId("error-text"),
    resultTitle: byId("result-title"),
    resultMeta: byId("result-meta"),
    resultStats: byId("result-stats"),
    commentList: byId("comment-list"),
    commentSearch: byId("comment-search"),
    commentsFeedback: byId("comments-feedback"),
    copyAllComments: byId("copy-all-comments"),
    exportJson: byId("export-json"),
    exportMarkdown: byId("export-markdown"),
  };
}

function byId(id) {
  return document.getElementById(id);
}
