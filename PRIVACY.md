# Gem Extension Privacy Policy

[Leia em português brasileiro](./PRIVACY.pt-br.md)

## Document status

- Related project: **Gem Bridge**
- Component: **Gem Extension**
- Status: **initial draft for local development**
- Language of this version: **English**

This document describes the planned privacy principles for Gem Extension.

Gem Extension is still in the early architecture and development stage. This policy should evolve with the project before any public distribution.

## 1. Core principle

Gem Extension should follow the **local-first** principle.

This means the extension should exist to connect the user's browser to the local Gem Bridge daemon without creating a project-operated remote service for collecting, storing, or processing user data.

## 2. Data collection by the project

By default, the Gem Extension project should not operate its own data-collection server.

The extension should not send data to Gem Bridge or Gem Extension project servers unless a future feature is created, documented, and explicitly approved by the user.

## 3. Local data

The extension may handle local data during operation, including:

- file names inside the authorized workspace;
- file content returned by the Gem Bridge daemon;
- tool outputs such as `gitStatus` and `gitDiff`;
- daemon error messages;
- extension session state;
- user preferences;
- local audit logs, if implemented.

This data should remain local by default.

## 4. Sending content to AI assistants

Gem Extension may help send local context to an AI assistant selected by the user, such as ChatGPT or Gemini.

This must not happen invisibly.

Core rule:

```text
No local content should be automatically sent to an AI without user visibility and approval.
```

The user should be able to review, cancel, or edit the content before sending, especially when the content comes from local files, Git diffs, logs, or daemon responses.

## 5. Native Messaging

Gem Extension may use Native Messaging to communicate with the local Gem Bridge daemon.

This communication should only be used to send structured requests and receive structured responses from the daemon.

The Gem Bridge daemon remains responsible for enforcing the workspace security boundary, blocking unsafe paths, and rejecting unsupported operations.

## 6. Authorized workspace

The extension must not treat the whole computer as accessible.

Local operations should be restricted to the authorized workspace configured in Gem Bridge.

The daemon must reject:

- absolute paths;
- path traversal;
- symlink escapes;
- paths outside the workspace;
- arbitrary shell commands;
- sensitive operations without explicit rules.

## 7. Experimental multi-agent mode

The multi-agent mode, such as an orchestrated conversation between Maya and Gaia, should be treated as experimental.

This mode should remain:

- disabled by default;
- protected by a feature flag;
- limited by mandatory `maxTurns`;
- visible in the Spectator UI;
- interruptible through pause and kill switch;
- dependent on human approval for sending local content.

## 8. Local storage

The extension may use browser local or session storage to store:

- preferences;
- feature flags;
- session state;
- connected tab IDs;
- `maxTurns`;
- local logs;
- approval records.

This data should be minimal and focused on extension operation.

## 9. Permissions

The extension should request only necessary permissions.

Broad permissions should be avoided.

The initial preference is to use specific host permissions, such as:

```json
{
  "host_permissions": [
    "https://chatgpt.com/*",
    "https://gemini.google.com/*"
  ]
}
```

Each permission should have a documented justification.

## 10. User control

Gem Extension should provide clear controls for the user:

- connect or disconnect the daemon;
- approve or deny tool calls;
- pause assisted flows;
- trigger a kill switch;
- review content before sending;
- disable experimental features.

## 11. Future changes

This policy should be updated whenever the extension starts handling new data types, new domains, new sending flows, or new automation capabilities.

Before any public distribution, this policy should be reviewed and aligned with the extension's actual behavior.
