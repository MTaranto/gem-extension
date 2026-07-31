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

const attachContextButton = document.getElementById(
  "attach-context-button"
);
const attachmentStatusElement = document.getElementById(
  "attachment-status"
);

let currentSnapshot = null;

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

function withTimeout(promise, timeoutMilliseconds, timeoutMessage) {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error(timeoutMessage));
    }, timeoutMilliseconds);

    Promise.resolve(promise).then(
      (value) => {
        clearTimeout(timeoutId);
        resolve(value);
      },
      (error) => {
        clearTimeout(timeoutId);
        reject(error);
      }
    );
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

function isValidSnapshotFile(file) {
  return (
    file &&
    typeof file.path === "string" &&
    typeof file.size === "number" &&
    typeof file.content === "string"
  );
}

function isValidSnapshotOmission(omission) {
  return (
    omission &&
    typeof omission.path === "string" &&
    typeof omission.reason === "string"
  );
}

function isValidProjectSnapshot(snapshot) {
  return (
    snapshot &&
    typeof snapshot.workspace === "string" &&
    typeof snapshot.branch === "string" &&
    Array.isArray(snapshot.gitStatus) &&
    snapshot.gitStatus.every((entry) => typeof entry === "string") &&
    typeof snapshot.gitDiff === "string" &&
    Array.isArray(snapshot.files) &&
    snapshot.files.every(isValidSnapshotFile) &&
    Array.isArray(snapshot.omitted) &&
    snapshot.omitted.every(isValidSnapshotOmission) &&
    typeof snapshot.truncated === "boolean"
  );
}

function showSnapshotError(message) {
  currentSnapshot = null;
  attachContextButton.disabled = true;

  snapshotStatusElement.textContent = message;
  snapshotStatusElement.className = "error";
  snapshotResultElement.hidden = true;
}

function showProjectSnapshot(snapshot) {
  if (!isValidProjectSnapshot(snapshot)) {
    showSnapshotError("Native host returned invalid snapshot data.");
    return;
  }

  currentSnapshot = snapshot;

  const contentBytes = snapshot.files.reduce(
    (total, file) => total + file.size,
    0
  );

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

  attachmentStatusElement.textContent =
    "Write your request in ChatGPT, then attach this context.";
  attachmentStatusElement.className = "muted";

  attachContextButton.disabled = false;
  snapshotResultElement.hidden = false;
}

function buildProjectContext(snapshot) {
  const gitStatus =
    snapshot.gitStatus.length === 0
      ? "(clean working tree)"
      : snapshot.gitStatus.join("\n");

  const gitDiff =
    snapshot.gitDiff.trim() === ""
      ? "(no tracked changes)"
      : snapshot.gitDiff;

  const files = snapshot.files.map((file) => {
    return [
      `===== FILE: ${file.path} =====`,
      `Size: ${file.size} bytes`,
      "",
      file.content,
      `===== END FILE: ${file.path} =====`
    ].join("\n");
  });

  const omissions =
    snapshot.omitted.length === 0
      ? "(none)"
      : snapshot.omitted
          .map(
            (omission) =>
              `- ${omission.path}: ${omission.reason}`
          )
          .join("\n");

  return [
    "Gem Bridge local project snapshot",
    `Workspace: ${snapshot.workspace}`,
    `Branch: ${snapshot.branch || "(detached or unavailable)"}`,
    `Truncated: ${snapshot.truncated}`,
    "",
    "Git status:",
    gitStatus,
    "",
    "Git diff:",
    gitDiff,
    "",
    "Included files:",
    files.length === 0 ? "(none)" : files.join("\n\n"),
    "",
    "Omitted entries:",
    omissions
  ].join("\n");
}

async function loadProjectSnapshot() {
  currentSnapshot = null;
  snapshotButton.disabled = true;
  attachContextButton.disabled = true;

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

async function attachProjectContext() {
  if (!currentSnapshot) {
    attachmentStatusElement.textContent =
      "Load a project snapshot before attaching context.";
    attachmentStatusElement.className = "error";
    return;
  }

  snapshotButton.disabled = true;
  attachContextButton.disabled = true;

  attachmentStatusElement.textContent =
    "Preparing project context in ChatGPT...";
  attachmentStatusElement.className = "warning";

  try {
    const contextText = buildProjectContext(currentSnapshot);

    const response = await withTimeout(
      sendRuntimeMessage({
        type: "gemExtension.attachProjectContext",
        contextText
      }),
      20_000,
      "Timed out after 20 seconds while attaching project context in ChatGPT. Review the composer before trying again."
    );

    if (!response || response.success !== true) {
      throw new Error(
        response?.error ?? "Project context could not be attached."
      );
    }

    attachmentStatusElement.textContent =
      "Project context prepared. Review the message before sending.";
    attachmentStatusElement.className = "success";
  } catch (error) {
    attachmentStatusElement.textContent =
      `Unable to attach context: ${
        error instanceof Error ? error.message : String(error)
      }`;
    attachmentStatusElement.className = "error";
  } finally {
    snapshotButton.disabled = false;
    attachContextButton.disabled = false;
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
attachContextButton.addEventListener("click", attachProjectContext);

checkBackgroundStatus();
checkNativeStatus();
