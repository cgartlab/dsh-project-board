/**
 * Keyboard combo model: `alt+KeyW` style strings built from `KeyboardEvent.code` plus the
 * modifier flags, so shortcuts survive layouts and IME state.
 */

/** Structural event shape: native KeyboardEvent, React synthetic event and the test shim all fit. */
export interface KeyEventLike {
  ctrlKey?: boolean;
  metaKey?: boolean;
  altKey?: boolean;
  shiftKey?: boolean;
  code?: string;
  key?: string;
  keyCode?: number;
  isComposing?: boolean;
  nativeEvent?: { isComposing?: boolean };
}

/** Our stored combo ("alt+KeyK") as a binding comparable with ctx.shortcuts entries. */
export interface ShortcutBinding {
  code: string;
  secondCode?: string;
  modifiers: string[];
}

export function comboFromEvent(event: KeyEventLike): string {
  const parts: string[] = [];
  if (event.ctrlKey) parts.push('ctrl');
  if (event.metaKey) parts.push('meta');
  if (event.altKey) parts.push('alt');
  if (event.shiftKey) parts.push('shift');
  const code = typeof event.code === 'string' ? event.code : '';
  if (!code) return '';
  if (/^(Control|Alt|Shift|Meta)(Left|Right)$/.test(code)) return '';
  return parts.concat(code).join('+');
}

export function comboDisplay(combo: string | undefined): string {
  if (!combo) return '';
  const parts = String(combo).split('+');
  const code = parts.pop() as string;
  let label = code;
  if (/^Key[A-Z]$/.test(code)) label = code.slice(3);
  else if (/^Digit[0-9]$/.test(code)) label = code.slice(5);
  else if (code === 'Comma') label = ',';
  else if (code === 'Period') label = '.';
  else if (code === 'Space') label = 'Space';
  else if (code === 'ArrowUp') label = '↑';
  else if (code === 'ArrowDown') label = '↓';
  const mods: string[] = parts.map((part) => (part === 'ctrl' ? 'Ctrl' : part === 'meta' ? 'Meta' : part === 'alt' ? 'Alt' : 'Shift'));
  return mods.concat(label).join('+');
}

export function comboHasModifier(combo: string | undefined): boolean {
  const parts = String(combo || '').split('+');
  return parts.includes('ctrl') || parts.includes('alt') || parts.includes('meta');
}

export function matchCombo(event: KeyEventLike, combo: string | undefined): boolean {
  return Boolean(combo) && comboFromEvent(event) === combo;
}

export function isComposingEvent(event: KeyEventLike | null | undefined): boolean {
  if (!event) return false;
  if (event.isComposing === true || event.keyCode === 229) return true;
  return Boolean(event.nativeEvent && event.nativeEvent.isComposing === true);
}

export function comboBindingOf(combo: string | undefined): ShortcutBinding | null {
  const parts = String(combo || '').split('+');
  const code = parts.pop();
  if (!code || !/^[A-Za-z][A-Za-z0-9]*$/.test(code)) return null;
  return { code: code, modifiers: parts.map((part) => (part === 'ctrl' ? 'control' : part)) };
}

/** Same modifiers and at least one shared non-modifier key (a single key also collides with a chord). */
export function bindingsOverlap(left: ShortcutBinding | null | undefined, right: ShortcutBinding | null | undefined): boolean {
  if (!left || !right) return false;
  const modsLeft = left.modifiers.slice().sort().join('+');
  const modsRight = right.modifiers.slice().sort().join('+');
  if (modsLeft !== modsRight) return false;
  const leftCodes = [left.code, left.secondCode].filter(Boolean) as string[];
  const rightCodes = [right.code, right.secondCode].filter(Boolean) as string[];
  return leftCodes.some((code) => rightCodes.indexOf(code) >= 0);
}
