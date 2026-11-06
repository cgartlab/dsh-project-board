/** Per-project color and icon overrides, plus the small text/colour utilities they need. */
import { STORE_KEY } from '../constants';

export interface AppearanceEntry {
  color?: string;
  icon?: string;
}

export type AppearanceMap = Record<string, AppearanceEntry>;

export function loadAppearance(): AppearanceMap {
  try {
    const raw = window.localStorage.getItem(STORE_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? (parsed as AppearanceMap) : {};
  } catch (error) {
    return {};
  }
}

export function saveAppearance(value: AppearanceMap): void {
  try {
    window.localStorage.setItem(STORE_KEY, JSON.stringify(value));
  } catch (error) {
    /* ignore */
  }
}

export const PALETTE = ['#e5484d', '#f76b15', '#f5b301', '#30a46c', '#0ea5e9', '#3e63dd', '#8e4ec6', '#e93d82', '#6e7781'];
export const ICONS = ['folder', 'code', 'briefcase', 'pen', 'flask', 'star', 'bolt', 'book', 'globe', 'grid'];

/** Measure rendered text so the floating list can shrink/grow to the longest session title. */
let hudMeasureCanvas: HTMLCanvasElement | null = null;
export function measureTextWidth(text: string, font?: string): number {
  try {
    if (!hudMeasureCanvas) hudMeasureCanvas = document.createElement('canvas');
    const ctx = hudMeasureCanvas.getContext('2d');
    if (!ctx) return String(text || '').length * 7;
    if (font) ctx.font = font;
    return ctx.measureText(String(text || '')).width;
  } catch (error) {
    return String(text || '').length * 7;
  }
}

export function hashString(value: string): number {
  let hash = 0;
  const text = String(value);
  for (let i = 0; i < text.length; i += 1) hash = (hash * 31 + text.charCodeAt(i)) >>> 0;
  return hash;
}

export function paletteFor(id: string): string {
  return PALETTE[hashString(id) % PALETTE.length];
}

export function hexToRgba(hex: string, alpha: number): string {
  const value = String(hex).replace('#', '');
  const full = value.length === 3 ? value.split('').map((c) => c + c).join('') : value;
  const num = parseInt(full, 16);
  if (Number.isNaN(num)) return 'rgba(110,119,129,' + alpha + ')';
  return 'rgba(' + ((num >> 16) & 255) + ',' + ((num >> 8) & 255) + ',' + (num & 255) + ',' + alpha + ')';
}
