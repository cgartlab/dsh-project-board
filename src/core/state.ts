/** Module-level flags shared across components (shortcut gating, chat jumps, header drags). */

export const shortcutState = { suppressed: false };

export const chatJumpState = {
  loading: false,
  lastTarget: null as Element | null,
  lastAt: 0
};

let suppressHeaderClickUntil = 0;

export function suppressHeaderClicks(ms: number): void {
  suppressHeaderClickUntil = Date.now() + ms;
}

export function headerClickBlocked(): boolean {
  return Date.now() < suppressHeaderClickUntil;
}
