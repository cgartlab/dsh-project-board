/** DOM-level questions the plugin asks the native shell: dialogs, the sidebar frame, pointers. */

/** Any visible `aria-modal` layer is on screen (the plugin's own palette included). */
export function hasOpenDialog(): boolean {
  try {
    const nodes = document.querySelectorAll('[aria-modal="true"]');
    for (const node of nodes) if (node.getClientRects().length > 0) return true;
  } catch (error) {
    /* ignore */
  }
  return false;
}

/* The plugin's own palette is aria-modal too, but it owns its keys: it must not suppress
   Alt+K (close) or Alt+I / Alt+, (move). Only real dialogs block shortcuts. */
export function hasBlockingDialog(): boolean {
  try {
    const nodes = document.querySelectorAll('[role="dialog"][aria-modal="true"]');
    for (const node of nodes) {
      if (node.getClientRects().length === 0) continue;
      if (node.getAttribute('data-pbx-overlay') === 'palette') continue;
      if (node.closest && node.closest('.pbx-paletteBackdrop')) continue;
      /* Below ~768px DSH renders the native left sidebar as a modal drawer and keeps its own
         toggle alive for exactly that state (`modals: ["sidebar"]` in its shortcut registry).
         Mirror that: the shortcut that opens the sidebar must be able to close it again. */
      if (node.getAttribute('data-shortcut-modal') === 'sidebar') continue;
      return true;
    }
  } catch (error) {
    /* ignore */
  }
  return false;
}

export interface SidebarSignature {
  track: number | null;
  collapsed: boolean;
}

/** The native frame's own view of the left sidebar: the first grid track (its column width)
 *  plus the collapsed flag. Used to prove a toggle actually moved the layout. */
export function sidebarSignature(): SidebarSignature | null {
  try {
    const frame =
      document.querySelector('[class*="_frame"][style*="grid-template-columns"]') || document.querySelector('[data-sidebar-collapsed]');
    if (!frame) return null;
    const template = ((frame as HTMLElement).style && (frame as HTMLElement).style.gridTemplateColumns) || '';
    const first = parseFloat(template);
    return {
      track: Number.isFinite(first) ? Math.round(first) : null,
      collapsed: frame.hasAttribute('data-sidebar-collapsed')
    };
  } catch (error) {
    return null;
  }
}

export interface PointerLike {
  ctrlKey?: boolean;
  button?: number;
  pointerId?: number;
  clientX: number;
  clientY: number;
  screenX?: number;
  currentTarget: EventTarget & { getBoundingClientRect(): DOMRect };
  preventDefault(): void;
  stopPropagation(): void;
}

export function pointerViewX(event: PointerLike): number {
  const screenX = typeof event.screenX === 'number' && event.screenX !== 0 ? event.screenX : event.clientX + window.screenX;
  return screenX - window.screenX;
}

export interface DropPosition {
  side: 'left' | 'right';
  index: number;
}

export function headerDropPosition(id: string, clientX: number): DropPosition {
  const side: 'left' | 'right' = clientX > window.innerWidth * 0.55 ? 'right' : 'left';
  const selector =
    side === 'right' ? '.pbx-navRight .pbx-navItem[data-hb-id]' : '.pbx-nav:not(.pbx-navRight) .pbx-navItem[data-hb-id]';
  let index = 0;
  const nodes = document.querySelectorAll(selector);
  for (const node of nodes) {
    const siblingId = node.getAttribute('data-hb-id');
    if (!siblingId || siblingId === id) continue;
    const rect = node.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) continue;
    if (rect.left + rect.width / 2 < clientX) index += 1;
    else break;
  }
  return { side: side, index: index };
}
