const GEM_NATIVE_HOST_NAME = "com.gembridge.daemon";

// GemNativeClient centralizes future Native Messaging communication.
//
// This first version does not connect to the native host yet. It only exposes
// a status object so the popup and background can evolve around a stable module
// boundary before real host communication is implemented.
function getNativeClientStatus() {
  const runtimeApi = globalThis.chrome?.runtime ?? globalThis.browser?.runtime;
  const nativeMessagingAvailable = Boolean(
    runtimeApi?.connectNative || runtimeApi?.sendNativeMessage
  );

  return {
    hostName: GEM_NATIVE_HOST_NAME,
    status: "not_configured",
    connected: false,
    nativeMessagingAvailable,
    message: nativeMessagingAvailable
      ? "Native Messaging API is available. Native host connection is not implemented yet."
      : "Native Messaging API is not available in this context."
  };
}

globalThis.GemNativeClient = {
  hostName: GEM_NATIVE_HOST_NAME,
  getStatus: getNativeClientStatus
};
