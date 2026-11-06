/** Ctrl + left-drag a top button to the left or right header dock. */
import type { Settings } from '../types';
import { type PointerLike, headerDropPosition, pointerViewX } from './dom';
import { cloneJson } from './json';
import { suppressHeaderClicks } from './state';

export interface HeaderDragState {
  id: string | null;
  side: string | null;
  index: number;
  width: number;
}

export interface HeaderDragStore {
  set(patch: Partial<HeaderDragState>): void;
}

export type SaveSettings = (next: Settings) => void;

export function startHeaderButtonDrag(
  id: string,
  event: PointerLike,
  saveSettings: SaveSettings | null | undefined,
  config: Settings,
  dragStore: HeaderDragStore | null | undefined
): void {
  if (!event.ctrlKey || event.button !== 0) return;
  event.preventDefault();
  event.stopPropagation();
  const source = event.currentTarget as HTMLElement;
  const rect = source.getBoundingClientRect();
  const ghost = source.cloneNode(true) as HTMLElement;
  ghost.classList.add('pbx-dragGhost');
  ghost.setAttribute('aria-hidden', 'true');
  ghost.style.position = 'fixed';
  ghost.style.left = rect.left + 'px';
  ghost.style.top = rect.top + 'px';
  ghost.style.width = rect.width + 'px';
  ghost.style.height = rect.height + 'px';
  ghost.style.pointerEvents = 'none';
  ghost.style.zIndex = '2147483647';
  ghost.style.opacity = '0.85';
  document.body.appendChild(ghost);
  try {
    source.setPointerCapture(event.pointerId as number);
  } catch (error) {
    /* ignore */
  }
  const setDrag = dragStore && typeof dragStore.set === 'function' ? dragStore.set.bind(dragStore) : function (): void {};
  const resetDrag = (): void => setDrag({ id: null, side: null, index: -1, width: 0 });
  const currentSide = (config.headerButtons && config.headerButtons[id] && config.headerButtons[id].side) || 'left';
  ghost.style.display = 'none';
  const startX = event.clientX;
  const startY = event.clientY;
  let moved = false;
  let dragStarted = false;
  let lastSide = currentSide;
  let lastIndex = -1;
  const move = (moveEvent: PointerEvent): void => {
    const dx = moveEvent.clientX - startX;
    const dy = moveEvent.clientY - startY;
    if (Math.abs(dx) + Math.abs(dy) > 4) moved = true;
    ghost.style.left = rect.left + dx + 'px';
    ghost.style.top = rect.top + dy + 'px';
    if (!moved) return;
    if (!dragStarted) {
      dragStarted = true;
      ghost.style.display = '';
      setDrag({ id: id, side: currentSide, index: -1, width: 0 });
      window.requestAnimationFrame(() => setDrag({ width: rect.width }));
    }
    const drop = headerDropPosition(id, pointerViewX(moveEvent as unknown as PointerLike));
    if (drop.side !== lastSide || drop.index !== lastIndex) {
      lastSide = drop.side;
      lastIndex = drop.index;
      setDrag({ side: drop.side, index: drop.index });
    }
  };
  const finish = (upEvent: PointerEvent): void => {
    window.removeEventListener('pointermove', move, true);
    window.removeEventListener('pointerup', finish, true);
    window.removeEventListener('pointercancel', finish, true);
    window.removeEventListener('blur', cancel, true);
    ghost.remove();
    resetDrag();
    if (!moved) return;
    suppressHeaderClicks(350);
    const viewX = pointerViewX(upEvent as unknown as PointerLike);
    const drop = headerDropPosition(id, viewX);
    let side: string = drop.side;
    if (side === 'right' && !document.querySelector('.pbx-navRight')) side = 'left';
    const current = (config.headerButtons && config.headerButtons[id]) || { hidden: false, side: 'left', order: 0 };
    const next = cloneJson(config);
    const selector =
      side === 'right' ? '.pbx-navRight .pbx-navItem[data-hb-id]' : '.pbx-nav:not(.pbx-navRight) .pbx-navItem[data-hb-id]';
    const siblings = Array.prototype.filter.call(document.querySelectorAll(selector), (element: Element) => {
      const siblingId = element.getAttribute('data-hb-id');
      if (!siblingId || siblingId === id) return false;
      const rect2 = element.getBoundingClientRect();
      return rect2.width > 0 && rect2.height > 0;
    }) as Element[];
    let order: number | null = null;
    for (const sibling of siblings) {
      const rect2 = sibling.getBoundingClientRect();
      if (rect2.left + rect2.width / 2 > viewX) {
        const siblingId = sibling.getAttribute('data-hb-id') as string;
        const siblingOrder = Number(next.headerButtons[siblingId] && next.headerButtons[siblingId].order) || 0;
        order = siblingOrder - 5;
        break;
      }
    }
    if (order === null) {
      let maxOrder = 0;
      for (const key of Object.keys(next.headerButtons || {})) {
        const item = next.headerButtons[key];
        if (key !== id && item && item.side === side) maxOrder = Math.max(maxOrder, Number(item.order) || 0);
      }
      order = maxOrder + 10;
    }
    next.headerButtons[id] = Object.assign({}, current, { side: side, order: order });
    if (typeof saveSettings === 'function') saveSettings(next);
  };
  const cancel = (): void => {
    window.removeEventListener('pointermove', move, true);
    window.removeEventListener('pointerup', finish, true);
    window.removeEventListener('pointercancel', finish, true);
    window.removeEventListener('blur', cancel, true);
    ghost.remove();
    resetDrag();
  };
  window.addEventListener('pointermove', move, true);
  window.addEventListener('pointerup', finish, true);
  window.addEventListener('pointercancel', finish, true);
  window.addEventListener('blur', cancel, true);
}
