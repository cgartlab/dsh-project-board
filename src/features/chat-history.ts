/**
 * Load older chat history when the reader scrolls to the top of a conversation.
 *
 * DSH pages long conversations behind a "Load earlier" control the reader has to click for
 * every page. Scrolling up is exactly the gesture that means "I want older messages", so
 * this drives that same control from a scroll listener. Clicking the host's own button
 * (rather than reaching into a session controller) keeps its loading indicator, its error
 * reporting and — most importantly — its scroll anchoring intact: the host already knows
 * how to keep the reader's position stable across a prepend.
 */
import { logEvent } from '../core/log';

/**
 * Every locale DSH ships for `chat.loadOlder`. The button carries no stable class or data
 * attribute, so its visible label is the only cross-version hook. Keep this list in sync
 * with the host's `chat` namespace if it ever gains a language.
 */
const LOAD_OLDER_LABELS = [
  '加载更早',
  '载入更早',
  'Load earlier',
  'Load older',
  '以前を読み込む',
  'Cargar antes',
  'Charger plus tôt',
  'Früher laden',
  'Загрузить раньше',
  'Carregar mais cedo'
];

/** How close to the top counts as "the reader wants more history". */
const NEAR_TOP_PX = 120;
/** Ignore repeat triggers while one page is being fetched and anchored. */
const COOLDOWN_MS = 500;
/** Only conversations are tall enough to page; this skips the sidebar and small lists. */
export interface ChatHistoryOptions {
  /** Read live so the setting can be toggled without reinstalling the listener. */
  enabled: () => boolean;
}

const labelOf = (node: Element): string => (node.textContent || '').replace(/\s+/g, ' ').trim();

/**
 * Resolve the element that actually scrolled. Wheel/trackpad scrolling can target the
 * document itself (the root scroller), and some layouts scroll a body element, so map
 * those onto the real scrolling box before measuring.
 */
const resolveScroller = (target: EventTarget | null): HTMLElement | null => {
  if (!target) return null;
  if (target instanceof HTMLElement) return target;
  if (target === document) {
    const root = document.scrollingElement;
    return root instanceof HTMLElement ? root : null;
  }
  return null;
};

/** Find the host's "load earlier" control inside a scroller, if this conversation has one. */
const findLoadOlderControl = (root: Element | Document): HTMLElement | null => {
  const candidates = root.querySelectorAll('button, [role="button"]');
  for (const node of Array.from(candidates)) {
    const text = labelOf(node);
    if (!text) continue;
    if (LOAD_OLDER_LABELS.indexOf(text) >= 0) return node as HTMLElement;
  }
  return null;
};

/** The control is only actionable when it is actually on screen. */
const isVisible = (element: HTMLElement): boolean => {
  const rect = element.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0 && rect.bottom > 0 && rect.top < window.innerHeight;
};

/**
 * Watch every scroller on the page (capture phase: scroll does not bubble) and drive the
 * "load earlier" control whenever a conversation is scrolled to its top.
 * Returns a disposer that removes the listener.
 */
export function installChatHistoryAutoLoad(options: ChatHistoryOptions): () => void {
  let lastTriggeredAt = 0;

  const onScroll = (event: Event): void => {
    if (!options.enabled()) return;
    const scroller = resolveScroller(event.target);
    if (!scroller) return;
    if (scroller.scrollTop > NEAR_TOP_PX) return;
    const now = Date.now();
    if (now - lastTriggeredAt < COOLDOWN_MS) return;
    /* Search the scroller first, then the document: depending on the conversation's
       layout the pager sits either inside the scroll box or just above it. Requiring a
       minimum height or `scrollHeight > clientHeight` is wrong here — the host builds the
       transcript from height-capped groups, so a paging transcript can report equal
       scroll/client heights while still being scrollable through its inner boxes. */
    let control = findLoadOlderControl(scroller);
    if (!control || !isVisible(control)) {
      const global = findLoadOlderControl(document);
      control = global && isVisible(global) ? global : control;
    }
    if (!control) return;
    lastTriggeredAt = now;
    logEvent('info', 'chat', 'auto-load-older', { scrollTop: Math.round(scroller.scrollTop) });
    try {
      control.click();
    } catch (error) {
      logEvent('warn', 'chat', 'auto-load-older-failed', {
        message: String((error && (error as Error).message) || error)
      });
    }
  };

  document.addEventListener('scroll', onScroll, true);
  return () => document.removeEventListener('scroll', onScroll, true);
}
