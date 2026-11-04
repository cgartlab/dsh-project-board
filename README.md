# dsh-project-board

A [DeepSeek Harness](https://deepseek.com) client plugin that adds a project/session task board, a floating session HUD, keyboard-first session navigation, and task notifications — all rendered inside the Harness Web UI.

## Features

- **Project board** — Notion-style session and project database views with search, status/type/project filters, grouping, multi-column sorting, per-project color and icon, and archive-aware session rows. Opens in DSH's native right sidebar at narrow (380 px), medium (50 vw), or fullscreen presentation, and toggles closed with the same key.
- **Floating session HUD** — live active/recent sessions with elapsed timers, attention badges, automation markers, drag-to-move, and an animated pill ⇄ list collapse.
- **Search palette** — fuzzy session search with project scoping, keyboard navigation, and jump-to-session.
- **Keyboard-first workflow** — every shortcut is configurable in Settings → 项目看板设置:
  - `Alt+K` search sessions
  - `Alt+I` / `Alt+,` previous / next session
  - `Alt+U` / `Alt+M` previous / next user instruction — tap to jump, hold to smooth-scroll the conversation; older history loads automatically while scrolling up
  - `Alt+S` scroll to bottom and focus the composer
  - `Alt+D` session actions dialog (archive / delete where the client supports it / cancel a running turn)
  - `Alt+N` / `Alt+B` / `Alt+V` open or close the board at narrow / medium / fullscreen
  - `Alt+R` rename the current session
  - `Alt+E` collapse / expand the floating session list
  - `Alt+Enter` steer the earliest queued message into the running turn
- **Task notifications** — when a session finishes a turn, or starts waiting for an answer or a permission, the plugin shows an in-app card at the bottom-right of the conversation (with a chime) or a system notification when the app is in the background. Questions and permission requests include the full question text and every option.
- **Shortcut conflict detection** — recording a combination already used by this plugin or by a built-in DSH command is rejected inline; saved conflicts are reported at startup and in Settings.

## Requirements

- DeepSeek Harness desktop or web build with client plugin support (`dsh-client-ui-sidebar`, `dsh-client-ui-workspace`, `dsh-client-ui-session`).
- The bundle is installed as a local link; it is not published to npm.

## Install

From the DSH profile that should load the plugin:

```powershell
plugin_manager install_bundle target="<this repository>"
```

The plugin is a DSH client bundle: `package.json` exposes `dsh.bundle.patch` and `dsh.client`, and injects into `conversation.header.leading`, `conversation.session.header.utilities`, `conversation.composer.dock`, `shell.overlay`, and `settings.section`.

## Files

- `client.js` — the whole client UI (React through DSH's client module loader)
- `index.js` — host half (no-op; all behavior is client-side)
- `cordis.patch.yml` — bundle insertion
- `locale/` — zh/en trailer strings
- `LICENSE` — CC BY-NC-SA 4.0

## License

Licensed under [Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International](https://creativecommons.org/licenses/by-nc-sa/4.0/) — the same license as [cgartlab.com](https://cgartlab.com).

Copyright (c) 2025-2026 CGArtLab.
