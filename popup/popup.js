const backgroundStatusElement = document.getElementById("background-status");
const nativeStatusElement = document.getElementById("native-status");
const nativeHostElement = document.getElementById("native-host");
const nativeMessageElement = document.getElementById("native-message");

function sendRuntimeMessage(message) {
  if (globalThis.browser?.runtime?.sendMessage) {
    return globalThis.browser.runtime.sendMessage(message);
  }

  return new Promise((resolve, reject) => {
    globalThis.chrome.runtime.sendMessage(message, (response) => {
      const lastError = globalThis.chrome.runtime.lastError;

      if (lastError) {
        reject(new Error(lastError.message));
        return;
      }

      resolve(response);
    });
  });
}

async function checkBackgroundStatus() {
  try {
    const response = await sendRuntimeMessage({ type: "gemExtension.ping" });

    if (!response || !response.success) {
      backgroundStatusElement.textContent = "Background responded with an unexpected result.";
      backgroundStatusElement.className = "error";
      return;
    }

    backgroundStatusElement.textContent = `Ready — version ${response.data.version}`;
    backgroundStatusElement.className = "success";
  } catch (error) {
    backgroundStatusElement.textContent = `Background unavailable: ${error.message}`;
    backgroundStatusElement.className = "error";
  }
}

async function checkNativeStatus() {
  try {
    const response = await sendRuntimeMessage({ type: "gemExtension.nativeStatus" });

    if (!response || !response.success) {
      nativeStatusElement.textContent = "Native client responded with an unexpected result.";
      nativeStatusElement.className = "error";
      return;
    }

    const status = response.data;

    nativeStatusElement.textContent = `Status: ${status.status}`;
    nativeStatusElement.className = status.connected ? "success" : "warning";

    nativeHostElement.textContent = `Host: ${status.hostName}`;
    nativeMessageElement.textContent = status.message;
  } catch (error) {
    nativeStatusElement.textContent = `Native client unavailable: ${error.message}`;
    nativeStatusElement.className = "error";
  }
}

checkBackgroundStatus();
checkNativeStatus();
