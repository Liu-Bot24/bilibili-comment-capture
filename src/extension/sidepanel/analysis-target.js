export function selectAiAnalysisTarget({ activeVideo, latestCaptureResult } = {}) {
  if (latestCaptureResult?.video?.bvid) {
    return {
      bvid: latestCaptureResult.video.bvid,
      url: latestCaptureResult.source?.pageUrl || latestCaptureResult.video.url || activeVideo?.url || "",
      video: latestCaptureResult.video,
    };
  }

  if (activeVideo?.bvid) {
    return {
      bvid: activeVideo.bvid,
      url: activeVideo.url || "",
      video: activeVideo,
    };
  }

  return null;
}
