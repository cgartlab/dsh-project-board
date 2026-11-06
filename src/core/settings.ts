/**
 * Settings model: shipped defaults, merge/migration from whatever is stored, and persistence.
 * The merge is deliberately forgiving — a stored section is overlaid on the defaults key by
 * key, so a settings file written by an older build keeps working.
 */
import { DEFAULT_SETTINGS, SETTINGS_KEY } from '../constants';
import type { Settings, ShortcutMap } from '../types';
import { comboHasModifier } from './combos';
import { cloneJson, loadJson, saveJson } from './json';

type RawSettings = Partial<Record<keyof Settings, unknown>> & Record<string, unknown>;

export function mergeSettings(base: Settings, raw: unknown): Settings {
  const out = cloneJson(base);
  if (raw && typeof raw === 'object') {
    const stored = raw as RawSettings;
    for (const key of Object.keys(base) as (keyof Settings)[]) {
      const value = stored[key];
      if (value && typeof value === 'object') {
        Object.assign(out[key] as unknown as Record<string, unknown>, value as Record<string, unknown>);
      }
    }
    if (stored.headerButtons && typeof stored.headerButtons === 'object') {
      const buttons = stored.headerButtons as Record<string, Partial<Settings['headerButtons'][string]>>;
      for (const id of Object.keys(DEFAULT_SETTINGS.headerButtons)) {
        out.headerButtons[id] = Object.assign({}, DEFAULT_SETTINGS.headerButtons[id], buttons[id] || {});
      }
    }
    const migratingButtons = stored.headerButtonsVersion !== 3;
    if (migratingButtons) {
      out.headerButtons = cloneJson(DEFAULT_SETTINGS.headerButtons);
      const header = stored.header as { capsule?: boolean } | undefined;
      if (header && header.capsule === false) out.headerButtons.capsule.hidden = true;
    }
    if (stored.hintsVersion !== 1) out.hints = cloneJson(DEFAULT_SETTINGS.hints);
    if (stored.boardProjVersion !== 1) {
      out.board.defaultView = 'projects';
      out.board.boardProjVersion = 1;
    }
    for (const key of Object.keys(DEFAULT_SETTINGS.shortcuts) as (keyof ShortcutMap)[]) {
      if (!comboHasModifier(out.shortcuts[key])) out.shortcuts[key] = DEFAULT_SETTINGS.shortcuts[key];
    }
    if (stored.shortcutsVersion !== 1) out.shortcuts = healShortcutConflicts(out.shortcuts);
  }
  return out;
}

/** Older builds shipped overlapping defaults (scroll-to-bottom and the session menu both on
 *  Alt+D); repaired saved settings keep one owner per combination. */
export function healShortcutConflicts(shortcuts: ShortcutMap): ShortcutMap {
  const defaults = DEFAULT_SETTINGS.shortcuts;
  const owners = new Map<string, string[]>();
  for (const action of Object.keys(defaults) as (keyof ShortcutMap)[]) {
    const combo = shortcuts[action];
    if (!owners.has(combo)) owners.set(combo, [action]);
    else owners.get(combo)!.push(action);
  }
  for (const [combo, actions] of owners) {
    if (actions.length < 2) continue;
    const winner = actions.find((name) => defaults[name as keyof ShortcutMap] === combo) || actions[0];
    for (const action of actions) {
      if (action === winner) continue;
      const fallback = defaults[action as keyof ShortcutMap];
      const taken = Array.from(owners.keys()).includes(fallback) && fallback !== combo;
      if (!taken) {
        shortcuts[action as keyof ShortcutMap] = fallback;
        owners.set(fallback, [action]);
      }
    }
  }
  return shortcuts;
}

export function loadSettings(): Settings {
  const raw = loadJson<RawSettings | null>(SETTINGS_KEY, null);
  const merged = mergeSettings(DEFAULT_SETTINGS, raw);
  if (
    raw &&
    typeof raw === 'object' &&
    (raw.headerButtonsVersion !== 3 || raw.hintsVersion !== 1 || raw.shortcutsVersion !== 1 || raw.boardProjVersion !== 1)
  ) {
    try {
      persistSettings(merged);
    } catch (error) {
      /* ignore */
    }
  }
  return merged;
}

export function persistSettings(value: Settings): void {
  saveJson(SETTINGS_KEY, value);
}
