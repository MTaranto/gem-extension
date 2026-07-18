importScripts("native_client.js");

const runtimeApi = globalThis.browser?.runtime ?? globalThis.chrome.runtime;

runtimeApi.onInstalled.addListener(() => {
  console.info("Gem Bridge Extension installed.");
});

runtimeApi.onMessage.addListener((message, _sender, sendResponse) => {
  if (!message || typeof message.type !== "string") {
    return false;
  }

  if (message.type === "gemExtension.ping") {
    sendResponse({
      success: true,
      data: {
        status: "ready",
        extension: "gem-bridge-extension",
        version: runtimeApi.getManifest().version
      }
    });

    return false;
  }

  if (message.type === "gemExtension.nativeStatus") {
    globalThis.GemNativeClient.ping()
      .then((status) => {
        sendResponse({
          success: true,
          data: status
        });
      })
      .catch((error) => {
        sendResponse({
          success: false,
          error: error instanceof Error ? error.message : String(error)
        });
      });

    return true;
  }

  return false;
});
