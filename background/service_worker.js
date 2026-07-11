const runtimeApi = globalThis.browser?.runtime ?? globalThis.chrome.runtime;

runtimeApi.onInstalled.addListener(() => {
  console.info("Gem Bridge Extension installed.");
});

runtimeApi.onMessage.addListener((message, _sender, sendResponse) => {
  if (!message || message.type !== "gemExtension.ping") {
    return false;
  }

  sendResponse({
    success: true,
    data: {
      status: "ready",
      extension: "gem-bridge-extension",
      version: runtimeApi.getManifest().version
    }
  });

  return false;
});
