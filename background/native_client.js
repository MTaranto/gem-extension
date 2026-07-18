const GEM_NATIVE_HOST_NAME = "com.gembridge.daemon";

// GemNativeClient centralizes Native Messaging communication with the local host.
function getRuntimeApi() {
  return globalThis.browser?.runtime ?? globalThis.chrome?.runtime;
}

function sendNativeMessage(message) {
  const runtimeApi = getRuntimeApi();

  if (!runtimeApi?.sendNativeMessage) {
    return Promise.reject(
      new Error("Native Messaging API is not available in this context.")
    );
  }

  if (globalThis.browser?.runtime?.sendNativeMessage) {
    return globalThis.browser.runtime.sendNativeMessage(
      GEM_NATIVE_HOST_NAME,
      message
    );
  }

  return new Promise((resolve, reject) => {
    runtimeApi.sendNativeMessage(
      GEM_NATIVE_HOST_NAME,
      message,
      (response) => {
        const lastError = globalThis.chrome.runtime.lastError;

        if (lastError) {
          reject(new Error(lastError.message));
          return;
        }

        resolve(response);
      }
    );
  });
}

async function pingNativeHost() {
  try {
    const response = await sendNativeMessage({ type: "ping" });

    if (!response || response.success !== true || response.type !== "pong") {
      return {
        hostName: GEM_NATIVE_HOST_NAME,
        status: "unexpected_response",
        connected: false,
        message: "Native host returned an unexpected response.",
        response
      };
    }

    return {
      hostName: GEM_NATIVE_HOST_NAME,
      status: "connected",
      connected: true,
      message: "Native host responded successfully.",
      response
    };
  } catch (error) {
    return {
      hostName: GEM_NATIVE_HOST_NAME,
      status: "connection_failed",
      connected: false,
      message: error instanceof Error ? error.message : String(error)
    };
  }
}

globalThis.GemNativeClient = {
  hostName: GEM_NATIVE_HOST_NAME,
  ping: pingNativeHost
};
