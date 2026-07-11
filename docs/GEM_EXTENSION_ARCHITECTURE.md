# Gem Extension Architecture — V2

[Leia em português brasileiro](./GEM_EXTENSION_ARCHITECTURE.pt-br.md)

## Document status

- Related project: **Gem Bridge**
- Component: **Gem Extension**
- Architecture version: **V2**
- Status: **initial technical draft**
- Language of this version: **English**

This document describes the proposed architecture for **Gem Extension**, the browser extension intended to provide controlled communication between browser-based AI assistants and the local **Gem Bridge** daemon.

V2 refines the initial proposal by clearly separating the core daemon-supporting extension from the experimental multi-agent orchestration layer.

---

## 1. Executive overview

Gem Extension is the browser bridge of the Gem Bridge ecosystem.

Its primary goal is to let an AI assistant running in a browser tab request controlled operations from the local Gem Bridge daemon without receiving unrestricted access to the user's machine.

The extension should behave as a **safe control cockpit**, not as invisible automation.

The architecture separates two axes:

1. **Primary axis: safe local integration**
   - Communication between extension and daemon through Native Messaging.
   - Structured requests to Gem Bridge tools.
   - Visible responses, errors, and approval prompts.
   - Preservation of Gem Bridge's security-first model.

2. **Experimental axis: multi-agent orchestration**
   - Coordination between two AI tabs, such as ChatGPT and Gemini.
   - Capture of one AI's final response.
   - Preparation or injection of that response into the other AI.
   - Turn control, `maxTurns`, pause, resume, and human intervention.
   - Spectator panel for live auditability.

The multi-agent layer is experimental. It should depend on the secure extension core, but it should not block the essential browser-to-daemon bridge.

---

## 2. Product decision: name

The provisional name **Gem Extension** is technically good and fits the Gem Bridge ecosystem.

It communicates that the extension is part of the Gem family and is a dependency of the browser-to-daemon workflow.

Current recommendation:

```text
Internal technical name: gem-extension
Repository name: gem-extension
Initial public name: Gem Extension
Possible future commercial name: Gem Bridge Extension
```

### Rationale

`gem-extension` is short, simple, and useful for repositories, folders, commands, and technical documentation.

`Gem Bridge Extension` is better for public communication because it makes the relationship to Gem Bridge explicit.

Recommended strategy:

- Use **gem-extension** in code, repository names, and package-level documentation.
- Use **Gem Bridge Extension** in README files, public pages, and presentation material.

---

## 3. Repository decision

The recommendation is to keep Gem Extension in a **separate repository** from Gem Bridge.

```text
gem-bridge        -> local daemon in Go
gem-extension     -> browser extension in JavaScript/TypeScript
```

### Why separate them

Gem Bridge and Gem Extension have different lifecycles.

The daemon is a local Go binary focused on filesystem access, Git, controlled commands, workspace safety, and local execution security.

The extension is a browser project involving Manifest V3, content scripts, background service workers, permissions, DOM integration, Native Messaging, packaging, and cross-browser compatibility.

Separate repositories keep:

- cleaner Git history;
- simpler CI;
- more focused issues and milestones;
- independent versioning;
- future publishing workflows cleaner;
- better conceptual separation between daemon and extension.

### What should be shared

Even with separate repositories, both projects should share their contract and integration documentation.

Future options:

```text
gem-protocol/                -> message specification, schemas, examples
docs/integration/            -> cross-project integration documentation
shared JSON schemas          -> protocol versioning
```

At the initial stage, it is enough to duplicate a small protocol document in both repositories and keep the contract simple.

---

## 4. Relationship with the current Gem Bridge

Gem Extension can start being drafted now.

Gem Bridge does not need to be complete first, but it needs stable direction in three areas:

1. **Request and response format**
   - The extension needs to know how to send tool calls.
   - The daemon needs to return structured JSON.

