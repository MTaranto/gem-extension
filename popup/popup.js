const runtimeApi = globalThis.browser?.runtime ?? globalThis.chrome.runtime;
const statusElement = document.getElementById("status");

runtimeApi.sendMessage({ type: "gemExtension.ping" }, (response) => {
  const lastError = runtimeApi.lastError;

  if (lastError) {
    statusElement.textContent = `Background unavailable: ${lastError.message}`;
    statusElement.className = "error";
    return;
  }

  if (!response || !response.success) {
    statusElement.textContent = "Background responded with an unexpected result.";
    statusElement.className = "error";
    return;
  }

  statusElement.textContent = `Ready — version ${response.data.version}`;
  statusElement.className = "success";
});
