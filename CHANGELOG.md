# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.3] - 2026-11-05

### Changed

- On macOS every user-visible shortcut label now uses the host symbols `⌥` (Option), `⌃`,
  `⇧` and `⌘` instead of `Alt` / `Ctrl` / `Shift` / `Meta`; Windows/Linux labels are
  unchanged.
- Settings help text and both READMEs name the Option and Command keys explicitly (with
  their Windows equivalents), and the shortcut tables use macOS notation.
- Modifier labels now follow DSH's canonical order (control → alt → shift → meta), so a
  chord recorded in any order displays as `⌥+⌘+,` on macOS / `Ctrl+Meta+…` on Windows.

### Notes

- Bindings stay platform-neutral: `alt` is the physical Option key's `altKey` on macOS, so
  saved shortcuts and DSH built-in conflict checks need no migration.
- Compatibility verified against a copy of the full desktop profile stack (8 bundles,
  including the experimental agent-team / auto-review / session-search / ralph /
  plugin-market bundles): the plugin layer composes cleanly, no startup shortcut-conflict
  warning appears, the board renders with 16 sessions, and the browser reports no errors.

### Added

- Load tests cover macOS vs Windows shortcut labels and assert the stored bindings did not
  change.

## [1.0.2] - 2026-11-05

### Fixed

- The status capsule's tooltip now names the board shortcuts it actually responds to
  (`Alt+N / Alt+B / Alt+V`); it previously showed the previous/next-session bindings.
- The floating HUD keeps clear of an open right sidebar: it is positioned over the
  conversation column instead of covering the project board.
- Dragging the HUD no longer overrides a later "default position" choice; picking
  top-right/bottom-right takes effect without a reload.
- The responsive board renders at its wide layout again after being disabled and
  re-enabled from settings instead of staying compact.
- Settings migration keeps per-button header customisations (hidden/side/order) instead
  of resetting the whole header-button table.
- A pending system-notification permission no longer swallows the alert: the in-app card
  is shown while permission is requested, and the system channel is used once granted.
- Archiving a session reports a host rejection (`ok: false`) as a failure instead of
  pretending it succeeded, matching the rename/delete paths.
- Hold-to-scroll release, blur and Escape listeners are registered with the plugin
  lifecycle, so a reload no longer stacks duplicate handlers.
- IME composition (including keyCode 229) no longer triggers board shortcuts.
- "Steer queued message" no longer falls back to clicking an unrelated trailing button
  when the steer button cannot be identified.
- Session grouping now follows the project table's sort order instead of raw workspace
  order.
- Shortcut-conflict repair can move a duplicate onto another free default when its natural
  fallback is already taken.
- A turn that fails no longer reports "Task complete": when the visible session shows
  DSH's turn-error row, the notifier reports "Task failed" instead, after giving the
  error row a moment to mount.
- Hold-to-scroll and scroll-to-bottom now drive DSH's virtualised `ChatViewport` instead
  of raw `scrollTop`, which the transcript view reverts; continuous up/down scrolling and
  older-page prefetch work on the current DSH build.
- Previous/next-instruction navigation falls back to DSH turn navigation when the
  virtualised transcript exposes no user-message rows.
- The session actions dialog now offers **Stop turn** (`remote.session.cancel`), so a
  running or waiting turn can be stopped before archiving.
- Previous/next-instruction taps now resolve the reading-line turn (and treat the tail as
  the latest turn), so they land on the intended instruction and page in older history
  when the target turn is not loaded yet.
- Approval notifications now show the request's localized reason instead of
  `[object Object]`.
- Completion notifications also consult a resident session's `lastAgentError` /
  `promptError` snapshot when available, so a failed background turn is less likely to be
  announced as complete.
- Failure notifications now include the available error text (from the transcript error
  row or the session snapshot) instead of only "failed this turn".

### Changed

- Dropped the now-unused `nav.cycle` dictionary key from both locales.
- Notification-dock positioning only runs its polling while a notification is visible.
- Board/native-sidebar helper calls now guard the optional `sidebarRight` and `layout`
  APIs instead of failing silently.

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
