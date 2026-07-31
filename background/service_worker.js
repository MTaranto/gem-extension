importScripts("native_client.js");

const runtimeApi = globalThis.browser?.runtime ?? globalThis.chrome.runtime;
const CHATGPT_ADAPTER_REGISTRATION_KEY =
  "chatgptAdapterRegistration";

runtimeApi.onInstalled.addListener(() => {
  console.info("Gem Bridge Extension installed.");
});

function isChatGPTUrl(url) {
  return (
    typeof url === "string" &&
    (
      url.startsWith("https://chatgpt.com/") ||
      url.startsWith("https://chat.openai.com/")
    )
  );
}

function getSessionStorage(key) {
  return new Promise((resolve, reject) => {
    globalThis.chrome.storage.session.get(key, (result) => {
      const lastError = globalThis.chrome.runtime.lastError;

      if (lastError) {
        reject(new Error(lastError.message));
        return;
      }

      resolve(result[key]);
    });
  });
}

function setSessionStorage(key, value) {
  return new Promise((resolve, reject) => {
    globalThis.chrome.storage.session.set({ [key]: value }, () => {
      const lastError = globalThis.chrome.runtime.lastError;

      if (lastError) {
        reject(new Error(lastError.message));
        return;
      }

      resolve();
    });
  });
}

function removeSessionStorage(key) {
  return new Promise((resolve, reject) => {
    globalThis.chrome.storage.session.remove(key, () => {
      const lastError = globalThis.chrome.runtime.lastError;

      if (lastError) {
        reject(new Error(lastError.message));
        return;
      }

      resolve();
    });
  });
}

async function registerChatGPTAdapter(message, sender) {
  if (
    !Number.isInteger(sender.tab?.id) ||
    !Number.isInteger(sender.tab?.windowId) ||
    !isChatGPTUrl(sender.url) ||
    (
      typeof sender.origin === "string" &&
      !isChatGPTUrl(`${sender.origin}/`)
    )
  ) {
    throw new Error(
      "ChatGPT adapter registration came from an invalid sender."
    );
  }

  const registration = {
    declared: {
      runtimeId:
        typeof message.runtimeId === "string" ? message.runtimeId : null,
      url: typeof message.url === "string" ? message.url : null,
      timeOrigin:
        typeof message.timeOrigin === "number" ? message.timeOrigin : null
    },
    sender: {
      tabId: sender.tab.id,
      windowId: sender.tab.windowId,
      frameId: Number.isInteger(sender.frameId) ? sender.frameId : null,
      documentId:
        typeof sender.documentId === "string" ? sender.documentId : null,
      url: sender.url,
      origin: typeof sender.origin === "string" ? sender.origin : null
    },
    registeredAt: new Date().toISOString()
  };

  await setSessionStorage(
    CHATGPT_ADAPTER_REGISTRATION_KEY,
    registration
  );

  console.info("ChatGPT adapter registered.", {
    runtimeId: runtimeApi.id,
    tabId: registration.sender.tabId,
    windowId: registration.sender.windowId,
    frameId: registration.sender.frameId,
    documentId: registration.sender.documentId,
    url: registration.sender.url,
    registeredAt: registration.registeredAt
  });

  return registration;
}

function isSameRegistration(left, right) {
  return (
    left?.registeredAt === right?.registeredAt &&
    left?.sender?.tabId === right?.sender?.tabId &&
    left?.sender?.documentId === right?.sender?.documentId
  );
}

async function removeRegistrationIfCurrent(registration) {
  const currentRegistration = await getSessionStorage(
    CHATGPT_ADAPTER_REGISTRATION_KEY
  );

  if (isSameRegistration(currentRegistration, registration)) {
    await removeSessionStorage(CHATGPT_ADAPTER_REGISTRATION_KEY);
  }
}

async function requireRegisteredChatGPTAdapter() {
  const registration = await getSessionStorage(
    CHATGPT_ADAPTER_REGISTRATION_KEY
  );

  if (!registration) {
    throw new Error(
      "No active ChatGPT adapter is registered. Reload the ChatGPT page."
    );
  }

  if (
    !Number.isInteger(registration.sender?.tabId) ||
    !isChatGPTUrl(registration.sender?.url) ||
    (
      typeof registration.sender?.origin === "string" &&
      !isChatGPTUrl(`${registration.sender.origin}/`)
    )
  ) {
    await removeRegistrationIfCurrent(registration);
    throw new Error(
      "The saved ChatGPT adapter registration is invalid. " +
      "Reload the ChatGPT page."
    );
  }

  return registration;
}

