/** Locating the live conversation view inside the native chat DOM. */

/** The chat flow of the visible conversation (hidden retained views render zero-size). */
export function visibleChatFlow(): Element | null {
  const flows = document.querySelectorAll('[data-slot="conversation.chat.flow"]');
  let fallback: Element | null = null;
  for (const flow of flows) {
    if (!fallback) fallback = flow;
    const rect = flow.getBoundingClientRect();
    if (rect.width > 4 && rect.height > 4) return flow;
    /* A flow host can be display:contents with no box of its own; judge it by its turns. */
    const turn = flow.querySelector(
      '[data-slot="conversation.chat.turn"], [data-slot="conversation.chat.user.content"], [data-slot="conversation.chat.assistant"]'
    );
    if (turn) {
      const turnRect = turn.getBoundingClientRect();
      if (turnRect.width > 4 && turnRect.height > 4) return flow;
    }
  }
  return fallback;
}

export function findChatScroller(): HTMLElement | null {
  const flow = visibleChatFlow();
  let node: Element | null = flow;
  while (node && node !== document.body) {
    const style = window.getComputedStyle(node);
    const element = node as HTMLElement;
    if (
      (style.overflowY === 'auto' || style.overflowY === 'scroll' || style.overflowY === 'overlay') &&
      element.scrollHeight > element.clientHeight + 4
    ) {
      return element;
    }
    node = node.parentElement;
  }
  const doc = (document.scrollingElement || document.documentElement) as HTMLElement | null;
  return doc && doc.scrollHeight > doc.clientHeight + 4 ? doc : null;
}
