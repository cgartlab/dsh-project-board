/** JSON clone and localStorage helpers shared by settings, appearance and HUD state. */

export function cloneJson<T>(value: T): T {
  try {
    return JSON.parse(JSON.stringify(value)) as T;
  } catch (error) {
    return value;
  }
}

/** Read a JSON object from localStorage; anything non-object (or unparseable) falls back. */
export function loadJson<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    const value: unknown = JSON.parse(raw);
    return value && typeof value === 'object' ? (value as T) : fallback;
  } catch (error) {
    return fallback;
  }
}

export function saveJson(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    /* storage may be unavailable or full: never break a feature for it */
  }
}
