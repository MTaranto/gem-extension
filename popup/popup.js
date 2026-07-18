const backgroundStatusElement = document.getElementById("background-status");
const nativeStatusElement = document.getElementById("native-status");
const nativeHostElement = document.getElementById("native-host");
const nativeMessageElement = document.getElementById("native-message");
const fileStatusElement = document.getElementById("file-status");
const fileResultElement = document.getElementById("file-result");
const fileMetaElement = document.getElementById("file-meta");
const fileContentElement = document.getElementById("file-content");
const fileButtons = document.querySelectorAll("[data-file-path]");

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

function setFileButtonsDisabled(disabled) {
  for (const button of fileButtons) {
    button.disabled = disabled;
  }
}

function showFileError(message) {
  fileStatusElement.textContent = message;
  fileStatusElement.className = "error";
  fileResultElement.hidden = true;
}

function showFileResponse(response) {
  if (!response || response.success !== true) {
    showFileError(response?.error ?? "File reading failed.");
    return;
  }

  if (response.type !== "fileContent" || !response.data) {
    showFileError("Native host returned an unexpected file response.");
    return;
  }

  const { path, content, size } = response.data;

  if (
    typeof path !== "string" ||
    typeof content !== "string" ||
    typeof size !== "number"
  ) {
    showFileError("Native host returned invalid file data.");
    return;
  }

  fileStatusElement.textContent = "File read successfully.";
  fileStatusElement.className = "success";

  fileMetaElement.textContent = `${path} — ${size} bytes`;
  fileContentElement.textContent = content;
  fileResultElement.hidden = false;
}

async function readLocalFile(path) {
  setFileButtonsDisabled(true);

  fileStatusElement.textContent = `Reading ${path}...`;
  fileStatusElement.className = "warning";
  fileResultElement.hidden = true;

  try {
    const response = await sendRuntimeMessage({
      type: "gemExtension.readFile",
      path
    });

    showFileResponse(response);
  } catch (error) {
    showFileError(
      `Unable to read ${path}: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  } finally {
    setFileButtonsDisabled(false);
  }
}

async function checkBackgroundStatus() {
  try {
    const response = await sendRuntimeMessage({ type: "gemExtension.ping" });

    if (!response || !response.success) {
      backgroundStatusElement.textContent =
        "Background responded with an unexpected result.";
      backgroundStatusElement.className = "error";
      return;
    }

    backgroundStatusElement.textContent =
      `Ready — version ${response.data.version}`;
    backgroundStatusElement.className = "success";
  } catch (error) {
    backgroundStatusElement.textContent =
      `Background unavailable: ${error.message}`;
    backgroundStatusElement.className = "error";
  }
}

async function checkNativeStatus() {
  try {
    const response = await sendRuntimeMessage({
      type: "gemExtension.nativeStatus"
    });

    if (!response || !response.success) {
      nativeStatusElement.textContent =
        "Native client responded with an unexpected result.";
      nativeStatusElement.className = "error";
      return;
    }

    const status = response.data;

    nativeStatusElement.textContent = `Status: ${status.status}`;
    nativeStatusElement.className = status.connected ? "success" : "warning";

    nativeHostElement.textContent = `Host: ${status.hostName}`;
    nativeMessageElement.textContent = status.message;
  } catch (error) {
    nativeStatusElement.textContent =
      `Native client unavailable: ${error.message}`;
    nativeStatusElement.className = "error";
  }
}

for (const button of fileButtons) {
  button.addEventListener("click", () => {
    readLocalFile(button.dataset.filePath);
  });
}

checkBackgroundStatus();
checkNativeStatus();