2. **Transport mode**
   - The current Gem Bridge is CLI-based.
   - Native Messaging requires reading and writing framed messages through `stdin` and `stdout`.
   - This means a native mode or wrapper will be needed.

3. **Security model**
   - The extension must not bypass daemon rules.
   - Every sensitive operation must still be validated by Gem Bridge.

### Practical recommendation

Starting Gem Extension in parallel is a good decision, as long as the first MVP is small.

The first goal should not be fully automatic Maya-to-Gaia conversation.

The first goal should be:

```text
extension popup
    ↓
Native Messaging message
    ↓
gem-bridge or native wrapper
    ↓
JSON response
    ↓
popup displays result
```

This validates the local tunnel before AI tab automation is introduced.

---

## 5. V2 scope

V2 divides scope into three layers.

### 5.1 Required layer: Browser-to-Daemon Bridge

This is the main reason for the extension.

Responsibilities:

- Register the extension in the browser.
- Connect to the Gem Bridge native host.
- Send structured requests.
- Receive structured responses.
- Display connection, execution, and permission errors.
- Route responses back to the extension UI.
- Never access the filesystem directly.

### 5.2 Assistive layer: AI tab integration

Responsibilities:

- Detect supported pages such as ChatGPT and Gemini.
- Capture generated assistant responses.
- Prepare prompts enriched with local context.
- Allow the user to inject text into the prompt field.
- Prefer human review before automatic submission.

### 5.3 Experimental layer: multi-agent orchestration

Responsibilities:

- Register two participant tabs.
- Track which AI speaks in each turn.
- Apply `maxTurns`.
- Pause, resume, and intervene.
- Show transcript and logs in the Spectator panel.
- Require approval for tool calls.

This layer should be feature-flagged from the beginning.

```text
experimental.multiAgent = false by default
```

---

## 6. Proposed topology

```text
Browser AI tab
    ↓ content script / provider adapter
Gem Extension background service worker
    ↓ native messaging client
Gem Bridge native host mode or wrapper
    ↓ internal tools
Authorized workspace
```

For multi-agent mode:

```text
AI tab A
    ↓ provider adapter A
background orchestrator
    ↓ provider adapter B
AI tab B

Spectator UI observes and controls the loop.
```

---

## 7. Main components

### 7.1 Background service worker

Responsibilities:

- Route messages between popup, content scripts, and native host.
- Control the current session.
- Perform initial message validation.
- Track pending tool calls.
- Communicate with Native Messaging.
- Persist critical state in storage.
- Coordinate multi-agent mode.

Important: the service worker must not rely only on global variables for critical state, because the browser may terminate an idle worker.

Recommended state:

```text
chrome.storage.session or browser.storage.session:
  sessionId
  activeWorkspaceLabel
  connectedTabs
  debateState
  currentTurn
  maxTurns
  pendingMessage
  pendingApproval
  transcriptSummary
```

Acceptable volatile state:

```text
nativePort
lastHeartbeatAt
observerDebounceTimers
currentlyProcessingMessage
```

### 7.2 Native client

Encapsulates Native Messaging communication.

Expected functions:

```text
connectNativeHost()
disconnectNativeHost()
sendToolRequest(request)
handleNativeResponse(response)
handleDisconnect(error)
```

The extension should not know filesystem, Git, or command details. It only sends structured messages to the daemon.

### 7.3 Router

Routes internal messages.

Examples:

```text
popup -> background -> native host
content script -> background -> approval flow
background -> content script -> inject prompt
background -> spectator ui -> update state
```

### 7.4 Provider adapters

Each supported AI provider should have its own adapter.

```text
content/providers/chatgpt_adapter.js
content/providers/gemini_adapter.js
content/providers/base_adapter.js
```

Minimum provider adapter contract:

```text
detectPage()
isGenerating()
getLastAssistantMessage()
injectPrompt(text)
submitPrompt()
focusPrompt()
```