function sendMessageToRegisteredAdapter(registration, message) {
  const options =
    typeof registration.sender.documentId === "string" &&
    registration.sender.documentId !== ""
      ? { documentId: registration.sender.documentId }
      : Number.isInteger(registration.sender.frameId)
        ? { frameId: registration.sender.frameId }
        : {};

  return new Promise((resolve, reject) => {
    globalThis.chrome.tabs.sendMessage(
      registration.sender.tabId,
      message,
      options,
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

async function requireActiveChatGPTAdapter() {
  const registration = await requireRegisteredChatGPTAdapter();

  let pingResponse;

  try {
    pingResponse = await sendMessageToRegisteredAdapter(registration, {
      type: "gemExtension.chatgptAdapterPing"
    });
  } catch (error) {
    await removeRegistrationIfCurrent(registration);
    throw new Error(
      "The registered ChatGPT document no longer exists. " +
      "Reload the ChatGPT page. " +
      `Browser error: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }

  if (
    !pingResponse ||
    pingResponse.success !== true ||
    pingResponse.adapter !== "chatgpt"
  ) {
    throw new Error(
      `ChatGPT adapter returned an invalid diagnostic response ` +
      `in tab ${registration.sender.tabId}.`
    );
  }

  if (!isChatGPTUrl(pingResponse.url)) {
    throw new Error(
      `The adapter responded from an unexpected page. ` +
      `Tab ID: ${registration.sender.tabId}. ` +
      `URL: ${pingResponse.url ?? "unavailable"}.`
    );
  }

  return {
    registration,
    adapter: pingResponse
  };
}

async function attachProjectContext(contextText) {
  if (typeof contextText !== "string" || contextText.trim() === "") {
    throw new Error("Project context is required.");
  }

  const diagnostic = await requireActiveChatGPTAdapter();

  if (!diagnostic.adapter.composerFound) {
    throw new Error(
      `ChatGPT adapter is active in tab ` +
      `${diagnostic.registration.sender.tabId}, ` +
      `but the message composer was not found.`
    );
  }

  let response;

  try {
    response = await sendMessageToRegisteredAdapter(
      diagnostic.registration,
      {
        type: "gemExtension.attachProjectContext",
        contextText
      }
    );
  } catch (error) {
    await removeRegistrationIfCurrent(diagnostic.registration);
    throw new Error(
      "The registered ChatGPT document no longer exists. " +
      "Reload the ChatGPT page. " +
      `Browser error: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }

  if (!response || response.success !== true) {
    throw new Error(
      response?.error ??
        "The ChatGPT adapter could not prepare the project context."
    );
  }

  return {
    ...response,
    tabId: diagnostic.registration.sender.tabId,
    tabUrl: diagnostic.registration.sender.url
  };
}

runtimeApi.onMessage.addListener((message, sender, sendResponse) => {
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

  if (message.type === "gemExtension.chatgptAdapterReady") {
    registerChatGPTAdapter(message, sender)
      .then((registration) => {
        sendResponse({
          success: true,
          registeredAt: registration.registeredAt
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

  if (message.type === "gemExtension.readFile") {
    globalThis.GemNativeClient.readFile(message.path)
      .then((response) => {
        sendResponse(response);
      })
      .catch((error) => {
        sendResponse({
          success: false,
          error: error instanceof Error ? error.message : String(error)
        });
      });

    return true;
  }

  if (message.type === "gemExtension.projectSnapshot") {
    globalThis.GemNativeClient.projectSnapshot()
      .then((response) => {
        sendResponse(response);
      })
      .catch((error) => {
        sendResponse({
          success: false,
          error: error instanceof Error ? error.message : String(error)
        });
      });

    return true;
  }

  if (message.type === "gemExtension.attachProjectContext") {
    attachProjectContext(message.contextText)
      .then((response) => {
        sendResponse(response);
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
