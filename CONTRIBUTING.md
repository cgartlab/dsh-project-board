# Contributing

Thanks for taking a look at `dsh-tac`. The plugin is TypeScript under `src/`, compiled into
`client.js` by esbuild; keep changes focused and verify them against a running harness.

## Development loop

1. Clone the repository next to your DSH profile and install it as a local bundle:
   `plugin_manager install_bundle target="<path to this repository>"`.
2. `npm ci`, then edit the modules under `src/` and run `npm run build` — the harness reloads
   client plugins with the app reload (`Ctrl+R` in the desktop app).
3. Run the repository checks before committing:

   ```bash
   npm run typecheck                 # tsc --noEmit (strict)
   npm run build                     # regenerate client.js and index.js
   npm run check                     # manifest/exports/syntax + i18n parity
   npm test                          # bundle load + shortcut regression suite
   ```

   All of them also run in CI on every push and pull request; CI also fails when the
   committed artifacts do not match `src/`.

## Rules of thumb

- Never edit `client.js` or `index.js` by hand — they are generated from `src/`.
- Every user-visible string needs a `zh` and an `en` entry in `src/i18n/`; the `Dict` type in
  `src/i18n/en.ts` makes a missing or extra key a compile error.
- Use theme tokens (`--dsw-alias-*`) for color; do not hard-code colors.
- New shortcuts must go through `DEFAULT_SETTINGS.shortcuts`, appear in
  `SHORTCUT_LABEL_KEYS`, the settings recorder, and the README tables.
- Respect `prefers-reduced-motion` for any animation.
- Never create session IDs or touch session records; the plugin only reads status through
  public client services.
- Keep the bundle dependency-free at runtime; `src/host-entry.ts` stays a no-op host half.

## Commit style

Short imperative subjects, English or Chinese, with a scoped prefix where useful
(`feat:`, `fix:`, `docs:`, `chore:`). Include what changed and why in the body for fixes.

## Bug reports

Open an issue with the DSH version, OS, the shortcut involved, and the expected versus the
observed behavior. A screenshot of the conversation area helps.