Rationale: pages like ChatGPT and Gemini can change DOM structure, classes, buttons, and internal layout. Isolating provider adapters reduces damage when a provider changes its interface.

### 7.5 Spectator UI

Spectator UI is a human control layer.

Functions:

- Show daemon connection status.
- Show the current tab/AI.
- Show current turn.
- Show `maxTurns`.
- Show pending tool calls.
- Show summarized logs.
- Pause debate.
- Resume debate.
- Intervene with human instruction.
- End session.
- Require approval before sensitive operations.

Spectator UI is not just visual decoration. It is part of the security model.

---

## 8. Message protocol

### 8.1 Internal extension message

```json
{
  "type": "tool.request",
  "requestId": "uuid",
  "source": "popup|content|spectator|orchestrator",
  "payload": {
    "tool": "readFile",
    "args": {
      "path": "README.md"
    }
  }
}
```

### 8.2 Tool call from an AI

The extension must not accept arbitrary JSON found in AI-generated text.

Tool calls must use an explicit envelope:

```json
{
  "gemBridgeToolCall": true,
  "version": 1,
  "requestId": "uuid",
  "tool": "readFile",
  "args": {
    "path": "README.md"
  },
  "reason": "Need to inspect the project README before answering.",
  "requiresApproval": true
}
```

Rules:

- Schema must be validated.
- Tool name must be allowlisted.
- Paths are still validated by the daemon.
- Tool calls coming from AI content should require approval at the beginning of the project.
- Tool calls hidden in file content, diffs, or previous responses must not run automatically.

### 8.3 Daemon response

```json
{
  "requestId": "uuid",
  "success": true,
  "data": "..."
}
```

Error:

```json
{
  "requestId": "uuid",
  "success": false,
  "error": "access outside the workspace is blocked"
}
```

---

## 9. Native Messaging

Native Messaging is the preferred transport for secure communication between the extension and Gem Bridge.

The native host must use `stdio` and JSON messages with browser-specific length framing.

The current Gem Bridge is a CLI prototype that receives JSON as an argument. For Native Messaging, there are two options:

### Option A: native mode inside Gem Bridge

```bash
gem-bridge native-host --workspace /path/to/project
```

Advantages:

- Fewer binaries.
- Less duplication.
- Direct protocol support inside the main project.

Disadvantages:

- Mixes Native Messaging transport into the main binary.
- Requires care to preserve CLI simplicity.

### Option B: native wrapper

```text
gem-bridge-native-host
    ↓
reads Native Messaging
    ↓
calls Gem Bridge core internally
    ↓
returns Native Messaging response
```

Advantages:

- Keeps CLI simple.
- Isolates browser protocol details.
- Makes native host-specific tests easier.

Disadvantages:

- Adds another binary or entrypoint.
- Adds packaging work.

### Recommended decision

Start with a small wrapper or subcommand while keeping the core decoupled.

Long-term, request/response and dispatching should be extracted into reusable internal packages:

```text
internal/protocol
internal/dispatcher
internal/transport/native
```

---

## 10. Security

The extension should follow the same philosophy as Gem Bridge: all AI-originated input is untrusted.

### Mandatory rules

- Do not execute arbitrary shell commands.
- Do not accept free-form commands from AI.
- Do not treat absolute paths as valid.
- Do not trust JSON found in AI responses without an envelope and validation.
- Do not send a tool call to the daemon without a valid schema.
- Do not automatically inject content into another AI without respecting pause, limits, and session state.
- Do not grant broad permissions unless necessary.
- Do not use host permissions like `*://*.google.com/*` when specific domains are enough.

### Initially recommended permissions

```json
{
  "permissions": ["nativeMessaging", "storage"],
  "host_permissions": [
    "https://chatgpt.com/*",
    "https://gemini.google.com/*"
  ]
}
```

The `scripting` permission should only be added if programmatic script injection is actually needed.

