# Contributing

Thanks for taking a look at `dsh-tac`. This is a single-file DSH client
plugin; keep changes focused and verify them against a running harness.

## Development loop

1. Clone the repository next to your DSH profile and install it as a local bundle:
   `plugin_manager install_bundle target="<path to this repository>"`.
2. Edit `client.js`; the harness reloads client plugins with the app reload
   (`Ctrl+R` in the desktop app).
3. Run the repository checks before committing:

   ```bash
   node scripts/check-bundle.cjs
   node scripts/check-i18n.cjs
   node --test test/load.test.cjs
   node --check client.js
   ```

   All of them also run in CI on every push and pull request.

## Rules of thumb

- Every user-visible string needs a `zh` and an `en` entry in `client.js`; the i18n check
  fails on a missing side.
- Use theme tokens (`--dsw-alias-*`) for color; do not hard-code colors.
- New shortcuts must go through `DEFAULT_SETTINGS.shortcuts`, appear in
  `SHORTCUT_LABEL_KEYS`, the settings recorder, and the README tables.
- Respect `prefers-reduced-motion` for any animation.
- Never create session IDs or touch session records; the plugin only reads status through
  public client services.
- Keep the bundle dependency-free at runtime; `index.js` stays a no-op host half.

## Commit style

Short imperative subjects, English or Chinese, with a scoped prefix where useful
(`feat:`, `fix:`, `docs:`, `chore:`). Include what changed and why in the body for fixes.

## Bug reports

Open an issue with the DSH version, OS, the shortcut involved, and the expected versus the
observed behavior. A screenshot of the conversation area helps.
