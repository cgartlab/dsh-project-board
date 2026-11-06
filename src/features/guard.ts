/**
 * Keeps the board pane's open/closed state across session switches.
 *
 * The native right sidebar stores that state per session; here a switch only changes the
 * conversation and the pane stays exactly as the user left it.
 */
import type { UseHook } from '../host';
import { useEffect, useMemo, useRef } from '../runtime';
import { logEvent } from '../core/log';
import { fallbackHook } from '../core/schedule';
import type { SessionListSnapshot } from './board';

export interface BoardState {
  open: boolean;
  mode: string | null;
}

export interface BoardSessionGuardProps {
  useSessions?: UseHook<SessionListSnapshot>;
  boardStateNow: () => BoardState;
  setBoardState: (state: BoardState) => void;
  intentRecent?: () => boolean;
}

interface GuardState {
  id: string | null;
  state: BoardState;
  settleUntil: number;
}

export function BoardSessionGuard(props: BoardSessionGuardProps): unknown {
  const useSessions = typeof props.useSessions === 'function' ? props.useSessions : fallbackHook<SessionListSnapshot>();
  const snapshot = useSessions((value) => value);
  const byId = (snapshot && snapshot.byId) || {};
  const currentId = useMemo(() => {
    for (const id of Object.keys(byId)) {
      const row = byId[id];
      if (row && row.retainedBy && (row.retainedBy.mainView || 0) > 0) return id;
    }
    return null;
  }, [byId]);
  const stateRef = useRef<GuardState>({ id: null, state: { open: false, mode: null }, settleUntil: 0 });
  const propsRef = useRef(props);
  propsRef.current = props;
  const sameState = (left: BoardState | null | undefined, right: BoardState | null | undefined): boolean => {
    const a = left || { open: false, mode: null };
    const b = right || { open: false, mode: null };
    return Boolean(a.open) === Boolean(b.open) && (!a.open || a.mode === b.mode);
  };

  useEffect(() => {
    if (!currentId) return undefined;
    const api = propsRef.current;
    const previous = stateRef.current;
    if (previous.id === currentId) return undefined;
    const want = previous.id === null ? api.boardStateNow() : previous.state;
    stateRef.current = { id: currentId, state: want, settleUntil: Date.now() + 3000 };
    if (previous.id === null) return undefined;
    let attempts = 0;
    let enforceTimer = 0;
    const enforce = (): void => {
      const live = propsRef.current;
      if (typeof live.intentRecent === 'function' && live.intentRecent()) {
        stateRef.current = { id: currentId, state: live.boardStateNow(), settleUntil: Date.now() + 500 };
        return;
      }
      if (sameState(live.boardStateNow(), want)) {
        stateRef.current = { id: currentId, state: want, settleUntil: Date.now() + 500 };
        return;
      }
      attempts += 1;
      if (attempts === 1) logEvent('info', 'board', 'restore after switch', want as unknown as Record<string, unknown>);
      live.setBoardState(want);
      if (attempts < 20) enforceTimer = window.setTimeout(enforce, 120);
    };
    enforceTimer = window.setTimeout(enforce, 60);
    return () => window.clearTimeout(enforceTimer);
  }, [currentId]);

  /* Refresh the remembered state from real user toggles while the session is stable. */
  useEffect(() => {
    const timer = window.setInterval(() => {
      const current = stateRef.current;
      if (Date.now() < current.settleUntil) return;
      const live = propsRef.current;
      if (!live || typeof live.boardStateNow !== 'function') return;
      stateRef.current = { id: current.id, state: live.boardStateNow(), settleUntil: current.settleUntil };
    }, 450);
    return () => window.clearInterval(timer);
  }, []);
  return null;
}
