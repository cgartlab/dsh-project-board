/**
 * Bundle entry. The harness injects this script and calls
 * `window.__ModuleLoader__.load({ id, factory })`; the factory receives the host's
 * `require` so React comes from the shell instead of a bundled copy.
 */
import { MODULE_ID } from './constants';
import { apply, INJECT } from './apply';
import type { HostContext } from './host';
import { bindReact, type ReactRuntime } from './runtime';

interface ModuleLoaderSpec {
  id: string;
  factory(require: (id: string) => unknown): { inject: string[]; apply(ctx: HostContext): void };
}

declare global {
  interface Window {
    __ModuleLoader__?: { load(spec: ModuleLoaderSpec): void };
  }
}

const loader = window.__ModuleLoader__;
if (!loader || typeof loader.load !== 'function') throw new Error('dsh-tac: window.__ModuleLoader__ is missing');

loader.load({
  id: MODULE_ID,
  factory(require) {
    bindReact(require('react') as ReactRuntime);
    return { inject: INJECT, apply };
  }
});
