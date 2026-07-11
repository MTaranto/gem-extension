# Gem Bridge Extension

[Leia em português brasileiro](./README.pt-br.md)

Gem Bridge Extension is the browser extension companion for Gem Bridge.

Its goal is to provide a controlled bridge between browser-based AI assistants and the local Gem Bridge daemon through Native Messaging.

The extension is designed around these principles:

- **Local-first integration**: local files and development tools remain handled by the local daemon.
- **User control**: sensitive actions must be visible, auditable, and approved by the user.
- **Minimal permissions**: browser permissions should stay as narrow as possible.
- **Safe orchestration**: experimental multi-agent workflows must remain feature-flagged and human-supervised.

## Current Stage

This project is in the initial planning and scaffolding stage.

The first milestone is to validate communication between:

```text
browser extension
    ↓
background service worker
    ↓
Native Messaging
    ↓
Gem Bridge daemon
```

The experimental multi-agent workflow is not part of the first MVP.

## Documentation

- [Architecture](./docs/GEM_EXTENSION_ARCHITECTURE.md)
- [Privacy Policy](./PRIVACY.md)
- [Brazilian Portuguese Architecture](./docs/GEM_EXTENSION_ARCHITECTURE.pt-br.md)
- [Brazilian Portuguese Privacy Policy](./PRIVACY.pt-br.md)

## Planned Structure

```text
gem-extension/
├── background/
├── content/
│   └── providers/
├── docs/
├── native_messaging/
│   ├── chrome/
│   └── firefox/
├── popup/
├── shared/
├── manifest.chrome.json
├── manifest.firefox.json
├── PRIVACY.md
├── PRIVACY.pt-br.md
├── README.md
└── README.pt-br.md
```

## Development Strategy

The project should evolve incrementally.

Recommended first milestones:

1. Scaffold the repository structure.
2. Add browser manifests for development.
3. Validate the extension popup.
4. Validate background service worker messaging.
5. Validate Native Messaging with a minimal local host.
6. Connect to the Gem Bridge daemon or a dedicated wrapper.
7. Add provider adapters only after the local bridge is stable.
8. Keep the multi-agent workflow experimental and disabled by default.

## Security Position

Gem Bridge Extension must be treated as a high-privilege local development tool.

The extension should not:

- Request broad browser permissions without clear need.
- Read local files directly.
- Send local file contents to AI services without user approval.
- Trigger local tool calls silently.
- Expose arbitrary shell execution.
- Enable experimental multi-agent automation by default.

The local daemon remains responsible for workspace validation and tool execution. The extension is responsible for user interaction, browser orchestration, and transport to the native host.

## License

This project is currently under active development. A license will be added before the first public release.
