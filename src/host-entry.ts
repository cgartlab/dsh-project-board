/**
 * Host half of the dsh-tac bundle. Everything the plugin does happens in the browser
 * client (see src/index.ts); the host entry exists only because the bundle contract
 * requires one, so it stays a deliberate no-op.
 */
export function apply(): void {}
