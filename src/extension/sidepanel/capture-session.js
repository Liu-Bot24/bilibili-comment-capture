export function createCaptureSession({
  chromeApi,
  portName,
  getCaptureTarget,
  getCaptureOptions,
  onProgress,
  onDone,
  onError,
  onRunningChange,
}) {
  let capturePort = null;

  return {
    start() {
      const target = getCaptureTarget();
      if (!target?.bvid) return;

      disconnect();
      onRunningChange(true);
      capturePort = chromeApi.runtime.connect({ name: portName });
      capturePort.onMessage.addListener(handleRuntimeMessage);
      capturePort.onDisconnect.addListener(() => {
        if (capturePort) {
          capturePort = null;
          onRunningChange(false);
        }
      });
      capturePort.postMessage({
        type: "START_CAPTURE",
        payload: {
          url: target.url,
          bvid: target.bvid,
          tabId: target.tabId,
          options: getCaptureOptions(),
        },
      });
    },
    cancel() {
      capturePort?.postMessage({ type: "CANCEL_CAPTURE" });
    },
  };

  function handleRuntimeMessage(message) {
    if (message?.type === "PROGRESS") {
      onProgress(message.payload || {});
      return;
    }
    if (message?.type === "DONE") {
      const result = message.payload?.result || null;
      disconnect();
      onRunningChange(false);
      onDone(result);
      return;
    }
    if (message?.type === "ERROR") {
      const error = message.error || {};
      disconnect();
      onRunningChange(false);
      onError(error);
    }
  }

  function disconnect() {
    if (!capturePort) return;
    const port = capturePort;
    capturePort = null;
    port.disconnect();
  }
}
