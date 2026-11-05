# dsh-project-board

[![check](https://github.com/cgartlab/dsh-project-board/actions/workflows/check.yml/badge.svg)](https://github.com/cgartlab/dsh-project-board/actions/workflows/check.yml)
[![license: CC BY-NC-SA 4.0](https://img.shields.io/badge/license-CC%20BY--NC--SA%204.0-lightgrey.svg)](https://creativecommons.org/licenses/by-nc-sa/4.0/)

English | [中文](README.zh.md)

A [DeepSeek Harness](https://deepseek.com) client plugin that turns the harness into a
project-aware workspace: a global project/session board in the native right sidebar, a
floating session HUD, keyboard-first session navigation, hold-to-scroll conversation
reading, and desktop-class task notifications.

## Features

- **Project board** — session and project database views with search, status/type/project
  filters, grouping, multi-column sorting, archive-aware rows, and per-project color and
  icon. Opens at narrow (380 px), medium (50 vw) or native fullscreen; the same key closes it.
  The pane's open state and size belong to the workspace, not to each conversation:
  switching sessions only switches the conversation and never re-opens, closes or resizes
  the board.
- **Floating session HUD** — live active/recent sessions with timers, attention badges,
  automation markers, drag-to-move, and an animated pill ⇄ list collapse. One stable order:
  active sessions first, most recent activity first within a group; switching sessions
  highlights the new row without reshuffling the list, and `Alt+I` / `Alt+,` cycle in
  exactly that order.
- **Search palette** — fuzzy session search, project scoping, keyboard navigation and
  jump-to-session.
- **Hold-to-scroll reading** — the conversation scrolls smoothly while the key is held,
  loads older history automatically before reaching the boundary, and falls back to anchor
  stepping if the chat view reverts a position write. Holding `Alt+M` down to the end
  activates the composer so a reply can be typed immediately.
- **Task notifications** — a session finishing a turn, waiting for an answer, or asking
  for permission raises an in-app card at the bottom-right of the conversation with a
  chime; when the app is in the background a system notification carries the full question
  text and every option.
- **Conflict-aware shortcuts** — recording a combination already used by this plugin or by
  a built-in DSH command is rejected inline, and saved conflicts are reported at startup.
- **Logs & diagnostics** — optional local logs (error / warn / info / debug) with a bounded ring buffer, copy and clear actions in settings, startup checks for shortcut collisions with built-in commands, and captured window errors and rejected promises.

## Keyboard shortcuts

Every shortcut is configurable in **Settings → 项目看板设置**. Defaults:

| Shortcut | Action |
| --- | --- |
| `Alt+K` | Open / close session search — inside, `Alt+I` / `Alt+,` / `↑` / `↓` move the selection, `Enter` opens it |
| `Alt+I` / `Alt+,` | Previous / next session |
| `Alt+U` / `Alt+M` | Previous / next user instruction (tap to jump, hold to scroll) |
| `Alt+S` | Scroll to bottom and focus the composer |
| `Alt+D` | Session actions dialog (archive, cancel a running turn, delete where supported) |
| `Alt+N` / `Alt+B` / `Alt+V` | Board at narrow / medium / fullscreen; same key closes |
| `Alt+R` | Rename the current session |
| `Alt+E` | Collapse / expand the floating session list |
| `Alt+Enter` | Steer the earliest queued message into the running turn |

## Requirements

- A DeepSeek Harness build with client plugin support and the client packages
  `dsh-client-ui-sidebar`, `dsh-client-ui-workspace`, and `dsh-client-ui-session`.
- Node.js 18+ only for repository checks; the plugin itself is loaded by the harness.

## Install

The bundle is installed as a local link, not from npm:

```powershell
plugin_manager install_bundle target="<this repository>"
```

`package.json` exposes `dsh.bundle.patch` and `dsh.client`; the plugin injects into
`conversation.header.leading`, `conversation.session.header.utilities`,
`conversation.composer.dock`, `shell.overlay`, and `settings.section`.

## How it is built

The plugin is a single client bundle (`client.js`) loaded through the harness client module
loader, using only public client services (`ctx.slot`, `ctx.sidebarRight`, `ctx.layout`,
`ctx.get('workspaces')`, session status stores) and React from the host. It ships with no
runtime dependencies of its own; host-half `index.js` is intentionally a no-op.

- `client.js` — all UI: board, HUD, palette, shortcuts, notifications, settings page
- `index.js` — host half (no-op)
- `cordis.patch.yml` — bundle insertion
- `locale/` — zh/en trailer strings
- `scripts/` — manifest, syntax and i18n checks used locally and in CI
- `docs/architecture.md` — slot map, state, keyboard and notification internals

## Known limitations

- Session deletion depends on the client contract; this build of DeepSeek Harness only
  exposes archive and turn cancellation, so the session dialog disables delete and points
  to archive instead.
- Archiving a session that is still running is rejected by the host; the dialog surfaces
  the error rather than forcing it.
- System notifications follow the OS/browser notification permission and the harness
  WebView autoplay policy for the chime.
- The plugin targets the current client slot and service surface; a harness update that
  renames those slots would need a matching plugin update.

## Development

```bash
node scripts/check-bundle.cjs   # manifest, exports, syntax
node scripts/check-i18n.cjs     # zh/en dictionary parity (direct and indirect keys)
node --test test/load.test.cjs  # bundle loads and mounts against stubbed host services
```

All of them run in CI on every push and pull request (`.github/workflows/check.yml`).

## License

Licensed under [Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International](https://creativecommons.org/licenses/by-nc-sa/4.0/),
the same license as [cgartlab.com](https://cgartlab.com).

Copyright (c) 2025-2026 CGArtLab.