The `activeTab` permission can be useful for manual actions, but it does not replace host permissions when automatic content scripts are used.

---

## 11. Browser-specific manifests

The extension should not assume that a single manifest will be perfect for Chrome, Brave, Edge, and Firefox.

Recommended strategy:

```text
manifest.chrome.json
manifest.firefox.json
```

Or:

```text
manifest.base.json
scripts/build-manifest.js
```

Expected differences:

- Chrome uses `allowed_origins` in the native host manifest.
- Firefox uses `allowed_extensions`.
- Firefox requires an explicit ID through `browser_specific_settings.gecko.id`.
- Native host manifest installation directories vary by browser and operating system.

---

## 12. Recommended directory structure

```text
gem-extension/
  README.md
  README.pt-br.md
  manifest.chrome.json
  manifest.firefox.json
  package.json

  docs/
    ARCHITECTURE.md
    ARCHITECTURE.pt-br.md
    SECURITY_MODEL.md
    SECURITY_MODEL.pt-br.md
    PROTOCOL.md
    PROTOCOL.pt-br.md

  background/
    service_worker.js
    native_client.js
    router.js
    state_store.js
    approvals.js
    orchestrator.js

  content/
    main.js
    spectator_ui.js
    spectator_ui.css

  content/providers/
    base_adapter.js
    chatgpt_adapter.js
    gemini_adapter.js

  popup/
    index.html
    popup.js
    popup.css

  shared/
    constants.js
    message_types.js
    tool_protocol.js
    validation.js

  native_messaging/
    chrome/
      com.gembridge.daemon.json
    firefox/
      com.gembridge.daemon.json

  tests/
    unit/
    fixtures/
```

---


## 13. Distribution, store review, and local installation strategy

Gem Extension must be treated as a **high-privilege extension**, even when its purpose is legitimate and local-first.

The main risk is not Native Messaging itself, because Native Messaging is an official browser extension capability. The risk comes from the combination of:

- mediated access to local files;
- automation or injection in AI web pages;
- the possibility of sending local content to third-party AI services selected by the user;
- overly broad browser permissions;
- tool calls executed without explicit approval;
- invisible behavior that is difficult to audit.

For that reason, the extension MVP should prioritize local development/unpacked installation. Store publication should not be an initial goal.

### 13.1 MVP strategy

For the MVP, the extension should be installed locally by the developer without relying on the Chrome Web Store, Firefox Add-ons, or any other store.

MVP goals:

- validate the extension ⇄ daemon tunnel;
- validate native host registration;
- validate the message protocol;
- validate logs, errors, and approval flows;
- keep permissions minimal;
- avoid automatic multi-agent automation at the beginning.

The first MVP should prove that the extension can call Gem Bridge locally and safely before attempting to automate AI tabs.

### 13.2 Future store review strategy

Before any public store submission, the project must explicitly document:

- why the extension needs each permission;
- which domains it accesses;
- how the user authorizes local daemon access;
- how the workspace limits file access;
- whether local content may be sent to external services;
- which actions require human approval;
- how to disable the extension, the daemon, and the experimental mode.

The public description must not imply that an AI has direct access to the user's computer. The correct description is that the user operates a local, controlled, auditable bridge restricted to an authorized workspace.

### 13.3 Minimal permissions

The extension should avoid broad permissions such as:

```json
"host_permissions": ["*://*/*"]
```

The initial preference should be specific domains:

```json
"host_permissions": [
  "https://chatgpt.com/*",
  "https://gemini.google.com/*"
]
```

Permissions such as `nativeMessaging`, `storage`, `tabs`, `activeTab`, or `scripting` should be added only when there is a clear and documented need.

### 13.4 Multi-agent mode as an experimental feature

The Maya ⇄ Gaia mode should be considered experimental and should remain:

- disabled by default;
- protected by a feature flag;
- limited by mandatory `maxTurns`;
- visible in the Spectator UI;
- interruptible through pause and kill switch;
- recorded in a local transcript;
- dependent on human approval for any local-content transfer.

