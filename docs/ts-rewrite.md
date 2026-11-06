# TypeScript rewrite — status

`client.js` at the repository root is still the shipped artifact. The rewrite lives in `src/`
and replaces it only once every module exists, the bundle builds, and the whole test suite
passes against the built file.

## Toolchain

- `tsconfig.json` — `strict`, target ES2022, `noEmit` (type checking only).
- `scripts/build.mjs` — esbuild bundles `src/index.ts` into `client.js` (IIFE, no runtime deps).
- `npm run typecheck` / `npm run build`.

## Design decisions

- **No React import.** The host owns React; `src/runtime.ts` binds the loader's
  `require('react')` once and every module uses the live `h` / `useState` / … exports, so the
  bundle never has a top-level `require`.
- **No JSX.** Components keep the existing `h()` call style, which keeps the diff against the
  legacy implementation reviewable and avoids a JSX factory configuration.
- **Data blocks are lifted verbatim** (`i18n/`, `ui/icon-data.ts`, `styles.ts`) so 240-key
  dictionaries and 400 lines of CSS cannot drift during the port. `en` is typed as
  `Record<keyof typeof zh, string>`, so key parity is now a compile error.

## Module status

| Module | State |
| --- | --- |
| `core/{json,log,store,combos,settings,dom,state,header-drag,schedule}.ts` | ported |
| `i18n/{zh,en}.ts`, `styles.ts`, `ui/{icon-data,icons,appearance}.ts` | ported |
| `features/{format,chat-dom,chat-nav,chat-scroll,interject,board}.ts` | ported |
| `features/header.ts` (HeaderButtons, ShortcutHints) | pending |
| `features/notifications.ts` (ToastStack, watcher, dock, chime) | pending |
| `features/guard.ts` (BoardSessionGuard) | pending |
| `features/palette.ts` | pending |
| `features/hud.ts` (FloatingStatus) | pending |
| `features/dialogs.ts` (rename, session menu) | pending |
| `features/settings.ts` (SettingsPage) | pending |
| `features/responsive-board.ts`, `ui/panel-icon.ts` | pending |
| `apply.ts`, `index.ts` | pending (after the features) |
| `scripts/check-i18n.cjs` → read `src/i18n/*.ts` | pending (with the artifact switch) |

## Acceptance bar for switching the artifact

1. `npx tsc --noEmit` clean.
2. `npm run build` produces `client.js` from `src/`.
3. `npm test` — every existing test still passes against the built bundle.
4. `npm run check` — bundle + i18n checks pass (i18n check pointed at the sources).
5. The plugin hot-reloads in the running GUI and `plugin ready` appears in the in-app log.
