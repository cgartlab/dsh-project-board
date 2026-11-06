/**
 * React runtime handed in by the host module loader.
 *
 * The host owns the React copy, so the bundle never imports React directly: the loader's
 * `require('react')` result is bound once when the factory runs, and every module uses the
 * live bindings exported here. Type-only imports keep the bundle from depending on React at
 * build time.
 */

export interface ReactRuntime {
  createElement: (type: unknown, props?: Record<string, unknown> | null, ...children: unknown[]) => unknown;
  useState: <T>(initial: T | (() => T)) => [T, (next: T | ((previous: T) => T)) => void];
  useEffect: (effect: () => void | (() => void), deps?: readonly unknown[]) => void;
  useLayoutEffect?: (effect: () => void | (() => void), deps?: readonly unknown[]) => void;
  useMemo: <T>(factory: () => T, deps?: readonly unknown[]) => T;
  useRef: <T>(value: T) => { current: T };
}

export interface ReactElement {
  readonly type: unknown;
  readonly props: unknown;
}

export let h!: ReactRuntime['createElement'];
export let useState!: ReactRuntime['useState'];
export let useEffect!: ReactRuntime['useEffect'];
export let useMemo!: ReactRuntime['useMemo'];
export let useRef!: ReactRuntime['useRef'];
/** `useLayoutEffect` when the host copy has it, so layout reads stay synchronous. */
export let useLayoutEffectSafe!: ReactRuntime['useEffect'];

export function bindReact(react: ReactRuntime): void {
  if (!react || typeof react.createElement !== 'function') throw new Error('dsh-tac: the host did not provide React');
  h = react.createElement;
  useState = react.useState;
  useEffect = react.useEffect;
  useMemo = react.useMemo;
  useRef = react.useRef;
  useLayoutEffectSafe = typeof react.useLayoutEffect === 'function' ? react.useLayoutEffect : react.useEffect;
}