The extension must never automatically send local file content to an AI without making the action visible and approved by the user.

### 13.5 Local installation

Development should assume local extension installation:

- Chromium/Chrome/Brave: developer mode and unpacked folder loading.
- Firefox: temporary installation through `about:debugging` during development.

This strategy reduces store dependency during the research phase, avoids premature blocking, and allows the security model to mature before any public distribution.

### 13.6 Additional documentation required before distribution

Before public distribution, the project should include at least:

```text
README.md
SECURITY_MODEL.md
PRIVACY.md
GEM_EXTENSION_ARCHITECTURE.md
```

The privacy policy must clearly state that the project does not operate its own data-collection server, that the daemon runs locally, and that local content should only be sent to an AI after user action or approval.

## 14. Incremental roadmap

### MVP 1 — extension talks to native host

Goal:

```text
popup -> background -> Native Messaging -> daemon/wrapper -> popup
```

Done criteria:

- Popup button sends a test request.
- Native host returns JSON.
- Errors are readable.
- Connection logs are visible.

### MVP 2 — real `readFile` call

Goal:

```text
popup requests README.md
Gem Bridge reads file inside workspace
popup displays response
```

Done criteria:

- `readFile` works.
- Unsafe path errors are displayed.
- Large responses are handled with limits.

### MVP 3 — manual injection into one AI tab

Goal:

```text
user chooses tab
extension prepares prompt
user reviews it
extension injects into prompt field
user submits manually
```

Done criteria:

- ChatGPT or Gemini adapter works in isolation.
- The extension does not submit automatically without the user.

### MVP 4 — response capture

Goal:

```text
content script detects final response
extracts text
shows it in Spectator UI
```

Done criteria:

- Observer detects generation completion with reasonable stability.
- Basic transcript is maintained.

### MVP 5 — semi-automatic relay between two AIs

Goal:

```text
AI A responds
user approves sending to AI B
extension injects
user submits or authorizes submission
```

Done criteria:

- Two tabs are registered.
- Session state is persisted.
- Pause and intervention work.

### MVP 6 — controlled experimental debate

Goal:

```text
AI A <-> AI B with maxTurns, pause, resume, intervene
```

Done criteria:

- `maxTurns` is mandatory.
- Auto-pause happens when the limit is reached.
- Kill switch is available.
- Tool calls require approval.
- Transcript can be exported.

---

## 15. Non-goals for V2

At this stage, Gem Extension should not:

- automate unlimited AI-to-AI submission;
- execute tool calls without approval;
- bypass the Gem Bridge security model;
- accept arbitrary shell commands;
- try to support many AI providers at once;
- promise full compatibility with every provider DOM change;
- store secrets in plaintext;
- scrape broadly outside explicitly supported pages;
- operate outside authorized domains.

---

## 16. Long-term vision

The long-term vision is to turn Gem Extension into a secure local orchestration interface.

```text
User
    ↓
Gem Extension
    ↓
Gem Bridge
    ↓
authorized workspace
```

And in experimental mode:

```text
Maya
    ↓
Gem Extension Spectator + Orchestrator
    ↓
Gaia
    ↓
Gem Extension
    ↓
Maya
```

The key idea is that the user remains in command.

The extension must not give unrestricted autonomy to AI agents. It should give the user a cockpit for orchestrating AIs with controlled, auditable, and reversible local access.

---

## 17. Technical references

- Chrome Native Messaging documentation: https://developer.chrome.com/docs/extensions/develop/concepts/native-messaging
- Firefox Native Messaging documentation: https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Native_messaging
- Chrome extension service worker lifecycle: https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/lifecycle
- Chrome content scripts documentation: https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts
- Chrome extension permissions documentation: https://developer.chrome.com/docs/extensions/develop/concepts/declare-permissions
