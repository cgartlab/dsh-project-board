# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.2] - 2026-11-05

### Fixed

- The status capsule's tooltip now names the board shortcuts it actually responds to
  (`Alt+N / Alt+B / Alt+V`); it previously showed the previous/next-session bindings.

### Changed

- Dropped the now-unused `nav.cycle` dictionary key from both locales.

## [1.0.1] - 2026-11-05

### Fixed

- `Alt+S` now returns to the bottom of the conversation reliably: it presses the chat
  view's own "back to bottom" control and then pins the bottom position across animation
  frames, instead of a single smooth `scrollTo` that the chat view reverted.
- Saved settings that still carried the old overlapping defaults (scroll-to-bottom and the
  session actions dialog both on `Alt+D`) are repaired once on load: each shortcut keeps a
  single owner and falls back to its current default when it was the duplicate.
- The scroll-to-bottom helper no longer mistakes the plugin's own composer button for the
  chat view's native control.

## [1.0.0] - 2026-11-05

### Added

- Global project/session board rendered in DSH's native right sidebar, with session and
  project database views, search, status/type/project filters, grouping, multi-column
  sorting, and per-project color and icon.
- Board presentations: narrow (380 px), medium (50 vw) and native fullscreen, opened and
  closed from a single shortcut per width.
- Floating session HUD with live timers, attention/automation markers, recent-session
  rows, drag-to-move, and an animated pill/list collapse.
- Search palette with keyboard navigation, project scoping and jump-to-session.
- Keyboard-first session workflow: previous/next session, rename, session actions dialog
  (archive, cancel a running turn), steer the earliest queued message, and
  previous/next user-instruction jumps with hold-to-scroll.
- Smooth hold-to-scroll conversation engine that prefetches older history one screen
  before the boundary, keeps scrolling while history loads, re-resolves the live scroll
  container, and falls back to anchor stepping when position writes are reverted.
- Task notifications: in-app cards at the bottom-right of the conversation with a chime,
  system notifications when the app is in the background, and full question/option text
  for model questions and permission requests.
- Shortcut conflict detection against the built-in DSH command catalog, with startup scan
  and settings feedback.
- Settings page covering shortcuts, board, HUD, header buttons and notifications.

### Security

- No credentials or secrets are stored in this repository; client-side settings live in
  the DSH profile and localStorage only.

[1.0.0]: https://github.com/cgartlab/dsh-project-board/releases/tag/v1.0.0
