# Architecture

`dsh-project-board` is a DSH **client bundle**: `package.json` points at
`cordis.patch.yml`, which inserts the package into the harness profile. The host half
(`index.js`) is intentionally a no-op; everything runs in the browser client through the
harness client module loader.

## Entry points

```js
window.__ModuleLoader__.load({
  id: '@local/dsh-project-board',
  factory(require) { /* ... */ }
});
```

The factory returns `{ inject, apply }`. `inject` lists the client services the plugin
needs (`slots`, `locale`, `uiWorkspace`, `remote`, `remote.session`, `remote.schedule`,
`remote.agentPresets`, `sidebarRight`, `sidebarRightTabs`, `layout`); `apply(ctx)` wires
dictionaries, styles and slot registrations.

## Slots used

| Slot | Purpose |
| --- | --- |
| `sidebar.panellist` | board icon in the native right-sidebar tab strip |
| `sidebar.right.pane.tab` | full board pane inside the right sidebar |
| `main` | standalone board page (`project-board`) |
| `conversation.header.leading` | session search / history controls / status capsule |
| `conversation.session.header.utilities` | board shortcut buttons next to the session header |
| `conversation.composer.dock` | shortcut hint bar and composer-side buttons |
| `shell.overlay` | palette, rename dialog, session actions, HUD, toasts, notification dock |
| `settings.section` | 项目看板设置 settings page |

## State

- Settings: a small observable store persisted to `localStorage` under a namespaced key,
  merged with `DEFAULT_SETTINGS` on load.
- HUD state: collapse flag, saved position and per-session timers in `localStorage`.
- Appearance: per-workspace color/icon overrides in `localStorage`.
- Everything else is derived from live client services: `useSessions`,
  `useSessionStatus`, `useWorkspaces`, `useSettings`, the schedule projection and the
  focus store.

No session IDs are created or mutated. The plugin never writes to the session store; it
only reads status and toggles native sidebar presentation.

## Board pane state

DSH's right sidebar stores its open/closed state per session. The board is meant to be a
workspace-level tool, so `BoardSessionGuard` (a `shell.overlay` watcher) remembers the pane
state before a switch and restores it after the new session's state lands. An explicit
board shortcut within a second of the switch marks intent, and the guard then leaves the
pane alone.

## Keyboard handling

A single capture-phase `keydown` listener on `document` resolves the configured combo for
each action (see `DEFAULT_SETTINGS.shortcuts`). It is registered on mount and gated on:

- IME composition and key auto-repeat;
- an open dialog (`aria-modal="true"` present);
- an open command palette.

Hold-to-scroll (`Alt+U` / `Alt+M`) starts a `requestAnimationFrame` loop that resolves the
live chat scroller each frame, prefetches older history when approaching the top, and
falls back to anchor scrolling when a position write is reverted by the chat view. It
sends one synthetic wheel signal before the first write because DSH can hold a preserved
scroll anchor that would otherwise pull the view back every frame, and holding down to the
bottom focuses the composer.

## Notifications

A `shell.overlay` watcher diffs session status maps between renders:

- `pendingInteraction` appearing (question, plan review, approval) → question/permission
  notification with the full question text and all options;
- `running` true → false without a pending interaction → completion notification.

When the document is focused and visible the watcher pushes an in-app card (bottom-right of
the conversation area) and plays a WebAudio chime; otherwise it uses the system
`Notification` API, falling back to the in-app card when unavailable.

## Checks

- `scripts/check-bundle.cjs` — manifest, exports and syntax.
- `scripts/check-i18n.cjs` — dictionary parity for direct and indirect keys.
- `test/load.test.cjs` — evaluates `client.js` with stubbed DOM/React/host services,
  asserts `apply()` mounts every slot and that both dictionaries match.
