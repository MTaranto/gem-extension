const backgroundStatusElement = document.getElementById("background-status");
const nativeStatusElement = document.getElementById("native-status");
const nativeHostElement = document.getElementById("native-host");
const nativeMessageElement = document.getElementById("native-message");

const snapshotButton = document.getElementById("snapshot-button");
const snapshotStatusElement = document.getElementById("snapshot-status");
const snapshotResultElement = document.getElementById("snapshot-result");
const snapshotWorkspaceElement = document.getElementById("snapshot-workspace");
const snapshotBranchElement = document.getElementById("snapshot-branch");
const snapshotGitStatusElement = document.getElementById(
  "snapshot-git-status"
);
const snapshotGitDiffElement = document.getElementById("snapshot-git-diff");
const snapshotFilesElement = document.getElementById("snapshot-files");
const snapshotContentSizeElement = document.getElementById(
  "snapshot-content-size"
);
const snapshotOmittedElement = document.getElementById("snapshot-omitted");
const snapshotCompletenessElement = document.getElementById(
  "snapshot-completeness"
);

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

function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes < 0) {
    return "unknown";
  }

  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KiB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MiB`;
}

function showSnapshotError(message) {
  snapshotStatusElement.textContent = message;
  snapshotStatusElement.className = "error";
  snapshotResultElement.hidden = true;
}

function showProjectSnapshot(snapshot) {
  if (
    !snapshot ||
    typeof snapshot.workspace !== "string" ||
    typeof snapshot.branch !== "string" ||
    !Array.isArray(snapshot.gitStatus) ||
    typeof snapshot.gitDiff !== "string" ||
    !Array.isArray(snapshot.files) ||
    !Array.isArray(snapshot.omitted) ||
    typeof snapshot.truncated !== "boolean"
  ) {
    showSnapshotError("Native host returned invalid snapshot data.");
    return;
  }

  const contentBytes = snapshot.files.reduce((total, file) => {
    if (!file || typeof file.size !== "number") {
      return total;
    }

    return total + file.size;
  }, 0);

  const gitDiffBytes = new TextEncoder().encode(snapshot.gitDiff).length;

  snapshotWorkspaceElement.textContent = snapshot.workspace;
  snapshotBranchElement.textContent =
    snapshot.branch || "detached or unavailable";

  snapshotGitStatusElement.textContent =
    snapshot.gitStatus.length === 0
      ? "clean"
      : `${snapshot.gitStatus.length} entries`;

  snapshotGitDiffElement.textContent =
    gitDiffBytes === 0
      ? "no changes"
      : formatBytes(gitDiffBytes);

  snapshotFilesElement.textContent = String(snapshot.files.length);
  snapshotContentSizeElement.textContent = formatBytes(contentBytes);
  snapshotOmittedElement.textContent = String(snapshot.omitted.length);

  snapshotCompletenessElement.textContent = snapshot.truncated
    ? "truncated by safety limits"
    : "complete";

  snapshotCompletenessElement.className = snapshot.truncated
    ? "warning"
    : "success";

  snapshotStatusElement.textContent = "Project snapshot loaded successfully.";
  snapshotStatusElement.className = "success";
  snapshotResultElement.hidden = false;
}

async function loadProjectSnapshot() {
  snapshotButton.disabled = true;
  snapshotStatusElement.textContent = "Building project snapshot...";
  snapshotStatusElement.className = "warning";
  snapshotResultElement.hidden = true;

  try {
    const response = await sendRuntimeMessage({
      type: "gemExtension.projectSnapshot"
    });

    if (!response || response.success !== true) {
      showSnapshotError(
        response?.error ?? "Project snapshot creation failed."
      );
      return;
    }

    if (response.type !== "projectSnapshot" || !response.data) {
      showSnapshotError(
        "Native host returned an unexpected project snapshot response."
      );
      return;
    }

    showProjectSnapshot(response.data);
  } catch (error) {
    showSnapshotError(
      `Project snapshot unavailable: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  } finally {
    snapshotButton.disabled = false;
  }
}

async function checkBackgroundStatus() {
  try {
    const response = await sendRuntimeMessage({
      type: "gemExtension.ping"
    });

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

snapshotButton.addEventListener("click", loadProjectSnapshot);

checkBackgroundStatus();
checkNativeStatus();
