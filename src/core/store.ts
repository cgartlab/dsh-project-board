/** The plugin's tiny observable store: a shallow snapshot plus subscribe/set/toggle. */
import type { UiStore } from '../types';

export function createUiStore<T extends object>(initial: T): UiStore<T> {
  let snapshot: T = initial;
  const listeners = new Set<() => void>();
  const emit = (): void => {
    for (const listener of listeners) {
      try {
        listener();
      } catch (error) {
        /* ignore */
      }
    }
  };
  return {
    getSnapshot: () => snapshot,
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    set: (patch: Partial<T>) => {
      snapshot = Object.assign({}, snapshot, patch);
      emit();
    },
    toggle: (key: keyof T & string) => {
      snapshot = Object.assign({}, snapshot, { [key]: !(snapshot as Record<string, unknown>)[key] } as Partial<T>);
      emit();
    }
  };
}
