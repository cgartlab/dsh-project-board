# dsh-project-board

DeepSeek Harness plugin for a project/session task board and quick session switching.

## Features

- Notion-style session and project database views with filtering, grouping, multi-column sorting, and persisted per-project color/icon.
- Header controls for session search, history navigation, scroll-to-bottom, and runtime status.
- Floating HUD for active/recent sessions with configurable display limit and smooth transitions.
- Search palette with keyboard navigation and project scoping.
- Keyboard-first workflow (configurable in Settings → 项目看板设置):
  - `Alt+K` search sessions
  - `Alt+I` / `Alt+,` previous/next session
  - `Alt+U` / `Alt+M` previous/next user instruction
  - `Alt+D` scroll to bottom and focus the composer

## Install locally

```powershell
# from the DSH profile
plugin_manager install_bundle target="D:\github-repos\dsh-project-board"
```

The plugin is a DSH client bundle (`package.json` → `dsh.bundle.patch` + `dsh.client`).
It is developed against the local DSH desktop profile and injects into
`conversation.header.leading`, `conversation.session.header.utilities`,
`conversation.composer.dock`, `shell.overlay`, and `settings.section`.

## Files

- `client.js` — client UI (React via DSH client module loader)
- `index.js` — host half (no-op; all UI behavior is client-side)
- `cordis.patch.yml` — bundle insertion
- `locale/` — zh/en strings
