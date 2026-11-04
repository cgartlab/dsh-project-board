window.__ModuleLoader__.load({
  id: '@local/dsh-project-board',
  factory(require) {
    const React = require('react');
    const h = React.createElement;
    const { useState, useEffect, useMemo, useRef } = React;

    const NS = 'projectBoard';
    const STORE_KEY = 'dsh.project-board.appearance.v1';
    const BOARD_ID = '@local/dsh-project-board/tab';
    const BOARD_KIND = 'projectBoard';
    const SETTINGS_KEY = 'dsh.project-board.settings.v1';
    const SHORTCUT_LABEL_KEYS = {
      palette: 'settings.shortcut.palette',
      prev: 'settings.shortcut.prev',
      next: 'settings.shortcut.next',
      userPrev: 'settings.shortcut.userPrev',
      userNext: 'settings.shortcut.userNext',
      scrollBottom: 'settings.shortcut.scrollBottom',
      sidebarBoard: 'settings.shortcut.sidebarBoard',
      panelHalf: 'settings.shortcut.panelHalf',
      panelFull: 'settings.shortcut.panelFull',
      rename: 'settings.shortcut.rename',
      interject: 'settings.shortcut.interject',
      hud: 'settings.shortcut.hud',
      sessionMenu: 'settings.shortcut.sessionMenu'
    };
    const DEFAULT_SETTINGS = {
      shortcuts: { palette: 'alt+KeyK', prev: 'alt+KeyI', next: 'alt+Comma', userPrev: 'alt+KeyU', userNext: 'alt+KeyM', scrollBottom: 'alt+KeyS', sidebarBoard: 'alt+KeyN', panelHalf: 'alt+KeyB', panelFull: 'alt+KeyV', rename: 'alt+KeyR', interject: 'alt+Enter', hud: 'alt+KeyE', sessionMenu: 'alt+KeyD' },
      palette: { enabled: true, blur: 15 },
      header: { capsule: true, placement: 'header' },
      hints: { shortcuts: true },
      hintsVersion: 1,
      headerButtonsVersion: 3,
      headerButtons: {
        switch: { hidden: false, side: 'left', order: 10 },
        historyNav: { hidden: false, side: 'left', order: 20 },
        capsule: { hidden: false, side: 'left', order: 50 }
      },
      hud: { enabled: true, includeDone: true, defaultCollapsed: false, defaultPosition: 'top-right', recentEnabled: true, recentCount: 5, recentExcludeAuto: true, maxSessions: 6 },
      notify: { enabled: true, sound: true },
      board: { enabled: true, wideThreshold: 520, defaultView: 'sessions' }
    };
    function cloneJson(value) { try { return JSON.parse(JSON.stringify(value)); } catch (error) { return value; } }
    function mergeSettings(base, raw) {
      const out = cloneJson(base);
      if (raw && typeof raw === 'object') {
        for (const key of Object.keys(base)) if (raw[key] && typeof raw[key] === 'object') Object.assign(out[key], raw[key]);
        if (raw.headerButtons && typeof raw.headerButtons === 'object') {
          for (const id of Object.keys(DEFAULT_SETTINGS.headerButtons)) {
            out.headerButtons[id] = Object.assign({}, DEFAULT_SETTINGS.headerButtons[id], raw.headerButtons[id] || {});
          }
        }
        const migratingButtons = raw.headerButtonsVersion !== 3;
        if (migratingButtons) {
          out.headerButtons = cloneJson(DEFAULT_SETTINGS.headerButtons);
          if (raw.header && raw.header.capsule === false) out.headerButtons.capsule.hidden = true;
        }
        if (raw.hintsVersion !== 1) out.hints = cloneJson(DEFAULT_SETTINGS.hints);
        for (const key of Object.keys(DEFAULT_SETTINGS.shortcuts)) {
          if (!comboHasModifier(out.shortcuts[key])) out.shortcuts[key] = DEFAULT_SETTINGS.shortcuts[key];
        }
      }
      return out;
    }
    function loadSettings() {
      const raw = loadJson(SETTINGS_KEY, null);
      const merged = mergeSettings(DEFAULT_SETTINGS, raw);
      if (raw && typeof raw === 'object' && (raw.headerButtonsVersion !== 3 || raw.hintsVersion !== 1)) {
        try { persistSettings(merged); } catch (error) { /* ignore */ }
      }
      return merged;
    }
    function persistSettings(value) { saveJson(SETTINGS_KEY, value); }
    function comboFromEvent(event) {
      const parts = [];
      if (event.ctrlKey) parts.push('ctrl');
      if (event.metaKey) parts.push('meta');
      if (event.altKey) parts.push('alt');
      if (event.shiftKey) parts.push('shift');
      const code = typeof event.code === 'string' ? event.code : '';
      if (!code) return '';
      if (/^(Control|Alt|Shift|Meta)(Left|Right)$/.test(code)) return '';
      return parts.concat(code).join('+');
    }
    function comboDisplay(combo) {
      if (!combo) return '';
      const parts = String(combo).split('+');
      const code = parts.pop();
      let label = code;
      if (/^Key[A-Z]$/.test(code)) label = code.slice(3);
      else if (/^Digit[0-9]$/.test(code)) label = code.slice(5);
      else if (code === 'Comma') label = ',';
      else if (code === 'Period') label = '.';
      else if (code === 'Space') label = 'Space';
      else if (code === 'ArrowUp') label = '↑';
      else if (code === 'ArrowDown') label = '↓';
      const mods = parts.map((part) => part === 'ctrl' ? 'Ctrl' : part === 'meta' ? 'Meta' : part === 'alt' ? 'Alt' : 'Shift');
      return mods.concat(label).join('+');
    }
    function comboHasModifier(combo) {
      const parts = String(combo || '').split('+');
      return parts.includes('ctrl') || parts.includes('alt') || parts.includes('meta');
    }
    function matchCombo(event, combo) { return Boolean(combo) && comboFromEvent(event) === combo; }
    function isComposingEvent(event) {
      if (!event) return false;
      if (event.isComposing === true || event.keyCode === 229) return true;
      return Boolean(event.nativeEvent && event.nativeEvent.isComposing === true);
    }
    /** Our stored combo ("alt+KeyK") as a binding comparable with ctx.shortcuts entries. */
    function comboBindingOf(combo) {
      const parts = String(combo || '').split('+');
      const code = parts.pop();
      if (!code || !/^[A-Za-z][A-Za-z0-9]*$/.test(code)) return null;
      return { code: code, modifiers: parts.map((part) => part === 'ctrl' ? 'control' : part) };
    }
    /** Same modifiers and at least one shared non-modifier key (a single key also collides with a chord). */
    function bindingsOverlap(left, right) {
      if (!left || !right) return false;
      const modsLeft = left.modifiers.slice().sort().join('+');
      const modsRight = right.modifiers.slice().sort().join('+');
      if (modsLeft !== modsRight) return false;
      const leftCodes = [left.code, left.secondCode].filter(Boolean);
      const rightCodes = [right.code, right.secondCode].filter(Boolean);
      return leftCodes.some((code) => rightCodes.indexOf(code) >= 0);
    }
    function hasOpenDialog() {
      try {
        const nodes = document.querySelectorAll('[aria-modal="true"]');
        for (const node of nodes) if (node.getClientRects().length > 0) return true;
      } catch (error) { /* ignore */ }
      return false;
    }
    let shortcutSuppressed = false;
    let userJumpLoading = false;
    let userJumpLastTarget = null;
    let userJumpLastAt = 0;
    let suppressHeaderClickUntil = 0;

    function pointerViewX(event) {
      const screenX = typeof event.screenX === 'number' && event.screenX !== 0 ? event.screenX : event.clientX + window.screenX;
      return screenX - window.screenX;
    }

    function headerDropPosition(id, clientX) {
      const side = clientX > window.innerWidth * 0.55 ? 'right' : 'left';
      const selector = side === 'right' ? '.pbx-navRight .pbx-navItem[data-hb-id]' : '.pbx-nav:not(.pbx-navRight) .pbx-navItem[data-hb-id]';
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

    /** Ctrl + left-drag a top button to the left or right header dock. */
    function startHeaderButtonDrag(id, event, saveSettings, config, dragStore) {
      if (!event.ctrlKey || event.button !== 0) return;
      event.preventDefault();
      event.stopPropagation();
      const source = event.currentTarget;
      const rect = source.getBoundingClientRect();
      const ghost = source.cloneNode(true);
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
      try { source.setPointerCapture(event.pointerId); } catch (error) { /* ignore */ }
      const setDrag = dragStore && typeof dragStore.set === 'function' ? dragStore.set : function () {};
      const resetDrag = () => setDrag({ id: null, side: null, index: -1, width: 0 });
      const currentSide = (config.headerButtons && config.headerButtons[id] && config.headerButtons[id].side) || 'left';
      ghost.style.display = 'none';
      const startX = event.clientX;
      const startY = event.clientY;
      let moved = false;
      let dragStarted = false;
      let lastSide = currentSide;
      let lastIndex = -1;
      const move = (moveEvent) => {
        const dx = moveEvent.clientX - startX;
        const dy = moveEvent.clientY - startY;
        if (Math.abs(dx) + Math.abs(dy) > 4) moved = true;
        ghost.style.left = (rect.left + dx) + 'px';
        ghost.style.top = (rect.top + dy) + 'px';
        if (!moved) return;
        if (!dragStarted) {
          dragStarted = true;
          ghost.style.display = '';
          setDrag({ id: id, side: currentSide, index: -1, width: 0 });
          window.requestAnimationFrame(() => setDrag({ width: rect.width }));
        }
        const drop = headerDropPosition(id, pointerViewX(moveEvent));
        if (drop.side !== lastSide || drop.index !== lastIndex) {
          lastSide = drop.side;
          lastIndex = drop.index;
          setDrag({ side: drop.side, index: drop.index });
        }
      };
      const finish = (upEvent) => {
        window.removeEventListener('pointermove', move, true);
        window.removeEventListener('pointerup', finish, true);
        window.removeEventListener('pointercancel', finish, true);
        window.removeEventListener('blur', cancel, true);
        ghost.remove();
        resetDrag();
        if (!moved) return;
        suppressHeaderClickUntil = Date.now() + 350;
        const viewX = pointerViewX(upEvent);
        const drop = headerDropPosition(id, viewX);
        let side = drop.side;
        if (side === 'right' && !document.querySelector('.pbx-navRight')) side = 'left';
        const current = (config.headerButtons && config.headerButtons[id]) || {};
        const next = cloneJson(config);
        const selector = side === 'right' ? '.pbx-navRight .pbx-navItem[data-hb-id]' : '.pbx-nav:not(.pbx-navRight) .pbx-navItem[data-hb-id]';
        const siblings = Array.prototype.filter.call(document.querySelectorAll(selector), (element) => {
          const siblingId = element.getAttribute('data-hb-id');
          if (!siblingId || siblingId === id) return false;
          const rect2 = element.getBoundingClientRect();
          return rect2.width > 0 && rect2.height > 0;
        });
        let order = null;
        for (const sibling of siblings) {
          const rect2 = sibling.getBoundingClientRect();
          if (rect2.left + rect2.width / 2 > viewX) {
            const siblingId = sibling.getAttribute('data-hb-id');
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
      const cancel = () => {
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

    function headerClickBlocked() { return Date.now() < suppressHeaderClickUntil; }

    /** Every rendered user-instruction bubble, in document order. */
    function collectUserMessageTargets() {
      const flow = visibleChatFlow() || document;
      let targets = Array.prototype.slice.call(flow.querySelectorAll('[data-slot="conversation.chat.user.content"]'));
      if (targets.length === 0) targets = Array.prototype.slice.call(flow.querySelectorAll('[class*="_userRow"]'));
      if (targets.length === 0) {
        const groups = document.querySelectorAll('[data-chat-flow-kind="user"], [data-chat-flow-kind="steering"]');
        for (const group of groups) {
          const bubbles = group.querySelectorAll('[data-slot="conversation.chat.user.content"], [class*="_userRow"]');
          if (bubbles.length > 0) targets.push.apply(targets, bubbles);
          else targets.push(group);
        }
      }
      return targets.filter((element) => {
        const rect = element.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      });
    }

    function highlightUserTarget(target) {
      if (!target) return;
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      target.classList.remove('pbx-user-jump-highlight');
      void target.offsetWidth;
      target.classList.add('pbx-user-jump-highlight');
      window.setTimeout(() => target.classList.remove('pbx-user-jump-highlight'), 1200);
    }

    function findLoadEarlierButton() {
      const candidates = document.querySelectorAll('button, [role="button"]');
      return Array.prototype.find.call(candidates, (element) => {
        const rect = element.getBoundingClientRect();
        const visible = rect.width > 0 && rect.height > 0 && element.offsetParent !== null;
        if (!visible) return false;
        return /^(加载更早|加载更多历史|Load earlier|Load older|Load previous)/i.test((element.textContent || '').trim());
      }) || null;
    }

    function waitForMoreTargets(previousCount, timeout) {
      return new Promise((resolve) => {
        const started = Date.now();
        const timer = window.setInterval(() => {
          if (collectUserMessageTargets().length > previousCount || Date.now() - started > timeout) {
            window.clearInterval(timer);
            resolve();
          }
        }, 80);
      });
    }

    async function loadEarlierThenJump(anchor, previousCount) {
      if (userJumpLoading) return;
      userJumpLoading = true;
      try {
        const button = findLoadEarlierButton();
        if (!button) { highlightUserTarget(anchor); userJumpLastTarget = anchor; userJumpLastAt = Date.now(); return; }
        button.click();
        await waitForMoreTargets(previousCount, 2500);
        const rows = collectUserMessageTargets();
        const prepended = rows.length - previousCount;
        if (prepended <= 0) { highlightUserTarget(anchor); userJumpLastTarget = anchor; userJumpLastAt = Date.now(); return; }
        const target = rows[prepended - 1] || rows[0];
        highlightUserTarget(target);
        userJumpLastTarget = target;
        userJumpLastAt = Date.now();
      } finally {
        userJumpLoading = false;
      }
    }

    /** Jump to the previous/next user instruction relative to whatever is visible right now. */
    function jumpUserMessage(direction) {
      if (userJumpLoading) return;
      const rows = collectUserMessageTargets();
      if (rows.length === 0) return;
      const scroller = findChatScroller();
      const bounds = scroller ? scroller.getBoundingClientRect() : { top: 0, bottom: window.innerHeight };
      const viewportTop = Math.max(0, Math.min(bounds.top, window.innerHeight));
      const viewportBottom = Math.max(viewportTop, Math.min(bounds.bottom, window.innerHeight));
      const lastAt = Date.now();
      const recent = lastAt - userJumpLastAt < 700;
      let target = null;
      if (direction < 0) {
        for (let i = rows.length - 1; i >= 0; i -= 1) {
          const row = rows[i];
          if (recent && row === userJumpLastTarget) continue;
          if (row.getBoundingClientRect().top < viewportTop - 2) { target = row; break; }
        }
        if (!target) { void loadEarlierThenJump(rows[0], rows.length); return; }
      } else {
        for (let i = 0; i < rows.length; i += 1) {
          const row = rows[i];
          if (recent && row === userJumpLastTarget) continue;
          if (row.getBoundingClientRect().bottom > viewportBottom + 2) { target = row; break; }
        }
        if (!target) target = rows[rows.length - 1];
      }
      highlightUserTarget(target);
      userJumpLastTarget = target;
      userJumpLastAt = lastAt;
    }

    /* ------------------------------------------------ hold-to-scroll the chat */
    const HOLD_SCROLL_DELAY = 300;
    let holdScrollState = null;

    /** The chat flow of the visible conversation (hidden retained views render zero-size). */
    function visibleChatFlow() {
      const flows = document.querySelectorAll('[data-slot="conversation.chat.flow"]');
      let fallback = null;
      for (const flow of flows) {
        if (!fallback) fallback = flow;
        const rect = flow.getBoundingClientRect();
        if (rect.width > 4 && rect.height > 4) return flow;
      }
      return fallback;
    }

    function findChatScroller() {
      const flow = visibleChatFlow();
      let node = flow;
      while (node && node !== document.body) {
        const style = window.getComputedStyle(node);
        if ((style.overflowY === 'auto' || style.overflowY === 'scroll' || style.overflowY === 'overlay') && node.scrollHeight > node.clientHeight + 4) return node;
        node = node.parentElement;
      }
      const doc = document.scrollingElement || document.documentElement;
      return doc && doc.scrollHeight > doc.clientHeight + 4 ? doc : null;
    }

    /** Stop the hold loop; a short tap (still pending) falls back to the message jump. */
    function stopHoldScroll(allowJump) {
      const state = holdScrollState;
      if (!state) return;
      holdScrollState = null;
      window.clearTimeout(state.timer);
      if (state.poll) window.clearInterval(state.poll);
      if (state.raf) window.cancelAnimationFrame(state.raf);
      if (typeof state.restore === 'function') { try { state.restore(); } catch (error) { /* ignore */ } }
      if (allowJump && state.mode === 'pending') jumpUserMessage(state.dir);
    }

    function startHoldLoop(state) {
      const initial = findChatScroller();
      if (!initial) return;
      state.mode = 'running';
      state.scroller = initial;
      state.speed = 9;
      state.loading = false;
      state.awaitingOlder = false;
      state.exhausted = false;
      state.stall = 0;
      state.retries = 0;
      state.pauseUntil = 0;
      state.poll = 0;
      state.last = window.performance && typeof window.performance.now === 'function' ? window.performance.now() : Date.now();
      const previousBehavior = initial.style.scrollBehavior;
      initial.style.scrollBehavior = 'auto';
      state.restore = () => {
        const node = state.scroller || initial;
        try { node.style.scrollBehavior = previousBehavior; } catch (error) { /* ignore */ }
      };

      /* The chat may remount its scroll container while history grows; always use the live node. */
      const current = () => {
        const flow = visibleChatFlow();
        const node = state.scroller;
        if (node && node.isConnected && flow && node.contains(flow)) return node;
        const next = findChatScroller();
        if (next) { state.scroller = next; state.stall = 0; }
        return next;
      };
      const now = () => (window.performance && typeof window.performance.now === 'function' ? window.performance.now() : Date.now());
      const schedule = () => { state.raf = window.requestAnimationFrame(step); };

      /** Click the history button and watch for growth without pausing the loop. */
      const requestOlder = (block) => {
        const node = current();
        if (!node) { state.mode = 'done'; return false; }
        const button = findLoadEarlierButton();
        if (!button || button.disabled) return false;
        const beforeHeight = node.scrollHeight;
        state.loading = true;
        state.awaitingOlder = block === true;
        const started = now();
        try { button.click(); } catch (error) { /* ignore */ }
        if (state.poll) window.clearInterval(state.poll);
        state.poll = window.setInterval(() => {
          if (holdScrollState !== state || state.mode !== 'running') { window.clearInterval(state.poll); state.poll = 0; return; }
          const live = current();
          if (!live) { window.clearInterval(state.poll); state.poll = 0; state.mode = 'done'; return; }
          if (live.scrollHeight > beforeHeight + 8) {
            const grew = live.scrollHeight - beforeHeight;
            window.clearInterval(state.poll);
            state.poll = 0;
            state.loading = false;
            state.awaitingOlder = false;
            if (block === true && live.scrollTop <= 2) live.scrollTop = grew;
            state.last = now();
            return;
          }
          if (now() - started > 2600) {
            window.clearInterval(state.poll);
            state.poll = 0;
            state.loading = false;
            state.awaitingOlder = false;
            state.exhausted = true;
            if (block) state.mode = 'done';
          }
        }, 120);
        return true;
      };

      /** Move up one rendered anchor when plain offset writes are reverted at a fold boundary. */
      const stepUpByAnchor = () => {
        const node = current();
        if (!node) return false;
        const viewportTop = node.getBoundingClientRect().top;
        const anchors = Array.prototype.slice.call(node.querySelectorAll('[data-chat-anchor-key]'));
        if (anchors.length === 0) return false;
        let index = anchors.length - 1;
        for (let i = 0; i < anchors.length; i += 1) {
          if (anchors[i].getBoundingClientRect().bottom > viewportTop + 4) { index = i; break; }
        }
        const target = anchors[Math.max(0, index - 1)];
        if (!target) return false;
        const before = node.scrollTop;
        try { target.scrollIntoView({ block: 'start', behavior: 'auto' }); } catch (error) { return false; }
        return Math.abs(node.scrollTop - before) > 1;
      };

      function step(timestamp) {
        if (holdScrollState !== state || state.mode !== 'running') return;
        const node = current();
        if (!node) { state.mode = 'done'; return; }
        const ts = typeof timestamp === 'number' ? timestamp : now();
        const dt = Math.min(50, Math.max(0, ts - state.last));
        state.last = ts;
        if (state.awaitingOlder) { schedule(); return; }
        if (state.pauseUntil > ts) { schedule(); return; }
        const frames = dt / 16.6667;
        state.speed = Math.min(30, state.speed + 0.8 * frames);
        const max = Math.max(0, node.scrollHeight - node.clientHeight);
        if (state.dir > 0) {
          if (node.scrollTop >= max - 0.5) { state.stall = 0; schedule(); return; }
          const before = node.scrollTop;
          node.scrollTop = Math.min(max, before + state.speed * frames);
          if (Math.abs(node.scrollTop - before) < 0.5) { state.stall += frames; } else { state.stall = 0; }
          schedule();
          return;
        }
        /* Prefetch the next history page one screen before the boundary so scrolling never stalls. */
        if (!state.loading && !state.exhausted && node.scrollTop < node.clientHeight * 1.2) requestOlder(false);
        if (node.scrollTop <= 0.5) {
          if (state.exhausted) { state.mode = 'done'; return; }
          if (!state.loading) requestOlder(true);
          schedule();
          return;
        }
        const before = node.scrollTop;
        node.scrollTop = Math.max(0, before - state.speed * frames);
        if (Math.abs(node.scrollTop - before) < 0.5) {
          state.stall += frames;
          if (state.stall > 24) {
            state.stall = 0;
            if (stepUpByAnchor()) { state.retries = 0; schedule(); return; }
            state.retries += 1;
            if (state.retries > 6) { state.mode = 'done'; return; }
            state.pauseUntil = now() + 260;
          }
        } else {
          state.stall = 0;
          state.retries = 0;
        }
        schedule();
      }
      schedule();
    }

    function beginHoldScroll(direction, code) {
      stopHoldScroll(false);
      const state = { dir: direction, code: code || '', mode: 'pending', timer: 0, raf: 0, speed: 0, last: 0, scroller: null, restore: null };
      holdScrollState = state;
      state.timer = window.setTimeout(() => {
        if (holdScrollState === state) startHoldLoop(state);
      }, HOLD_SCROLL_DELAY);
    }

    window.addEventListener('keyup', (event) => {
      const state = holdScrollState;
      if (!state) return;
      if (state.code && event.code !== state.code) return;
      stopHoldScroll(true);
    }, true);
    window.addEventListener('blur', () => { stopHoldScroll(false); }, true);
    document.addEventListener('keydown', (event) => {
      if (holdScrollState && event.key === 'Escape') stopHoldScroll(false);
    }, true);

    /* -------------------------------------------------- interject queued input */
    const STEER_LABELS = ['插话发送', 'Steer queued message'];

    function queueDockElement() { return document.querySelector('[data-queue-dock]'); }

    /** The Steer button of the earliest still-pending queued row, or null. */
    function earliestSteerButton() {
      const dock = queueDockElement();
      if (!dock) return null;
      const rows = dock.querySelectorAll('li');
      for (const row of rows) {
        if (row.hasAttribute('data-submission-echo')) continue;
        const buttons = Array.prototype.slice.call(row.querySelectorAll('button'));
        if (buttons.length === 0) continue;
        let steer = null;
        for (const button of buttons) {
          const label = button.getAttribute('aria-label') || '';
          if (STEER_LABELS.indexOf(label) >= 0) { steer = button; break; }
        }
        if (!steer) steer = buttons[buttons.length - 1];
        if (!steer) continue;
        if (steer.disabled) return null;
        return steer;
      }
      return null;
    }

    /** Steer the first queued message into the running turn; expands a collapsed dock once. */
    function interjectEarliestQueued() {
      const steer = earliestSteerButton();
      if (steer) { steer.click(); return true; }
      const dock = queueDockElement();
      if (!dock) return false;
      const header = dock.querySelector('button[aria-controls][aria-expanded="false"]');
      if (!header || header.disabled) return false;
      header.click();
      window.setTimeout(() => {
        const retry = earliestSteerButton();
        if (retry) retry.click();
      }, 90);
      return true;
    }

    /** Scroll the open conversation to its bottom and focus the composer input. */
    function scrollToComposerAndFocus() {
      const flow = visibleChatFlow();
      let scrollParent = flow;
      while (scrollParent && scrollParent !== document.body) {
        const style = window.getComputedStyle(scrollParent);
        if ((style.overflowY === 'auto' || style.overflowY === 'scroll') && scrollParent.scrollHeight > scrollParent.clientHeight + 4) break;
        scrollParent = scrollParent.parentElement;
      }
      if (scrollParent && scrollParent !== document.body) scrollParent.scrollTo({ top: scrollParent.scrollHeight, behavior: 'smooth' });
      else if (flow) flow.scrollIntoView({ block: 'end', behavior: 'smooth' });
      const card = document.querySelector('[data-composer-card]');
      let input = card ? card.querySelector('textarea, [contenteditable="true"]') : null;
      if (!input) {
        input = Array.prototype.find.call(document.querySelectorAll('textarea, [contenteditable="true"]'), (element) => {
          const rect = element.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0;
        });
      }
      if (input) {
        input.focus({ preventScroll: true });
        if (typeof input.value === 'string' && typeof input.setSelectionRange === 'function') {
          const end = input.value.length;
          try { input.setSelectionRange(end, end); } catch (error) { /* ignore */ }
        }
      }
    }

    /* ---------------------------------------------------------------- locale */
    const zh = {
      'panel.label': '项目看板', 'title': '项目看板',
      'subtitle': '会话与项目的数据表：可筛选、分组、按属性排序。',
      'stat.workspaces': '工作区', 'stat.sessions': '会话', 'stat.attention': '待处理', 'stat.running': '运行中',
      'view.sessions': '会话', 'view.projects': '项目',
      'filter.all': '全部', 'filter.status': '状态', 'filter.project': '项目', 'filter.search': '搜索…',
      'group.byProject': '按项目分组', 'sort.hint': 'Shift+点击列头可叠加排序',
      'col.title': '名称', 'col.project': '项目', 'col.status': '状态', 'col.running': '运行', 'col.current': '当前',
      'col.attention': '待处理', 'col.done': '已完成', 'col.idle': '空闲', 'col.empty': '暂无会话',
      'col.preset': '模式', 'col.updated': '最后活动', 'col.appearance': '图标/颜色', 'col.total': '会话',
      'col.kind': '类型', 'kind.auto': '自动化任务', 'kind.normal': '普通会话', 'filter.kind': '类型', 'stat.auto': '自动化',
      'nav.switch': '切换会话', 'nav.switchLabel': '会话', 'nav.noSession': '未选择会话', 'nav.board': '看板', 'nav.openBoard': '打开项目看板', 'nav.cycle': 'Alt+I 上一个 · Alt+, 下一个',
      'rightTab.title': '项目看板', 'compact.full': '全屏打开',
      'palette.placeholder': '搜索会话或项目…', 'palette.allProjects': '全部项目', 'palette.empty': '没有匹配的会话', 'palette.hint': '↑↓ 选择 · Enter 打开 · Esc 关闭',
      'hud.title': '活跃与最近会话', 'hud.collapsed': '活跃', 'hud.expand': '展开', 'hud.collapse': '收起', 'hud.empty': '当前没有非空闲会话', 'hud.prev': '上一个', 'hud.next': '下一个', 'hud.recent': '最近',
      'hud.groupSession': '会话', 'hud.groupMessage': '指令', 'hud.prevInstruction': '上一条', 'hud.nextInstruction': '下一条', 'hud.toBottom': '到底部', 'hud.auto': '自动化',
      'settings.title': '项目看板设置',
      'settings.intro': '自定义项目看板的快捷键、悬浮窗与视图行为。',
      'settings.shortcuts': '快捷键',
      'settings.shortcut.palette': '打开会话搜索',
      'settings.shortcut.prev': '上一个会话',
      'settings.shortcut.next': '下一个会话',
      'settings.shortcut.userPrev': '上一条用户指令（轻按跳转，按住连续向上滚动）',
      'settings.shortcut.userNext': '下一条用户指令（轻按跳转，按住连续向下滚动）',
      'settings.shortcut.scrollBottom': '滚动到底部并激活输入框',
      'settings.shortcut.sidebarBoard': '打开/关闭窄版项目看板（右侧栏 380px）',
      'settings.shortcut.panelHalf': '打开/关闭中等宽度项目看板（右侧栏 50%）',
      'settings.shortcut.panelFull': '切换项目看板全屏（右侧栏全屏）',
      'settings.shortcut.rename': '重命名当前会话',
      'settings.shortcut.interject': '插话发送最早排队的消息',
      'settings.shortcut.hud': '收起/展开悬浮列表',
      'settings.shortcut.sessionMenu': '打开会话操作对话框（归档 / 删除 / 取消）',
      'rename.title': '重命名会话', 'rename.label': '会话名称', 'rename.placeholder': '输入新的会话名称', 'rename.cancel': '取消', 'rename.confirm': '保存', 'rename.saving': '保存中…', 'rename.failed': '重命名失败',
      'toast.conflictTitle': '快捷键冲突',
      'toast.conflictOwn': '「{combo}」已被本插件的「{name}」占用。',
      'toast.conflictBuiltin': '「{combo}」已被 DSH 内置命令「{name}」占用。',
      'toast.conflictExisting': '当前快捷键 {combo} 与内置命令「{name}」冲突，建议改键。',
      'toast.conflictExistingMany': '有 {n} 个快捷键与内置命令冲突，请到设置中改键。',
      'toast.dismiss': '关闭通知',
      'toast.interjectNone': '当前没有可插话的排队消息（仅运行中可用）。',
      'menu.title': '管理当前会话',
      'menu.archive': '归档',
      'menu.delete': '删除',
      'menu.deleteConfirm': '再次点击确认删除',
      'menu.cancel': '取消',
      'menu.archiveHint': '归档后会话从列表隐藏，数据保留。',
      'menu.deleteHint': '删除不可逆。',
      'menu.deleteUnavailable': '当前 DSH 客户端未开放会话删除接口，请使用归档。',
      'menu.failed': '操作失败：{message}',
      'menu.busy': '处理中…',
      'settings.shortcut.hint': '点击键帽后按下新的组合键；必须包含 Ctrl / Alt / Meta，Esc 取消。与 DSH 内置命令冲突时会拒绝录制并弹出提示。',
      'settings.shortcutNeedModifier': '快捷键必须包含 Ctrl、Alt 或 Meta，不能使用裸键。',
      'settings.shortcutConflict': '该组合键已被其他功能占用，请换一个。',
      'settings.shortcutResetHint': '点击录制，双击恢复默认',
      'settings.recording': '按下按键…',
      'settings.behavior': '界面与行为',
      'settings.paletteEnabled': '启用命令面板', 'settings.paletteEnabledDesc': 'Alt+K 等快捷键与搜索面板',
      'settings.capsuleEnabled': '启用顶部状态胶囊', 'settings.capsuleEnabledDesc': '标题栏显示运行中/待处理数量',
      'settings.headerButtons': '顶部功能按钮',
      'settings.headerPlacement': '按钮显示位置', 'settings.placement.header': '顶部标题栏', 'settings.placement.composer': '输入框下方状态信息下方',
      'settings.headerButtonsHint': '按住 Ctrl + 鼠标左键拖动按钮，可在左侧与右侧之间移动；每个按钮也可以单独隐藏。右侧停靠需要打开一个会话。',
      'settings.composerButtonsHint': '当前统一显示在输入框下方，按钮按固定顺序排列；每个按钮仍可单独隐藏。',
      'settings.hb.switch': '会话搜索', 'settings.hb.historyNav': '历史指令与底部', 'settings.hb.capsule': '状态胶囊',
      'settings.hb.sideLeft': '左侧', 'settings.hb.sideRight': '右侧', 'settings.hb.followPlacement': '跟随统一位置',
      'settings.hudEnabled': '启用悬浮窗', 'settings.hudEnabledDesc': '实时显示非空闲会话与计时',
      'settings.notifyEnabled': '启用任务通知', 'settings.notifyEnabledDesc': '会话完成、模型提问或权限请求时提醒',
      'settings.notifySound': '通知提示音', 'settings.notifySoundDesc': '应用内通知播放提示音',
      'notif.completeTitle': '任务完成',
      'notif.completeBody': '会话「{title}」已完成',
      'notif.questionTitle': '等待回答',
      'notif.approvalTitle': '权限请求',
      'notif.pendingPrefix': '会话「{title}」',
      'notif.approvalBody': '会话「{title}」请求使用「{tool}」权限',
      'notif.approvalChoices': '请在应用内选择：允许 / 拒绝',
      'notif.multiSelect': '（可多选）',
      'notif.openHint': '点击打开会话',
      'notif.dismiss': '关闭通知',
      'settings.shortcutHints': '显示快捷键提示', 'settings.shortcutHintsDesc': '在输入框下方状态信息中显示快捷键提示，可随时关闭',
      'hints.dismiss': '不再显示快捷键提示',
      'settings.hudDone': '悬浮窗包含已完成未读', 'settings.hudDoneDesc': '关闭后悬浮窗只显示运行中和待处理',
      'settings.hudRecent': '悬浮窗显示最近普通会话', 'settings.hudRecentDesc': '额外列出最近活跃的普通会话（可包含空闲）',
      'settings.hudRecentCount': '最近普通会话数量', 'settings.hudMaxSessions': '悬浮列表最多显示会话数', 'settings.hudRecentExcludeAuto': '最近会话排除自动化任务', 'settings.hudRecentExcludeAutoDesc': '只把非自动化的普通会话计入最近列表',
      'settings.hudCollapsed': '悬浮窗默认收起', 'settings.hudCollapsedDesc': '打开应用时只显示数量小胶囊',
      'settings.hudPosition': '悬浮窗默认位置',
      'settings.pos.top': '右上角', 'settings.pos.bottom': '右下角', 'settings.pos.last': '上次位置',
      'settings.boardEnabled': '启用右侧看板页签', 'settings.boardEnabledDesc': '在右侧栏打开「项目看板」',
      'settings.boardThreshold': '完整看板宽度阈值（px）',
      'settings.boardView': '完整看板默认视图',
      'settings.blur': '搜索面板模糊强度（px）',
      'settings.data': '数据',
      'settings.reset': '恢复默认设置',
      'settings.resetAppearance': '清除项目外观（颜色/图标）',
      'settings.resetAppearanceHint': '清除后立即恢复默认颜色与图标。',
      'settings.boardDisabled': '项目看板已在设置中关闭',
      'preset.standard': '标准模式', 'preset.ptc': 'PTC 模式', 'preset.minimal': '极简模式', 'preset.cordis': '创造模式', 'preset.none': '未设置',
      'count.rows': '共 {n} 条',
      'empty.filtered': '没有符合条件的条目',
      'open': '打开',
      'card.current': '当前', 'card.open': '打开',
      'status.attention': '待处理', 'status.approval': '等待批准', 'status.plan': '等待计划确认', 'status.question': '等待回答',
      'status.running': '运行中', 'status.done': '已完成', 'status.idle': '空闲',
      'appearance.color': '颜色', 'appearance.icon': '图标', 'appearance.reset': '恢复默认',
      'empty.title': '还没有工作区', 'empty.desc': '添加一个工作区后，这里会显示它的会话与项目。',
      'loading': '正在读取工作区…', 'session.untitled': '未命名会话', 'workspace.default': '默认工作区',
      'time.now': '刚刚', 'time.min': '{n}分钟', 'time.hour': '{n}小时', 'time.day': '{n}天'
    };
    const en = {
      'panel.label': 'Project Board', 'title': 'Project Board',
      'subtitle': 'A database of sessions and projects: filter, group, and sort by properties.',
      'stat.workspaces': 'workspaces', 'stat.sessions': 'sessions', 'stat.attention': 'attention', 'stat.running': 'running',
      'view.sessions': 'Sessions', 'view.projects': 'Projects',
      'filter.all': 'All', 'filter.status': 'Status', 'filter.project': 'Project', 'filter.search': 'Search…',
      'group.byProject': 'Group by project', 'sort.hint': 'Shift+click a column to add a sort',
      'col.title': 'Name', 'col.project': 'Project', 'col.status': 'Status', 'col.running': 'Running', 'col.current': 'Current',
      'col.attention': 'Attention', 'col.done': 'Completed', 'col.idle': 'Idle', 'col.empty': 'No sessions',
      'col.preset': 'Mode', 'col.updated': 'Last activity', 'col.appearance': 'Icon / color', 'col.total': 'Sessions',
      'col.kind': 'Type', 'kind.auto': 'Automation', 'kind.normal': 'Session', 'filter.kind': 'Type', 'stat.auto': 'Automation',
      'nav.switch': 'Switch session', 'nav.switchLabel': 'Sessions', 'nav.noSession': 'No session', 'nav.board': 'Board', 'nav.openBoard': 'Open project board', 'nav.cycle': 'Alt+I previous · Alt+, next',
      'rightTab.title': 'Project Board', 'compact.full': 'Open full screen',
      'palette.placeholder': 'Search sessions or projects…', 'palette.allProjects': 'All projects', 'palette.empty': 'No matching sessions', 'palette.hint': '↑↓ select · Enter open · Esc close',
      'hud.title': 'Active & recent', 'hud.collapsed': 'Active', 'hud.expand': 'Expand', 'hud.collapse': 'Collapse', 'hud.empty': 'No active sessions', 'hud.prev': 'Previous', 'hud.next': 'Next', 'hud.recent': 'Recent',
      'hud.groupSession': 'Session', 'hud.groupMessage': 'Instruction', 'hud.prevInstruction': 'Previous', 'hud.nextInstruction': 'Next', 'hud.toBottom': 'Bottom', 'hud.auto': 'Auto',
      'settings.title': 'Project Board settings',
      'settings.intro': 'Customize shortcuts, floating status, and board behavior.',
      'settings.shortcuts': 'Shortcuts',
      'settings.shortcut.palette': 'Open session search',
      'settings.shortcut.prev': 'Previous session',
      'settings.shortcut.next': 'Next session',
      'settings.shortcut.userPrev': 'Previous user message (tap to jump, hold to scroll up)',
      'settings.shortcut.userNext': 'Next user message (tap to jump, hold to scroll down)',
      'settings.shortcut.scrollBottom': 'Scroll to bottom and focus input',
      'settings.shortcut.sidebarBoard': 'Toggle narrow board (right sidebar, 380px)',
      'settings.shortcut.panelHalf': 'Toggle medium board (right sidebar, 50%)',
      'settings.shortcut.panelFull': 'Toggle board fullscreen (right sidebar)',
      'settings.shortcut.rename': 'Rename current session',
      'settings.shortcut.interject': 'Interject the earliest queued message',
      'settings.shortcut.hud': 'Collapse/expand floating list',
      'settings.shortcut.sessionMenu': 'Open session actions dialog (archive / delete / cancel)',
      'rename.title': 'Rename session', 'rename.label': 'Session name', 'rename.placeholder': 'Enter a new session name', 'rename.cancel': 'Cancel', 'rename.confirm': 'Save', 'rename.saving': 'Saving…', 'rename.failed': 'Rename failed',
      'toast.conflictTitle': 'Shortcut conflict',
      'toast.conflictOwn': '"{combo}" is already used by this plugin\'s "{name}".',
      'toast.conflictBuiltin': '"{combo}" is already used by the built-in DSH command "{name}".',
      'toast.conflictExisting': 'Saved shortcut {combo} conflicts with the built-in command "{name}". Rebind it.',
      'toast.conflictExistingMany': '{n} shortcuts conflict with built-in commands. Rebind them in Settings.',
      'toast.dismiss': 'Dismiss notification',
      'toast.interjectNone': 'No queued message can be steered right now (available only while running).',
      'menu.title': 'Manage session',
      'menu.archive': 'Archive',
      'menu.delete': 'Delete',
      'menu.deleteConfirm': 'Click again to confirm',
      'menu.cancel': 'Cancel',
      'menu.archiveHint': 'Archiving hides the session from lists; its data is kept.',
      'menu.deleteHint': 'Deletion is irreversible.',
      'menu.deleteUnavailable': 'This DSH client does not expose session deletion yet. Use archive instead.',
      'menu.failed': 'Failed: {message}',
      'menu.busy': 'Working…',
      'settings.shortcut.hint': 'Click a keycap, then press the new combination; Ctrl / Alt / Meta is required; Esc cancels. Combinations that clash with built-in DSH commands are rejected with a notice.',
      'settings.shortcutNeedModifier': 'A shortcut must include Ctrl, Alt, or Meta; bare keys are not allowed.',
      'settings.shortcutConflict': 'That combination is already used by another action.',
      'settings.shortcutResetHint': 'Click to record, double-click to reset',
      'settings.recording': 'Press keys…',
      'settings.behavior': 'Interface and behavior',
      'settings.paletteEnabled': 'Enable command palette', 'settings.paletteEnabledDesc': 'Shortcuts and the search panel',
      'settings.capsuleEnabled': 'Enable header status capsule', 'settings.capsuleEnabledDesc': 'Running / attention counts in the header',
      'settings.headerButtons': 'Top function buttons',
      'settings.headerPlacement': 'Button placement', 'settings.placement.header': 'Header bar', 'settings.placement.composer': 'Below composer status',
      'settings.headerButtonsHint': 'Hold Ctrl and drag a button with the left mouse button to move it between the left and right sides. Each button can also be hidden separately. Right docking requires an open session.',
      'settings.composerButtonsHint': 'Buttons are shown below the composer in a fixed order; each button can still be hidden individually.',
      'settings.hb.switch': 'Session search', 'settings.hb.historyNav': 'History & bottom', 'settings.hb.capsule': 'Status capsule',
      'settings.hb.sideLeft': 'Left', 'settings.hb.sideRight': 'Right', 'settings.hb.followPlacement': 'Follows global placement',
      'settings.hudEnabled': 'Enable floating status', 'settings.hudEnabledDesc': 'Live non-idle sessions and timers',
      'settings.notifyEnabled': 'Enable task notifications', 'settings.notifyEnabledDesc': 'Notify on completion, questions, or approvals',
      'settings.notifySound': 'Notification sound', 'settings.notifySoundDesc': 'Play a chime for in-app notifications',
      'notif.completeTitle': 'Task complete',
      'notif.completeBody': 'Session "{title}" finished',
      'notif.questionTitle': 'Waiting for your answer',
      'notif.approvalTitle': 'Permission request',
      'notif.pendingPrefix': 'Session "{title}"',
      'notif.approvalBody': 'Session "{title}" requests permission for "{tool}"',
      'notif.approvalChoices': 'Choose Allow or Deny in the app',
      'notif.multiSelect': '(multiple selection allowed)',
      'notif.openHint': 'Click to open the session',
      'notif.dismiss': 'Dismiss notification',
      'settings.shortcutHints': 'Show shortcut hints', 'settings.shortcutHintsDesc': 'Show shortcut hints with the composer status row; dismissible anytime',
      'hints.dismiss': 'Never show shortcut hints',
      'settings.hudDone': 'Include completed-unread in floating status', 'settings.hudDoneDesc': 'When off, only running and attention appear',
      'settings.hudRecent': 'Show recent normal sessions', 'settings.hudRecentDesc': 'Also list recently active normal sessions (may be idle)',
      'settings.hudRecentCount': 'Recent normal session count', 'settings.hudMaxSessions': 'Maximum sessions in floating list', 'settings.hudRecentExcludeAuto': 'Exclude automation from recent sessions', 'settings.hudRecentExcludeAutoDesc': 'Only non-automation sessions count toward the recent list',
      'settings.hudCollapsed': 'Start floating status collapsed', 'settings.hudCollapsedDesc': 'Show only the count pill on launch',
      'settings.hudPosition': 'Floating status default position',
      'settings.pos.top': 'Top right', 'settings.pos.bottom': 'Bottom right', 'settings.pos.last': 'Last position',
      'settings.boardEnabled': 'Enable right-pane board tab', 'settings.boardEnabledDesc': 'Open the board in the right sidebar',
      'settings.boardThreshold': 'Full-board width threshold (px)',
      'settings.boardView': 'Default full-board view',
      'settings.blur': 'Search panel blur strength (px)',
      'settings.data': 'Data',
      'settings.reset': 'Restore defaults',
      'settings.resetAppearance': 'Clear project appearance (color/icon)',
      'settings.resetAppearanceHint': 'Restores default colors and icons immediately.',
      'settings.boardDisabled': 'Project Board is disabled in settings',
      'preset.standard': 'Standard mode', 'preset.ptc': 'PTC mode', 'preset.minimal': 'Minimal mode', 'preset.cordis': 'Creator mode', 'preset.none': 'Not set',
      'count.rows': '{n} rows',
      'empty.filtered': 'No matching rows',
      'open': 'Open',
      'card.current': 'Current', 'card.open': 'Open',
      'status.attention': 'Attention', 'status.approval': 'Waiting approval', 'status.plan': 'Plan review', 'status.question': 'Waiting answer',
      'status.running': 'Running', 'status.done': 'Completed', 'status.idle': 'Idle',
      'appearance.color': 'Color', 'appearance.icon': 'Icon', 'appearance.reset': 'Reset to default',
      'empty.title': 'No workspaces yet', 'empty.desc': 'Add a workspace and its sessions and projects appear here.',
      'loading': 'Loading workspaces…', 'session.untitled': 'Untitled session', 'workspace.default': 'Default workspace',
      'time.now': 'now', 'time.min': '{n}min', 'time.hour': '{n}h', 'time.day': '{n}d'
    };

    /* ------------------------------------------------------------ appearance */
    function loadAppearance() {
      try {
        const raw = window.localStorage.getItem(STORE_KEY);
        if (!raw) return {};
        const parsed = JSON.parse(raw);
        return parsed && typeof parsed === 'object' ? parsed : {};
      } catch (e) { return {}; }
    }
    function saveAppearance(value) {
      try { window.localStorage.setItem(STORE_KEY, JSON.stringify(value)); } catch (e) { /* ignore */ }
    }

    const PALETTE = ['#e5484d', '#f76b15', '#f5b301', '#30a46c', '#0ea5e9', '#3e63dd', '#8e4ec6', '#e93d82', '#6e7781'];
    const ICONS = ['folder', 'code', 'briefcase', 'pen', 'flask', 'star', 'bolt', 'book', 'globe', 'grid'];

    function hashString(value) {
      let hash = 0; const text = String(value);
      for (let i = 0; i < text.length; i += 1) hash = (hash * 31 + text.charCodeAt(i)) >>> 0;
      return hash;
    }
    function paletteFor(id) { return PALETTE[hashString(id) % PALETTE.length]; }
    function hexToRgba(hex, alpha) {
      const value = String(hex).replace('#', '');
      const full = value.length === 3 ? value.split('').map((c) => c + c).join('') : value;
      const num = parseInt(full, 16);
      if (Number.isNaN(num)) return 'rgba(110,119,129,' + alpha + ')';
      return 'rgba(' + ((num >> 16) & 255) + ',' + ((num >> 8) & 255) + ',' + (num & 255) + ',' + alpha + ')';
    }

    /* ----------------------------------------------------------------- icons */
    const PATHS = {
      chevron: ['M9 6l6 6-6 6'],
      board: ['M4 5h6v14H4z', 'M14 5h6v8h-6z', 'M14 17h6v2h-6z'],
      folder: ['M3 7.5A1.5 1.5 0 0 1 4.5 6h4l2 2h7A1.5 1.5 0 0 1 19 9.5v8A1.5 1.5 0 0 1 17.5 19h-13A1.5 1.5 0 0 1 3 17.5z'],
      code: ['M8.5 9L5.5 12l3 3', 'M15.5 9l3 3-3 3', 'M13 6l-2 12'],
      briefcase: ['M4 8h16v11H4z', 'M9 8V6.5A1.5 1.5 0 0 1 10.5 5h3A1.5 1.5 0 0 1 15 6.5V8'],
      pen: ['M4 20l4-1 10-10-3-3L5 16z', 'M14 6l3 3'],
      flask: ['M9.5 3h5', 'M10.5 3v6l-5 9a1 1 0 0 0 .9 1.5h12.2A1 1 0 0 0 19 18l-5-9V3'],
      star: ['M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 17l-5.2 2.6 1-5.8L3.5 9.7l5.9-.9z'],
      bolt: ['M13 2L4 14h7l-1 8 9-12h-7z'],
      book: ['M5 4h9a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z', 'M8 4v16'],
      globe: ['M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z', 'M3.5 9h17', 'M3.5 15h17', 'M12 3a14 14 0 0 1 0 18', 'M12 3a14 14 0 0 0 0 18'],
      grid: ['M4 4h7v7H4z', 'M13 4h7v7h-7z', 'M4 13h7v7H4z', 'M13 13h7v7h-7z'],
      palette: ['M12 21a9 9 0 1 1 0-18c5 0 9 3.6 9 8 0 2.2-1.8 3.5-4 3.5h-1.6a1.7 1.7 0 0 0-1.2 2.9c.5.6.3 1.6-.7 1.6z', 'M7.5 10.5h.01', 'M11 8h.01', 'M15 9h.01'],
      check: ['M5 12l4 4 10-10'],
      arrow: ['M5 12h14', 'M13 6l6 6-6 6'],
      clock: ['M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z', 'M12 7v5l3 2'],
      search: ['M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16z', 'M21 21l-4.3-4.3'],
      expand: ['M4 9V4h5', 'M20 15v5h-5', 'M15 4h5v5', 'M9 20H4v-5'],
      collapse: ['M9 4v5H4', 'M15 20v-5h5', 'M20 9h-5V4', 'M4 15h5v5'],
      alert: ['M12 4l9 16H3z', 'M12 10v4', 'M12 17h.01'],
      close: ['M6 6l12 12', 'M18 6L6 18'],
      up: ['M6 15l6-6 6 6'],
      down: ['M6 9l6 6 6-6'],
      bottom: ['M12 4v12', 'M7 11l5 5 5-5', 'M5 20h14']
    };
    function Icon(props) {
      const name = props.name || 'folder'; const size = props.size || 16; const strokeWidth = props.strokeWidth || 1.7;
      const paths = PATHS[name] || PATHS.folder;
      return h('svg', { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: strokeWidth, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': 'true', focusable: 'false' }, paths.map((d, i) => h('path', { key: i, d: d })));
    }

    /* --------------------------------------------------------------- helpers */
    function workspaceLabel(title, t) {
      if (!title || title === 'default-workspace') return t('workspace.default');
      return title;
    }
    function sessionTitleOf(summary, t) {
      const title = summary && typeof summary.title === 'string' ? summary.title.trim() : '';
      return title || t('session.untitled');
    }
    function statusInfo(status, summary) {
      const kind = status && status.pendingInteraction ? status.pendingInteraction.kind : undefined;
      if (kind === 'approval') return { tone: 'attention', labelKey: 'status.approval', rank: 4 };
      if (kind === 'plan-review') return { tone: 'attention', labelKey: 'status.plan', rank: 4 };
      if (kind === 'question') return { tone: 'attention', labelKey: 'status.question', rank: 4 };
      const running = status ? status.running : undefined;
      if (running === undefined ? summary && summary.running : running) return { tone: 'running', labelKey: 'status.running', rank: 3 };
      if (status && status.completionUnread) return { tone: 'done', labelKey: 'status.done', rank: 2 };
      return { tone: 'idle', labelKey: 'status.idle', rank: 1 };
    }
    function relTime(updatedAt, t) {
      if (!updatedAt) return '—';
      const diff = Math.max(0, Date.now() - updatedAt);
      const minutes = Math.floor(diff / 60000);
      if (minutes < 1) return t('time.now');
      if (minutes < 60) return t('time.min', { n: minutes });
      const hours = Math.floor(minutes / 60);
      if (hours < 24) return t('time.hour', { n: hours });
      return t('time.day', { n: Math.floor(hours / 24) });
    }

    const NO_SCHEDULE_HOOK = () => null;
    const NO_AUTO = new Set();
    /** Does this Session own at least one active automation task? Reads the same Host catalog the sidebar mark uses. */
    function createScheduleSource(ctx) {
      let snapshot = { status: 'loading', activeSessionIds: NO_AUTO };
      const listeners = new Set();
      let disposed = false;
      let epoch = 0;
      const publish = (next) => { snapshot = next; for (const listener of listeners) { try { listener(); } catch (error) { /* ignore */ } } };
      const read = async () => {
        const current = ++epoch;
        try {
          const result = await ctx.remote.schedule.catalog();
          if (disposed || current !== epoch) return;
          if (result && result.ok) {
            const active = new Set();
            for (const record of result.value || []) {
              if (record && record.status === 'active' && typeof record.sessionId === 'string') active.add(record.sessionId);
            }
            publish({ status: 'ready', activeSessionIds: active });
          } else {
            publish({ status: 'error', activeSessionIds: snapshot.activeSessionIds });
          }
        } catch (error) {
          if (!disposed && current === epoch) publish({ status: 'error', activeSessionIds: snapshot.activeSessionIds });
        }
      };
      const disposers = [];
      try { disposers.push(ctx.on('connection/reset', () => { read(); })); } catch (error) { /* ignore */ }
      try { if (ctx.remote && ctx.remote.$on) disposers.push(ctx.remote.$on('schedule/changed', () => { read(); })); } catch (error) { /* ignore */ }
      read();
      return {
        source: { getSnapshot: () => snapshot, subscribe: (listener) => { listeners.add(listener); return () => listeners.delete(listener); } },
        dispose: () => { disposed = true; for (const dispose of disposers) { try { if (typeof dispose === 'function') dispose(); } catch (error) { /* ignore */ } } }
      };
    }

    /** Load the authoritative Agent-preset roster (id -> display name). */
    function createPresetSource(ctx) {
      let snapshot = { status: 'loading', names: {} };
      const listeners = new Set();
      let disposed = false;
      let epoch = 0;
      const publish = (next) => { snapshot = next; for (const listener of listeners) { try { listener(); } catch (error) { /* ignore */ } } };
      const read = async () => {
        const current = ++epoch;
        try {
          const result = await ctx.remote.agentPresets.list();
          if (disposed || current !== epoch) return;
          if (result && result.ok) {
            const names = {};
            for (const preset of (result.value && result.value.presets) || []) {
              if (preset && typeof preset.id === 'string' && typeof preset.name === 'string' && preset.name.trim() !== '') names[preset.id] = preset.name.trim();
            }
            publish({ status: 'ready', names: names });
          } else {
            publish({ status: 'error', names: snapshot.names });
          }
        } catch (error) {
          if (!disposed && current === epoch) publish({ status: 'error', names: snapshot.names });
        }
      };
      const disposers = [];
      try { disposers.push(ctx.on('connection/reset', () => { read(); })); } catch (error) { /* ignore */ }
      read();
      return {
        source: { getSnapshot: () => snapshot, subscribe: (listener) => { listeners.add(listener); return () => listeners.delete(listener); } },
        dispose: () => { disposed = true; for (const dispose of disposers) { try { if (typeof dispose === 'function') dispose(); } catch (error) { /* ignore */ } } }
      };
    }
    const SORT_DIR_DEFAULT = { title: 'asc', project: 'asc', status: 'desc', kind: 'asc', running: 'desc', current: 'desc', preset: 'asc', updatedAt: 'desc', name: 'asc', appearance: 'asc', total: 'desc', auto: 'desc', attention: 'desc', done: 'desc', idle: 'desc', lastUpdated: 'desc' };

    /* ------------------------------------------------------------- component */
    function ProjectBoard(props) {
      const { useWorkspaces, useSessions, useSessionStatus, openSession, t } = props;
      const useScheduleCatalog = typeof props.useScheduleCatalog === 'function' ? props.useScheduleCatalog : NO_SCHEDULE_HOOK;
      const usePresets = typeof props.usePresets === 'function' ? props.usePresets : NO_SCHEDULE_HOOK;
      const useSettings = typeof props.useSettings === 'function' ? props.useSettings : NO_SCHEDULE_HOOK;
      const config = useSettings((snapshot) => snapshot) || DEFAULT_SETTINGS;
      const wsSnap = useWorkspaces((snapshot) => snapshot);
      const list = useSessions((snapshot) => snapshot);
      const statuses = useSessionStatus((snapshot) => snapshot);
      const scheduleSnap = useScheduleCatalog((snapshot) => snapshot);
      const presetSnap = usePresets((snapshot) => snapshot);
      const presetNames = (presetSnap && presetSnap.names) || {};
      const BUILTIN_PRESET_COPY = { standard: 'preset.standard', ptc: 'preset.ptc', minimal: 'preset.minimal', cordis: 'preset.cordis' };
      const presetText = (preset) => {
        if (!preset) return t('preset.none');
        if (presetNames[preset]) return presetNames[preset];
        return BUILTIN_PRESET_COPY[preset] ? t(BUILTIN_PRESET_COPY[preset]) : preset;
      };
      const autoSet = (scheduleSnap && scheduleSnap.activeSessionIds) || NO_AUTO;
      const compact = props.compact === true;
      const openFullBoard = props.openFullBoard;

      const [appearance, setAppearance] = useState(() => loadAppearance());
      useEffect(() => {
        const handler = () => setAppearance(loadAppearance());
        window.addEventListener('pbx-appearance-reset', handler);
        return () => window.removeEventListener('pbx-appearance-reset', handler);
      }, []);
      const [editingProject, setEditingProject] = useState(null);
      const popRef = useRef(null);
      const [view, setView] = useState(() => (config.board.defaultView === 'projects' ? 'projects' : 'sessions'));
      const [sessionSorts, setSessionSorts] = useState([{ key: 'updatedAt', dir: 'desc' }]);
      const [projectSorts, setProjectSorts] = useState([{ key: 'lastUpdated', dir: 'desc' }]);
      const sorts = view === 'sessions' ? sessionSorts : projectSorts;
      const [statusFilter, setStatusFilter] = useState('all');
      const [kindFilter, setKindFilter] = useState('all');
      const [projectFilter, setProjectFilter] = useState('all');
      const [query, setQuery] = useState('');
      const [grouped, setGrouped] = useState(false);
      const [collapsed, setCollapsed] = useState({});

      useEffect(() => {
        if (editingProject === null) return undefined;
        const onDown = (event) => { if (popRef.current && !popRef.current.contains(event.target)) setEditingProject(null); };
        document.addEventListener('pointerdown', onDown, true);
        return () => document.removeEventListener('pointerdown', onDown, true);
      }, [editingProject]);

      const updateAppearance = (id, patch) => {
        setAppearance((prev) => { const next = Object.assign({}, prev); next[id] = Object.assign({}, prev[id] || {}, patch); saveAppearance(next); return next; });
      };
      const resetAppearance = (id) => {
        setAppearance((prev) => { const next = Object.assign({}, prev); delete next[id]; saveAppearance(next); return next; });
      };
      const specOf = (workspaceId) => {
        const spec = appearance[workspaceId] || {};
        return { color: spec.color || paletteFor(workspaceId), icon: spec.icon || 'folder' };
      };

      const workspaces = (wsSnap && wsSnap.items) || [];
      const archived = useMemo(() => new Set((wsSnap && wsSnap.archivedSessionIds) || []), [wsSnap]);
      const byId = (list && list.byId) || {};
      const ids = (list && list.ids) || [];
      const ready = Boolean(list && list.phase === 'ready');

      const currentId = useMemo(() => {
        for (const id of ids) { const row = byId[id]; if (row && row.retainedBy && (row.retainedBy.mainView || 0) > 0) return id; }
        return undefined;
      }, [ids, byId]);

      const allSessions = useMemo(() => {
        const out = [];
        for (const workspace of workspaces) {
          for (const sessionId of workspace.sessionIds || []) {
            const summary = byId[sessionId];
            if (!summary || summary.origin === 'subagent' || summary.blank) continue;
            if (archived.has(sessionId)) continue;
            const status = statuses ? statuses.get(sessionId) : undefined;
            const info = statusInfo(status, summary);
            out.push({
              id: sessionId, title: sessionTitleOf(summary, t),
              workspaceId: workspace.workspaceId, workspaceLabel: workspaceLabel(workspace.title, t), workspacePath: workspace.path || '',
              info: info, updatedAt: summary.updatedAt || 0, running: info.tone === 'running', current: sessionId === currentId,
              preset: (summary.projectionValues && typeof summary.projectionValues.agentPreset === 'string') ? summary.projectionValues.agentPreset : '',
              auto: autoSet.has(sessionId)
            });
          }
        }
        return out;
      }, [workspaces, byId, archived, statuses, currentId, t, autoSet]);

      const projectModels = useMemo(() => {
        return workspaces.map((workspace) => {
          const rows = allSessions.filter((s) => s.workspaceId === workspace.workspaceId);
          const counts = { total: rows.length, running: 0, attention: 0, done: 0, idle: 0, auto: 0 };
          let last = 0;
          for (const row of rows) { if (counts[row.info.tone] !== undefined) counts[row.info.tone] += 1; if (row.auto) counts.auto += 1; last = Math.max(last, row.updatedAt); }
          if (!last) last = Date.parse(workspace.updatedAt) || 0;
          return { workspaceId: workspace.workspaceId, name: workspaceLabel(workspace.title, t), path: workspace.path || '', counts: counts, lastUpdated: last };
        });
      }, [workspaces, allSessions, t]);

      const totals = useMemo(() => {
        const acc = { workspaces: workspaces.length, sessions: allSessions.length, attention: 0, running: 0 };
        for (const s of allSessions) { if (s.info.tone === 'running') acc.running += 1; if (s.info.tone === 'attention') acc.attention += 1; }
        return acc;
      }, [workspaces, allSessions]);

      const open = (id) => { if (typeof openSession === 'function') openSession(id); };

      const sortBy = (key, additive) => {
        const setter = view === 'sessions' ? setSessionSorts : setProjectSorts;
        setter((previous) => {
          const existing = previous.findIndex((entry) => entry.key === key);
          if (!additive) {
            if (previous.length === 1 && previous[0].key === key) return [{ key: key, dir: previous[0].dir === 'asc' ? 'desc' : 'asc' }];
            return [{ key: key, dir: SORT_DIR_DEFAULT[key] || 'asc' }];
          }
          if (existing >= 0) {
            const next = previous.slice();
            next[existing] = { key: key, dir: previous[existing].dir === 'asc' ? 'desc' : 'asc' };
            return next;
          }
          if (previous.length >= 4) return previous;
          return previous.concat([{ key: key, dir: SORT_DIR_DEFAULT[key] || 'asc' }]);
        });
      };
      const sessionSortValue = (row, key) => {
        if (key === 'title') return row.title.toLowerCase();
        if (key === 'project') return row.workspaceLabel.toLowerCase();
        if (key === 'status') return row.info.rank;
        if (key === 'kind') return row.auto ? 0 : 1;
        if (key === 'preset') return presetText(row.preset).toLowerCase();
        if (key === 'updatedAt') return row.updatedAt;
        return 0;
      };
      const projectSortValue = (project, key) => {
        if (key === 'name') return project.name.toLowerCase();
        if (key === 'lastUpdated') return project.lastUpdated;
        return project.counts[key] !== undefined ? project.counts[key] : 0;
      };
      const compareBySorts = (sortList, valueOf) => (a, b) => {
        for (const entry of sortList) {
          const va = valueOf(a, entry.key);
          const vb = valueOf(b, entry.key);
          const dir = entry.dir === 'asc' ? 1 : -1;
          if (va < vb) return -dir;
          if (va > vb) return dir;
        }
        return 0;
      };

      const filteredSessions = useMemo(() => {
        const q = query.trim().toLowerCase();
        let rows = allSessions.filter((s) => {
          if (statusFilter !== 'all' && s.info.tone !== statusFilter) return false;
          if (kindFilter === 'auto' && !s.auto) return false;
          if (kindFilter === 'normal' && s.auto) return false;
          if (projectFilter !== 'all' && s.workspaceId !== projectFilter) return false;
          if (q && !(s.title.toLowerCase().includes(q) || s.workspaceLabel.toLowerCase().includes(q))) return false;
          return true;
        });
        rows = rows.slice().sort(compareBySorts(sessionSorts, sessionSortValue));
        return rows;
      }, [allSessions, statusFilter, kindFilter, projectFilter, query, sessionSorts, presetNames, t]);

      const filteredProjects = useMemo(() => {
        const q = query.trim().toLowerCase();
        let rows = projectModels.filter((p) => !q || p.name.toLowerCase().includes(q) || p.path.toLowerCase().includes(q));
        rows = rows.slice().sort(compareBySorts(projectSorts, projectSortValue));
        return rows;
      }, [projectModels, query, projectSorts]);

      const renderPopover = (workspaceId, color, icon) => {
        const spec = appearance[workspaceId] || {};
        return h('div', { className: 'pbx-pop', ref: popRef, onClick: (event) => event.stopPropagation() },
          h('div', { className: 'pbx-popLabel' }, t('appearance.color')),
          h('div', { className: 'pbx-swatches' }, PALETTE.map((value) => h('button', {
            key: value, type: 'button', className: 'pbx-swatchBtn' + ((spec.color || color) === value ? ' sel' : ''), style: { background: value }, 'aria-label': value,
            onClick: (event) => { event.stopPropagation(); updateAppearance(workspaceId, { color: value }); }
          }))),
          h('div', { className: 'pbx-popLabel' }, t('appearance.icon')),
          h('div', { className: 'pbx-icons' }, ICONS.map((name) => h('button', {
            key: name, type: 'button', className: 'pbx-iconBtn' + ((spec.icon || icon) === name ? ' sel' : ''), 'aria-label': name,
            onClick: (event) => { event.stopPropagation(); updateAppearance(workspaceId, { icon: name }); }
          }, h(Icon, { name: name, size: 16 })))),
          h('button', { type: 'button', className: 'pbx-reset', onClick: (event) => { event.stopPropagation(); resetAppearance(workspaceId); } }, t('appearance.reset'))
        );
      };

      const projectChip = (workspaceId, label, size) => {
        const spec = specOf(workspaceId);
        return h('span', { className: 'pbx-chip' },
          h('span', { className: 'pbx-chipIcon' + (size === 'lg' ? ' lg' : ''), style: { color: spec.color, background: hexToRgba(spec.color, 0.16) } }, h(Icon, { name: spec.icon, size: size === 'lg' ? 15 : 12 })),
          h('span', { className: 'pbx-chipName' }, label)
        );
      };

      const statusPill = (info) => h('span', { className: 'pbx-statusPill', 'data-tone': info.tone },
        h('span', { className: 'pbx-kdot', 'data-tone': info.tone }), t(info.labelKey));

      const th = (key, label, type, options) => {
        const opts = options || {};
        const position = sorts.findIndex((entry) => entry.key === key);
        const active = position >= 0;
        const direction = active ? sorts[position].dir : null;
        return h('th', {
          className: 'pbx-th' + (opts.sortable === false ? '' : ' sortable') + (active ? ' active' : '') + (opts.num ? ' num' : ''),
          title: opts.sortable === false ? undefined : t('sort.hint'),
          onClick: opts.sortable === false ? undefined : (event) => sortBy(key, Boolean(event.shiftKey))
        },
          h('span', { className: 'pbx-thType' }, type || ''),
          h('span', { className: 'pbx-thLabel' }, label),
          active ? h('span', { className: 'pbx-sortMark' }, (sorts.length > 1 ? String(position + 1) : '') + (direction === 'asc' ? '↑' : '↓')) : null
        );
      };

      const renderSessionRow = (row) => h('tr', {
        key: row.id, className: 'pbx-tr' + (row.running ? ' pbx-tr-live' : '') + (row.current ? ' pbx-tr-current' : '') + (row.auto ? ' pbx-tr-auto' : ''),
        onClick: () => open(row.id), tabIndex: 0,
        onKeyDown: (e) => { if (e.key === 'Enter') open(row.id); }
      },
        h('td', null, h('div', { className: 'pbx-titleCell' },
          row.auto ? h('span', { className: 'pbx-autoGlyph', title: t('kind.auto') }, h(Icon, { name: 'clock', size: 13 })) : null,
          h('span', { className: 'pbx-rdot', 'data-tone': row.info.tone }),
          h('span', { className: 'pbx-titleText' }, row.title),
          row.current ? h('span', { className: 'pbx-curTag' }, t('card.current')) : null
        )),
        h('td', null, projectChip(row.workspaceId, row.workspaceLabel)),
        h('td', null, statusPill(row.info)),
        h('td', null, row.auto ? h('span', { className: 'pbx-kindTag auto' }, h(Icon, { name: 'clock', size: 12 }), t('kind.auto')) : h('span', { className: 'pbx-kindTag' }, t('kind.normal'))),
        h('td', null, row.preset ? h('span', { className: 'pbx-modeTag' }, presetText(row.preset)) : h('span', { className: 'pbx-modeTag empty' }, t('preset.none'))),
        h('td', { className: 'pbx-num' }, relTime(row.updatedAt, t)),
        h('td', { className: 'pbx-center' }, h('button', {
          type: 'button', className: 'pbx-openBtn', title: t('open'), 'aria-label': t('open'),
          onClick: (e) => { e.stopPropagation(); open(row.id); }
        }, h(Icon, { name: 'arrow', size: 14 })))
      );

      const renderGroupHeader = (workspaceId, label, count) => {
        const isCollapsed = collapsed[workspaceId] === true;
        return h('tr', { key: 'g-' + workspaceId, className: 'pbx-groupRow' },
          h('td', { colSpan: 7, onClick: () => setCollapsed((prev) => Object.assign({}, prev, { [workspaceId]: !isCollapsed })) },
            h('span', { className: 'pbx-groupChevron' + (isCollapsed ? '' : ' open') }, h(Icon, { name: 'chevron', size: 13 })),
            projectChip(workspaceId, label, 'lg'),
            h('span', { className: 'pbx-groupCount' }, t('count.rows', { n: count }))
          )
        );
      };

      const renderSessionsBody = () => {
        if (filteredSessions.length === 0) {
          return h('tr', null, h('td', { colSpan: 7, className: 'pbx-emptyCell' }, t('empty.filtered')));
        }
        if (!grouped) return filteredSessions.map(renderSessionRow);
        const rows = [];
        for (const project of projectModels) {
          const groupRows = filteredSessions.filter((s) => s.workspaceId === project.workspaceId);
          if (groupRows.length === 0) continue;
          rows.push(renderGroupHeader(project.workspaceId, project.name, groupRows.length));
          if (collapsed[project.workspaceId] !== true) rows.push.apply(rows, groupRows.map(renderSessionRow));
        }
        return rows;
      };

      const renderProjectRow = (project) => {
        const spec = specOf(project.workspaceId);
        const isEditing = editingProject === project.workspaceId;
        return h('tr', { key: project.workspaceId, className: 'pbx-tr', tabIndex: 0,
          onClick: () => { setProjectFilter(project.workspaceId); setView('sessions'); setStatusFilter('all'); },
          onKeyDown: (e) => { if (e.key === 'Enter') { setProjectFilter(project.workspaceId); setView('sessions'); } }
        },
          h('td', null, h('div', { className: 'pbx-titleCell' },
            h('span', { className: 'pbx-chipIcon lg', style: { color: spec.color, background: hexToRgba(spec.color, 0.16) } }, h(Icon, { name: spec.icon, size: 15 })),
            h('div', { className: 'pbx-twoLine' }, h('div', { className: 'pbx-titleText' }, project.name), h('div', { className: 'pbx-subText' }, project.path))
          )),
          h('td', null, h('span', { className: 'pbx-appearCell', style: { position: 'relative' } },
            h('span', { className: 'pbx-miniSwatch', style: { background: spec.color } }),
            h('button', { type: 'button', className: 'pbx-appearBtn', onClick: (e) => { e.stopPropagation(); setEditingProject(isEditing ? null : project.workspaceId); } },
              h(Icon, { name: 'palette', size: 13 }), h('span', null, t('col.appearance'))),
            isEditing ? renderPopover(project.workspaceId, spec.color, spec.icon) : null
          )),
          h('td', { className: 'pbx-num pbx-strong' }, String(project.counts.total)),
          h('td', { className: 'pbx-num', style: { color: project.counts.auto > 0 ? 'var(--dsw-alias-state-warn-primary)' : undefined } }, String(project.counts.auto)),
          h('td', { className: 'pbx-num', style: { color: project.counts.running > 0 ? 'var(--dsw-alias-brand-primary)' : undefined } }, String(project.counts.running)),
          h('td', { className: 'pbx-num', style: { color: project.counts.attention > 0 ? 'var(--dsw-alias-state-error-primary)' : undefined } }, String(project.counts.attention)),
          h('td', { className: 'pbx-num' }, String(project.counts.done)),
          h('td', { className: 'pbx-num' }, String(project.counts.idle)),
          h('td', { className: 'pbx-num' }, relTime(project.lastUpdated, t))
        );
      };

      const header = h('div', { className: 'pbx-header' },
        h('div', null,
          h('div', { className: 'pbx-titleRow' }, h('span', { className: 'pbx-glyph' }, h(Icon, { name: 'board', size: 20 })), h('span', null, t('title'))),
          h('div', { className: 'pbx-subtitle' }, t('subtitle'))
        ),
        h('div', { className: 'pbx-headerRight' },
          h('div', { className: 'pbx-totals' },
            h('span', { className: 'pbx-total' }, h('strong', null, String(totals.workspaces)), t('stat.workspaces')),
            h('span', { className: 'pbx-total' }, h('strong', null, String(totals.sessions)), t('stat.sessions')),
            totals.attention > 0 ? h('span', { className: 'pbx-total' }, h('strong', { style: { color: 'var(--dsw-alias-state-error-primary)' } }, String(totals.attention)), t('stat.attention')) : null,
            totals.running > 0 ? h('span', { className: 'pbx-total' }, h('strong', { style: { color: 'var(--dsw-alias-brand-primary)' } }, String(totals.running)), t('stat.running')) : null
          )
        )
      );

      const toolbar = h('div', { className: 'pbx-toolbar' },
        h('div', { className: 'pbx-tabs' },
          h('button', { type: 'button', className: 'pbx-tab' + (view === 'sessions' ? ' active' : ''), onClick: () => setView('sessions') }, t('view.sessions'), h('span', { className: 'pbx-tabCount' }, String(allSessions.length))),
          h('button', { type: 'button', className: 'pbx-tab' + (view === 'projects' ? ' active' : ''), onClick: () => setView('projects') }, t('view.projects'), h('span', { className: 'pbx-tabCount' }, String(projectModels.length)))
        ),
        h('div', { className: 'pbx-tools' },
          h('input', { className: 'pbx-input', type: 'text', placeholder: t('filter.search'), value: query, onChange: (e) => setQuery(e.target.value) }),
          view === 'sessions' ? h('select', { className: 'pbx-select', value: statusFilter, onChange: (e) => setStatusFilter(e.target.value), 'aria-label': t('filter.status') },
            h('option', { value: 'all' }, t('filter.status') + ': ' + t('filter.all')),
            h('option', { value: 'running' }, t('status.running')),
            h('option', { value: 'attention' }, t('status.attention')),
            h('option', { value: 'done' }, t('status.done')),
            h('option', { value: 'idle' }, t('status.idle'))
          ) : null,
          view === 'sessions' ? h('select', { className: 'pbx-select', value: kindFilter, onChange: (e) => setKindFilter(e.target.value), 'aria-label': t('filter.kind') },
            h('option', { value: 'all' }, t('filter.kind') + ': ' + t('filter.all')),
            h('option', { value: 'auto' }, t('kind.auto')),
            h('option', { value: 'normal' }, t('kind.normal'))
          ) : null,
          view === 'sessions' ? h('select', { className: 'pbx-select', value: projectFilter, onChange: (e) => setProjectFilter(e.target.value), 'aria-label': t('filter.project') },
            h('option', { value: 'all' }, t('filter.project') + ': ' + t('filter.all')),
            projectModels.map((p) => h('option', { key: p.workspaceId, value: p.workspaceId }, p.name))
          ) : null,
          view === 'sessions' ? h('button', { type: 'button', className: 'pbx-toggle' + (grouped ? ' on' : ''), onClick: () => setGrouped((v) => !v) }, t('group.byProject')) : null,
          h('span', { className: 'pbx-sortHint' }, t('sort.hint'))
        )
      );

      let body;
      if (!ready && workspaces.length === 0) {
        body = h('div', { className: 'pbx-loading' }, t('loading'));
      } else if (workspaces.length === 0) {
        body = h('div', { className: 'pbx-empty' },
          h('div', { className: 'pbx-emptyIcon' }, h(Icon, { name: 'board', size: 30 })),
          h('div', { className: 'pbx-emptyTitle' }, t('empty.title')),
          h('div', { className: 'pbx-emptyDesc' }, t('empty.desc'))
        );
      } else if (view === 'sessions') {
        body = h('div', { className: 'pbx-dbScroll' },
          h('table', { className: 'pbx-table' },
            h('thead', null, h('tr', null,
              th('title', t('col.title'), 'Aa'),
              th('project', t('col.project'), '↗'),
              th('status', t('col.status'), '◉'),
              th('kind', t('col.kind'), '◇'),
              th('preset', t('col.preset'), '◈'),
              th('updatedAt', t('col.updated'), '◷', { num: true }),
              th('open', '', '', { sortable: false })
            )),
            h('tbody', null, renderSessionsBody())
          ),
          h('div', { className: 'pbx-dbFoot' }, t('count.rows', { n: filteredSessions.length }))
        );
      } else {
        body = h('div', { className: 'pbx-dbScroll' },
          h('table', { className: 'pbx-table' },
            h('thead', null, h('tr', null,
              th('name', t('col.project'), 'Aa'),
              th('appearance', t('col.appearance'), '◨', { sortable: false }),
              th('total', t('col.total'), '#', { num: true }),
              th('auto', t('stat.auto'), '#', { num: true }),
              th('running', t('stat.running'), '#', { num: true }),
              th('attention', t('stat.attention'), '#', { num: true }),
              th('done', t('status.done'), '#', { num: true }),
              th('idle', t('status.idle'), '#', { num: true }),
              th('lastUpdated', t('col.updated'), '◷', { num: true })
            )),
            h('tbody', null,
              filteredProjects.length === 0
                ? h('tr', null, h('td', { colSpan: 9, className: 'pbx-emptyCell' }, t('empty.filtered')))
                : filteredProjects.map(renderProjectRow)
            )
          ),
          h('div', { className: 'pbx-dbFoot' }, t('count.rows', { n: filteredProjects.length }))
        );
      }

      if (compact) {
        const defs = [
          { tone: 'running', titleKey: 'col.running' },
          { tone: 'attention', titleKey: 'col.attention' },
          { tone: 'done', titleKey: 'col.done' },
          { tone: 'idle', titleKey: 'col.idle' }
        ];
        const groups = defs.map((def) => ({ tone: def.tone, titleKey: def.titleKey, rows: allSessions.filter((row) => row.info.tone === def.tone).slice().sort((a, b) => b.updatedAt - a.updatedAt) }));
        return h('div', { className: 'pbx-root pbx-compact' }, h('div', { className: 'pbx-compactWrap' },
          h('div', { className: 'pbx-compactHead' },
            h('div', { className: 'pbx-compactTitle' }, h(Icon, { name: 'board', size: 16 }), h('span', null, t('title'))),
            h('div', { className: 'pbx-compactMeta' }, String(totals.running) + ' ' + t('stat.running') + ' · ' + String(totals.attention) + ' ' + t('stat.attention')),
            (typeof openFullBoard === 'function' ? h('button', { type: 'button', className: 'pbx-compactFull', title: t('compact.full'), onClick: () => openFullBoard() }, h(Icon, { name: 'expand', size: 14 })) : null)
          ),
          groups.map((group) => h('div', { className: 'pbx-cgroup', key: group.tone },
            h('div', { className: 'pbx-cgroupHead' },
              h('span', { className: 'pbx-kdot', 'data-tone': group.tone }),
              h('span', { className: 'pbx-cgroupTitle' }, t(group.titleKey)),
              h('span', { className: 'pbx-cgroupCount' }, String(group.rows.length))
            ),
            group.rows.length === 0
              ? h('div', { className: 'pbx-cgroupEmpty' }, t('col.empty'))
              : group.rows.map((row) => h('button', {
                  key: row.id, type: 'button', className: 'pbx-crow' + (row.auto ? ' auto' : '') + (row.running ? ' live' : ''),
                  title: t('card.open'), onClick: () => open(row.id)
                },
                  h('span', { className: 'pbx-rdot', 'data-tone': row.info.tone }),
                  row.auto ? h('span', { className: 'pbx-autoGlyph' }, h(Icon, { name: 'clock', size: 12 })) : null,
                  h('span', { className: 'pbx-ctitle' }, row.title),
                  h('span', { className: 'pbx-ctime' }, relTime(row.updatedAt, t))
                ))
          ))
        ));
      }

      return h('div', { className: 'pbx-root' }, h('div', { className: 'pbx-wrap' }, header, toolbar, body));
    }

    /* ------------------------------------------------------- shared UI store */
    function createUiStore(initial) {
      let snapshot = initial;
      const listeners = new Set();
      const emit = () => { for (const listener of listeners) { try { listener(); } catch (error) { /* ignore */ } } };
      return {
        getSnapshot: () => snapshot,
        subscribe: (listener) => { listeners.add(listener); return () => listeners.delete(listener); },
        set: (patch) => { snapshot = Object.assign({}, snapshot, patch); emit(); },
        toggle: (key) => { snapshot = Object.assign({}, snapshot, { [key]: !snapshot[key] }); emit(); }
      };
    }

    /* -------------------------------------------------------- global header nav */
    function HeaderLeading(props) { return h(HeaderButtons, Object.assign({}, props, { side: 'left', placement: 'header' })); }
    function HeaderUtilities(props) { return h(HeaderButtons, Object.assign({}, props, { side: 'right', placement: 'header' })); }
    function ComposerDockButtons(props) { return h(HeaderButtons, Object.assign({}, props, { side: 'composer', placement: 'composer' })); }

    function HeaderButtons(props) {
      const { useSessions, useSessionStatus, useWorkspaces, t, openBoard } = props;
      const usePalette = typeof props.usePalette === 'function' ? props.usePalette : NO_SCHEDULE_HOOK;
      const useSettings = typeof props.useSettings === 'function' ? props.useSettings : NO_SCHEDULE_HOOK;
      const useHeaderDrag = typeof props.useHeaderDrag === 'function' ? props.useHeaderDrag : NO_SCHEDULE_HOOK;
      const palette = props.palette;
      const config = useSettings((snapshot) => snapshot) || DEFAULT_SETTINGS;
      const dragSnap = useHeaderDrag((snapshot) => snapshot) || { id: null, side: null, index: -1, width: 0 };
      const list = useSessions((snapshot) => snapshot);
      const statuses = useSessionStatus((snapshot) => snapshot);
      const wsSnap = useWorkspaces((snapshot) => snapshot);
      const paletteSnap = usePalette((snapshot) => snapshot);
      const open = Boolean(paletteSnap && paletteSnap.open);
      const archived = new Set((wsSnap && wsSnap.archivedSessionIds) || []);
      const ids = (list && list.ids) || [];
      const byId = (list && list.byId) || {};
      let currentId;
      for (const id of ids) { const row = byId[id]; if (row && row.retainedBy && (row.retainedBy.mainView || 0) > 0) { currentId = id; break; } }
      let running = 0;
      let attention = 0;
      for (const id of ids) {
        const row = byId[id];
        if (!row || row.blank || row.origin === 'subagent' || archived.has(id)) continue;
        const info = statusInfo(statuses ? statuses.get(id) : undefined, row);
        if (info.tone === 'running') running += 1;
        else if (info.tone === 'attention') attention += 1;
      }
      const title = currentId ? sessionTitleOf(byId[currentId], t) : '';
      const showSwitch = config.palette.enabled !== false;
      const showStats = true;
      const showBoard = config.board.enabled !== false;
      const placement = config.header && config.header.placement === 'composer' ? 'composer' : 'header';
      const buttons = config.headerButtons || DEFAULT_SETTINGS.headerButtons;
      const nodes = {
        switch: showSwitch ? h('button', {
          type: 'button', className: 'pbx-navSwitch' + (open ? ' active' : ''),
          title: t('nav.switch') + ' (' + (comboDisplay(config.shortcuts.palette) || 'Alt+K') + ')' + (title ? ' · ' + title : ''),
          onClick: () => { if (palette) palette.set({ open: true }); }
        },
          h(Icon, { name: 'search', size: 14 }),
          h('span', { className: 'pbx-navTitle' }, t('nav.switchLabel')),
          h('kbd', { className: 'pbx-kbd' }, comboDisplay(config.shortcuts.palette) || 'Alt+K')
        ) : null,
        historyNav: h('div', { className: 'pbx-navHistory' },
          h('button', { type: 'button', className: 'pbx-navSeg', title: t('settings.shortcut.userPrev') + ' (' + comboDisplay(config.shortcuts.userPrev) + ')', 'aria-label': t('settings.shortcut.userPrev'), onClick: () => jumpUserMessage(-1) }, h(Icon, { name: 'up', size: 14 })),
          h('button', { type: 'button', className: 'pbx-navSeg', title: t('settings.shortcut.userNext') + ' (' + comboDisplay(config.shortcuts.userNext) + ')', 'aria-label': t('settings.shortcut.userNext'), onClick: () => jumpUserMessage(1) }, h(Icon, { name: 'down', size: 14 })),
          h('button', { type: 'button', className: 'pbx-navSeg', title: t('settings.shortcut.scrollBottom') + ' (' + comboDisplay(config.shortcuts.scrollBottom) + ')', 'aria-label': t('settings.shortcut.scrollBottom'), onClick: () => scrollToComposerAndFocus() }, h(Icon, { name: 'bottom', size: 14 }))
        ),
        capsule: (showStats || showBoard) ? h('button', {
          type: 'button', className: 'pbx-capsule',
          title: t('nav.openBoard') + ' · ' + comboDisplay(config.shortcuts.prev) + ' / ' + comboDisplay(config.shortcuts.next),
          onClick: () => { if (showBoard) openBoard(); }
        },
          showStats ? h('span', { className: 'pbx-capStat' + (running > 0 ? ' live' : '') }, h('span', { className: 'pbx-liveDot' }), String(running)) : null,
          showStats && attention > 0 ? h('span', { className: 'pbx-capStat attn' }, h('span', { className: 'pbx-capDot' }), String(attention)) : null,
          showBoard ? h('span', { className: 'pbx-capBoard' }, h(Icon, { name: 'board', size: 14 }), t('nav.board')) : null
        ) : null
      };
      if (props.placement === 'composer') {
        if (placement !== 'composer') return null;
        const dockIds = Object.keys(DEFAULT_SETTINGS.headerButtons)
          .filter((id) => buttons[id] && buttons[id].hidden !== true && Boolean(nodes[id]))
          .sort((a, b) => ((buttons[a].order || 0) - (buttons[b].order || 0)));
        if (dockIds.length === 0) return null;
        return h('div', { className: 'pbx-dockButtons' },
          dockIds.map((id) => h('div', { key: id, className: 'pbx-navItem', 'data-hb-id': id }, nodes[id]))
        );
      }
      if (placement === 'composer') {
        if (!currentId && props.side === 'left') {
          const fallbackIds = Object.keys(DEFAULT_SETTINGS.headerButtons)
            .filter((id) => buttons[id] && buttons[id].hidden !== true && Boolean(nodes[id]))
            .sort((a, b) => ((buttons[a].order || 0) - (buttons[b].order || 0)));
          if (fallbackIds.length > 0) {
            return h('div', { className: 'pbx-nav' },
              fallbackIds.map((id) => h('div', { key: id, className: 'pbx-navItem' }, nodes[id]))
            );
          }
        }
        return null;
      }
      const sideIds = Object.keys(DEFAULT_SETTINGS.headerButtons)
        .filter((id) => {
          const side = (buttons[id] && buttons[id].side) || 'left';
          if (props.side === 'right') return Boolean(currentId) && side === 'right';
          return side === 'left' || (!currentId && side === 'right');
        })
        .filter((id) => buttons[id] && buttons[id].hidden !== true)
        .filter((id) => Boolean(nodes[id]))
        .filter((id) => id !== dragSnap.id)
        .sort((a, b) => ((buttons[a].order || 0) - (buttons[b].order || 0)));
      const children = sideIds.map((id) => h('div', {
        key: id, className: 'pbx-navItem', 'data-hb-id': id,
        onPointerDown: (event) => startHeaderButtonDrag(id, event, props.saveSettings, config, props.headerDrag),
        onClickCapture: (event) => { if (headerClickBlocked()) { event.preventDefault(); event.stopPropagation(); } }
      }, nodes[id]));
      if (dragSnap.id && dragSnap.index >= 0 && dragSnap.side === props.side) {
        const gapIndex = Math.max(0, Math.min(dragSnap.index < 0 ? children.length : dragSnap.index, children.length));
        children.splice(gapIndex, 0, h('div', {
          key: '__headerGap', className: 'pbx-navGap',
          style: { width: (dragSnap.width || 0) + 'px' }
        }));
      }
      return h('div', {
        className: 'pbx-nav' + (props.side === 'right' ? ' pbx-navRight' : '') + (children.length === 0 ? ' pbx-navEmpty' : '')
      }, children);
    }

    /* ------------------------------------------------------- composer shortcut hints */
    function ShortcutHints(props) {
      const { t } = props;
      const useSettings = typeof props.useSettings === 'function' ? props.useSettings : NO_SCHEDULE_HOOK;
      const config = useSettings((snapshot) => snapshot) || DEFAULT_SETTINGS;
      if (config.hints && config.hints.shortcuts === false) return null;
      const dismiss = () => {
        const next = cloneJson(config);
        next.hints = Object.assign({}, next.hints, { shortcuts: false });
        if (typeof props.saveSettings === 'function') props.saveSettings(next);
      };
      const item = (combo, label) => h('span', { className: 'pbx-hintItem' },
        h('kbd', { className: 'pbx-hintKey' }, comboDisplay(combo)),
        h('span', { className: 'pbx-hintLabel' }, label)
      );
      return h('div', { className: 'pbx-shortcutHints' },
        h('span', { className: 'pbx-hintGroup' },
          h('span', { className: 'pbx-hintGroupLabel' }, t('hud.groupSession')),
          item(config.shortcuts.prev, t('hud.prev')),
          item(config.shortcuts.next, t('hud.next'))
        ),
        h('span', { className: 'pbx-hintSep' }),
        h('span', { className: 'pbx-hintGroup' },
          h('span', { className: 'pbx-hintGroupLabel' }, t('hud.groupMessage')),
          item(config.shortcuts.userPrev, t('hud.prevInstruction')),
          item(config.shortcuts.userNext, t('hud.nextInstruction')),
          item(config.shortcuts.scrollBottom, t('hud.toBottom'))
        ),
        h('button', {
          type: 'button', className: 'pbx-hintClose', title: t('hints.dismiss'), 'aria-label': t('hints.dismiss'),
          onClick: dismiss
        }, '×')
      );
    }

    /* ------------------------------------------------------------- notifications */
    function ToastStack(props) {
      const { t, dismissToast } = props;
      const useToasts = typeof props.useToasts === 'function' ? props.useToasts : NO_SCHEDULE_HOOK;
      const snap = useToasts((value) => value);
      const items = (snap && snap.items) || [];
      if (items.length === 0) return null;
      return h('div', { className: 'pbx-toasts', role: 'status', 'aria-live': 'polite' },
        items.map((item) => h('div', { key: item.id, className: 'pbx-toast', 'data-tone': item.tone || 'warn' },
          h('span', { className: 'pbx-toastIcon' }, h(Icon, { name: 'alert', size: 15 })),
          h('div', { className: 'pbx-toastMain' },
            item.title ? h('div', { className: 'pbx-toastTitle' }, item.title) : null,
            item.message ? h('div', { className: 'pbx-toastMsg' }, item.message) : null
          ),
          h('button', {
            type: 'button', className: 'pbx-toastClose', title: t('toast.dismiss'), 'aria-label': t('toast.dismiss'),
            onClick: () => { if (typeof dismissToast === 'function') dismissToast(item.id); }
          }, h(Icon, { name: 'close', size: 12 }))
        ))
      );
    }

    /* --------------------------------------------------- task notifications */
    let notificationAudio = null;
    function playNotifyChime() {
      try {
        const Ctor = window.AudioContext || window.webkitAudioContext;
        if (!Ctor) return;
        if (!notificationAudio) notificationAudio = new Ctor();
        const context = notificationAudio;
        if (context.state === 'suspended') { try { context.resume(); } catch (error) { /* ignore */ } }
        const start = context.currentTime + 0.01;
        [880, 1174.66].forEach((frequency, index) => {
          const at = start + index * 0.13;
          const oscillator = context.createOscillator();
          const gain = context.createGain();
          oscillator.type = 'sine';
          oscillator.frequency.value = frequency;
          gain.gain.setValueAtTime(0.0001, at);
          gain.gain.exponentialRampToValueAtTime(0.16, at + 0.03);
          gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.32);
          oscillator.connect(gain);
          gain.connect(context.destination);
          oscillator.start(at);
          oscillator.stop(at + 0.34);
        });
      } catch (error) { /* ignore */ }
    }

    function notificationChannelFocused() {
      try { return document.visibilityState === 'visible' && document.hasFocus(); } catch (error) { return true; }
    }

    function showSystemNotification(title, body, sessionId, onOpen) {
      try {
        const Ctor = window.Notification;
        if (typeof Ctor !== 'function') return false;
        const present = () => {
          try {
            const note = new Ctor(title, { body: body, tag: String(sessionId || 'dsh-task') });
            note.onclick = () => {
              try { window.focus(); } catch (error) { /* ignore */ }
              if (typeof onOpen === 'function') onOpen();
              try { note.close(); } catch (error) { /* ignore */ }
            };
            return true;
          } catch (error) { return false; }
        };
        if (Ctor.permission === 'granted') return present();
        if (Ctor.permission === 'default' && typeof Ctor.requestPermission === 'function') {
          Ctor.requestPermission().then((result) => { if (result === 'granted') present(); }).catch(() => {});
          return true;
        }
        return false;
      } catch (error) { return false; }
    }

    /** Full question text plus every option, or the approval reason and choices. */
    function formatPendingNotification(pending, title, t) {
      if (!pending) return '';
      if (pending.kind === 'approval') {
        const reason = pending.displayReason || pending.reason || '';
        return t('notif.approvalBody', { title: title, tool: pending.toolName || '' })
          + (reason ? '\n' + String(reason) : '')
          + '\n' + t('notif.approvalChoices');
      }
      const questions = Array.isArray(pending.questions) ? pending.questions : [];
      const blocks = questions.map((question, index) => {
        const head = (questions.length > 1 ? String(index + 1) + '. ' : '') + String(question.question || '');
        const options = (Array.isArray(question.options) ? question.options : [])
          .map((option, optionIndex) => '  ' + String(optionIndex + 1) + ') ' + String(option.label || '') + (option.description ? ' — ' + String(option.description) : ''))
          .join('\n');
        return options ? head + '\n' + options : head;
      });
      const multi = questions.some((question) => question.multiSelect === true) ? '\n' + t('notif.multiSelect') : '';
      return t('notif.pendingPrefix', { title: title }) + (blocks.length > 0 ? '\n' + blocks.join('\n\n') : '') + multi;
    }

    function NotificationWatcher(props) {
      const { t } = props;
      const useSessions = typeof props.useSessions === 'function' ? props.useSessions : NO_SCHEDULE_HOOK;
      const useStatus = typeof props.useSessionStatus === 'function' ? props.useSessionStatus : NO_SCHEDULE_HOOK;
      const useSettings = typeof props.useSettings === 'function' ? props.useSettings : NO_SCHEDULE_HOOK;
      const sessionsSnap = useSessions((value) => value);
      const statuses = useStatus((value) => value);
      const config = useSettings((value) => value) || DEFAULT_SETTINGS;
      const previousRef = useRef(null);
      const configRef = useRef(config);
      configRef.current = config;
      useEffect(() => {
        if (!statuses) return;
        const previous = previousRef.current;
        const next = new Map();
        statuses.forEach((status, sessionId) => {
          const pending = status ? status.pendingInteraction : null;
          const sig = (status && status.running === true ? 'run' : 'idle')
            + '|' + (pending ? String(pending.kind) + ':' + String(pending.key || '') : '')
            + '|' + (status && status.completionUnread === true ? 'unread' : '');
          next.set(sessionId, { status: status, pending: pending, sig: sig });
        });
        previousRef.current = next;
        if (previous === null) return;
        const settings = configRef.current || DEFAULT_SETTINGS;
        if (settings.notify && settings.notify.enabled === false) return;
        const byId = (sessionsSnap && sessionsSnap.byId) || {};
        const focused = notificationChannelFocused();
        const sound = !(settings.notify && settings.notify.sound === false);
        const openSession = typeof props.openSession === 'function' ? props.openSession : null;
        const emit = typeof props.notify === 'function' ? props.notify : null;
        const send = (sessionId, tone, title, body, ttl) => {
          if (!body || !emit) return;
          if (!focused && typeof props.system === 'function') {
            const delivered = props.system(title, body, sessionId, openSession ? () => openSession(sessionId) : null);
            if (delivered) return;
          }
          emit({ tone: tone, title: title, body: body, ttl: ttl, sessionId: sessionId });
          if (sound) playNotifyChime();
        };
        previous.forEach((prev, sessionId) => {
          const cur = next.get(sessionId);
          if (!cur || !prev) return;
          if (prev.sig === cur.sig) return;
          const title = sessionTitleOf(byId[sessionId], t) || sessionId;
          const prevPending = prev.pending;
          const curPending = cur.pending;
          if (curPending && (!prevPending || prevPending.key !== curPending.key)) {
            const head = curPending.kind === 'approval' ? t('notif.approvalTitle') : t('notif.questionTitle');
            send(sessionId, 'warn', head, formatPendingNotification(curPending, title, t), 20000);
            return;
          }
          if (prev.status && prev.status.running === true && cur.status && cur.status.running !== true && !curPending) {
            send(sessionId, 'success', t('notif.completeTitle'), t('notif.completeBody', { title: title }), 9000);
          }
        });
      }, [statuses, sessionsSnap]);
      return null;
    }

    function NotificationDock(props) {
      const { t } = props;
      const useNotifications = typeof props.useNotifications === 'function' ? props.useNotifications : NO_SCHEDULE_HOOK;
      const snap = useNotifications((value) => value);
      const items = (snap && snap.items) || [];
      const [bounds, setBounds] = useState({ right: 16, bottom: 16 });
      useEffect(() => {
        const update = () => {
          const scroller = findChatScroller();
          const rect = scroller ? scroller.getBoundingClientRect() : null;
          const right = rect && rect.width > 4 ? Math.max(12, window.innerWidth - rect.right + 12) : 16;
          setBounds((previous) => (Math.abs(previous.right - right) < 1 ? previous : { right: right, bottom: 16 }));
        };
        update();
        window.addEventListener('resize', update);
        const timer = window.setInterval(update, 1000);
        return () => { window.removeEventListener('resize', update); window.clearInterval(timer); };
      }, []);
      if (items.length === 0) return null;
      const open = (item) => {
        if (typeof props.openSession === 'function' && item.sessionId) props.openSession(item.sessionId);
        if (typeof props.dismissNotif === 'function') props.dismissNotif(item.id);
      };
      return h('div', { className: 'pbx-notifDock', style: { right: bounds.right + 'px', bottom: bounds.bottom + 'px' }, role: 'status', 'aria-live': 'polite' },
        items.map((item) => h('div', {
          key: item.id, className: 'pbx-notifCard', 'data-tone': item.tone || 'success', role: 'button', tabIndex: 0,
          onClick: () => open(item),
          onKeyDown: (event) => {
            if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); open(item); }
          }
        },
          h('div', { className: 'pbx-notifHead' },
            h('span', { className: 'pbx-notifGlyph' }, h(Icon, { name: item.tone === 'success' ? 'check' : 'alert', size: 14 })),
            h('span', { className: 'pbx-notifTitle' }, item.title || ''),
            h('button', {
              type: 'button', className: 'pbx-notifClose', title: t('notif.dismiss'), 'aria-label': t('notif.dismiss'),
              onClick: (event) => { event.stopPropagation(); if (typeof props.dismissNotif === 'function') props.dismissNotif(item.id); }
            }, h(Icon, { name: 'close', size: 12 }))
          ),
          item.body ? h('div', { className: 'pbx-notifBody' }, item.body) : null,
          h('div', { className: 'pbx-notifFoot' }, t('notif.openHint'))
        ))
      );
    }

    /* ---------------------------------------------------------- command palette */
    function Palette(props) {
      const { useSessions, useSessionStatus, useWorkspaces, t, openSession } = props;
      const usePalette = typeof props.usePalette === 'function' ? props.usePalette : NO_SCHEDULE_HOOK;
      const useSettings = typeof props.useSettings === 'function' ? props.useSettings : NO_SCHEDULE_HOOK;
      const useHudOrder = typeof props.useHudOrder === 'function' ? props.useHudOrder : NO_SCHEDULE_HOOK;
      const palette = props.palette;
      const config = useSettings((snapshot) => snapshot) || DEFAULT_SETTINGS;
      const hudOrderSnap = useHudOrder((snapshot) => snapshot) || { ids: [] };
      const settingsRef = useRef(config);
      settingsRef.current = config;
      const focusRef = useRef(props.focus);
      focusRef.current = props.focus;
      const state = usePalette((snapshot) => snapshot) || { open: false };
      const list = useSessions((snapshot) => snapshot);
      const statuses = useSessionStatus((snapshot) => snapshot);
      const wsSnap = useWorkspaces((snapshot) => snapshot);
      const [query, setQuery] = useState('');
      const [index, setIndex] = useState(0);
      const [scope, setScope] = useState(null);
      const [mounted, setMounted] = useState(false);
      const [closing, setClosing] = useState(false);
      const inputRef = useRef(null);
      const cycleRef = useRef({ active: [], current: undefined });
      const listRef = useRef(null);
      const paletteOpenerRef = useRef(null);
      const openRef = useRef(openSession);
      const paletteOpenRef = useRef(false);
      const renameRef = useRef(null);
      openRef.current = openSession;
      paletteOpenRef.current = state.open;

      const archived = new Set((wsSnap && wsSnap.archivedSessionIds) || []);
      const ids = (list && list.ids) || [];
      const byId = (list && list.byId) || {};
      const appearance = loadAppearance();
      const projectSpec = (workspaceId) => {
        const spec = appearance[workspaceId] || {};
        return { color: spec.color || paletteFor(workspaceId), icon: spec.icon || 'folder' };
      };
      const wsBySession = new Map();
      for (const workspace of (wsSnap && wsSnap.items) || []) for (const sid of workspace.sessionIds || []) wsBySession.set(sid, workspace);
      const projects = ((wsSnap && wsSnap.items) || []).map((workspace) => {
        const spec = projectSpec(workspace.workspaceId);
        return { id: workspace.workspaceId, name: workspaceLabel(workspace.title, t), color: spec.color, icon: spec.icon };
      });

      const rows = [];
      for (const id of ids) {
        const row = byId[id];
        if (!row || row.blank || row.origin === 'subagent' || archived.has(id)) continue;
        const workspace = wsBySession.get(id);
        const spec = workspace ? projectSpec(workspace.workspaceId) : { color: paletteFor(''), icon: 'folder' };
        const info = statusInfo(statuses ? statuses.get(id) : undefined, row);
        rows.push({ id: id, title: sessionTitleOf(row, t), project: workspace ? workspaceLabel(workspace.title, t) : '', projectId: workspace ? workspace.workspaceId : '', projectColor: spec.color, projectIcon: spec.icon, info: info, updatedAt: row.updatedAt || 0 });
      }
      let currentId;
      for (const id of ids) { const row = byId[id]; if (row && row.retainedBy && (row.retainedBy.mainView || 0) > 0) { currentId = id; break; } }
      renameRef.current = currentId ? { id: currentId, title: (byId[currentId] && (byId[currentId].displayTitle || byId[currentId].title)) || '' } : null;
      const cycleRows = rows.slice().sort((a, b) => {
        const rank = (row) => row.info.tone === 'running' ? 0 : row.info.tone === 'attention' ? 1 : 2;
        const diff = rank(a) - rank(b);
        return diff !== 0 ? diff : b.updatedAt - a.updatedAt;
      });
      const rowById = new Map(rows.map((row) => [row.id, row]));
      const hudIds = (hudOrderSnap && hudOrderSnap.ids) || [];
      const orderedRows = hudIds.map((id) => rowById.get(id)).filter(Boolean);
      cycleRef.current = { active: orderedRows.length > 0 ? orderedRows : cycleRows, current: currentId };

      const q = query.trim().toLowerCase();
      const visible = rows.filter((row) => (!scope || row.projectId === scope) && (!q || row.title.toLowerCase().includes(q) || row.project.toLowerCase().includes(q)))
        .sort((a, b) => {
          const rank = (row) => row.info.tone === 'running' ? 0 : row.info.tone === 'attention' ? 1 : 2;
          const diff = rank(a) - rank(b);
          return diff !== 0 ? diff : b.updatedAt - a.updatedAt;
        });

      useEffect(() => {
        if (!mounted || !state.open || !inputRef.current) return;
        inputRef.current.focus({ preventScroll: true });
      }, [mounted, state.open]);
      useEffect(() => {
        if (!mounted || !state.open) return;
        const list = listRef.current;
        if (!list) return;
        const node = list.querySelectorAll('.pbx-prow')[index];
        if (node && typeof node.scrollIntoView === 'function') node.scrollIntoView({ block: 'nearest' });
      }, [index, mounted, state.open, query, scope]);
      useEffect(() => { setIndex(0); }, [query, scope]);
      useEffect(() => { if (state.open) { setQuery(''); setScope(null); setIndex(0); } }, [state.open]);
      useEffect(() => {
        if (state.open) { paletteOpenerRef.current = document.activeElement; return undefined; }
        const opener = paletteOpenerRef.current;
        paletteOpenerRef.current = null;
        if (opener && opener.isConnected && typeof opener.focus === 'function') {
          try { opener.focus({ preventScroll: true }); } catch (error) { /* ignore */ }
        }
        return undefined;
      }, [state.open]);
      useEffect(() => {
        if (state.open && config.palette.enabled !== false) { setMounted(true); setClosing(false); return undefined; }
        if (!mounted) return undefined;
        setClosing(true);
        const timer = window.setTimeout(() => {
          setClosing(false);
          setMounted(false);
          setQuery('');
          setScope(null);
          setIndex(0);
        }, 180);
        return () => window.clearTimeout(timer);
      }, [state.open, config.palette.enabled]);
      useEffect(() => {
        const onShortcut = (event) => {
          if (event.isComposing || event.repeat || shortcutSuppressed) return;
          const eventCombo = comboFromEvent(event);
          if (!eventCombo || !comboHasModifier(eventCombo)) return;
          const shortcuts = (settingsRef.current && settingsRef.current.shortcuts) || DEFAULT_SETTINGS.shortcuts;
          if (hasOpenDialog()) return;
          if (matchCombo(event, shortcuts.palette)) {
            event.preventDefault();
            event.stopPropagation();
            stopHoldScroll(false);
            if (settingsRef.current.palette.enabled !== false && palette) palette.toggle('open');
            return;
          }
          const isSidebarBoard = matchCombo(event, shortcuts.sidebarBoard);
          const isPanelHalf = matchCombo(event, shortcuts.panelHalf);
          const isPanelFull = matchCombo(event, shortcuts.panelFull);
          const isRename = matchCombo(event, shortcuts.rename);
          if (isRename) {
            const target = renameRef.current;
            if (!target || hasOpenDialog()) return;
            stopHoldScroll(false);
            if (paletteOpenRef.current && palette) palette.set({ open: false });
            event.preventDefault();
            event.stopPropagation();
            if (typeof props.requestRename === 'function') props.requestRename(target.id, target.title);
            return;
          }
          const isSessionMenu = matchCombo(event, shortcuts.sessionMenu);
          if (isSessionMenu) {
            const target = renameRef.current;
            if (!target || hasOpenDialog()) return;
            stopHoldScroll(false);
            if (paletteOpenRef.current && palette) palette.set({ open: false });
            event.preventDefault();
            event.stopPropagation();
            if (typeof props.requestSessionMenu === 'function') props.requestSessionMenu(target.id, target.title);
            return;
          }
          if (isSidebarBoard || isPanelHalf || isPanelFull) {
            event.preventDefault();
            event.stopPropagation();
            stopHoldScroll(false);
            if (paletteOpenRef.current && palette) palette.set({ open: false });
            if (typeof props.toggleBoard === 'function') {
              props.toggleBoard(isSidebarBoard ? 'narrow' : isPanelHalf ? 'half' : 'full');
            }
            return;
          }
          const isHudToggle = matchCombo(event, shortcuts.hud);
          if (isHudToggle) {
            if (paletteOpenRef.current) return;
            event.preventDefault();
            event.stopPropagation();
            stopHoldScroll(false);
            if (typeof props.toggleHud === 'function') props.toggleHud();
            return;
          }
          const isInterject = matchCombo(event, shortcuts.interject);
          if (isInterject) {
            if (paletteOpenRef.current) return;
            event.preventDefault();
            event.stopPropagation();
            stopHoldScroll(false);
            const acted = interjectEarliestQueued();
            if (!acted && typeof props.notify === 'function') {
              props.notify({ tone: 'warn', title: '', message: t('toast.interjectNone') });
            }
            return;
          }
          const isUserNext = matchCombo(event, shortcuts.userNext);
          const isUserPrev = matchCombo(event, shortcuts.userPrev);
          if (isUserNext || isUserPrev) {
            if (paletteOpenRef.current) return;
            event.preventDefault();
            event.stopPropagation();
            beginHoldScroll(isUserNext ? 1 : -1, event.code);
            return;
          }
          if (matchCombo(event, shortcuts.scrollBottom)) {
            if (paletteOpenRef.current) return;
            event.preventDefault();
            event.stopPropagation();
            stopHoldScroll(false);
            scrollToComposerAndFocus();
            return;
          }
          const isNext = matchCombo(event, shortcuts.next);
          const isPrev = matchCombo(event, shortcuts.prev);
          if (isNext || isPrev) {
            if (paletteOpenRef.current) return;
            const cycle = cycleRef.current || { active: [], current: undefined };
            const active = cycle.active || [];
            if (active.length === 0) return;
            event.preventDefault();
            event.stopPropagation();
            const index = active.findIndex((row) => row.id === cycle.current);
            const count = active.length;
            const next = isNext
              ? (index < 0 ? 0 : (index + 1) % count)
              : (index < 0 ? count - 1 : (index - 1 + count) % count);
            const target = active[next];
            if (target) {
              if (focusRef.current) focusRef.current.set({ id: target.id, at: Date.now() });
              if (typeof openRef.current === 'function') openRef.current(target.id);
            }
          }
        };
        document.addEventListener('keydown', onShortcut, true);
        return () => document.removeEventListener('keydown', onShortcut, true);
      }, [palette]);

      if (!mounted) return null;
      const close = () => { if (palette) palette.set({ open: false }); };
      const choose = (row) => {
        if (!row) return;
        close();
        if (focusRef.current) focusRef.current.set({ id: row.id, at: Date.now() });
        if (typeof openSession === 'function') openSession(row.id);
      };
      const onKeyDown = (event) => {
        if (isComposingEvent(event)) return;
        if (event.key === 'ArrowDown') { event.preventDefault(); setIndex((value) => Math.min(value + 1, Math.max(0, visible.length - 1))); }
        else if (event.key === 'ArrowUp') { event.preventDefault(); setIndex((value) => Math.max(0, value - 1)); }
        else if (event.key === 'Enter') { event.preventDefault(); choose(visible[index]); }
        else if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); if (scope) setScope(null); else close(); }
      };

      const blur = Math.min(32, Math.max(6, Number(config.palette.blur) || 15));
      const backdropStyle = { background: 'rgba(8,10,14,.20)', backdropFilter: 'blur(' + blur + 'px) saturate(1.35)', WebkitBackdropFilter: 'blur(' + blur + 'px) saturate(1.35)' };
      const panelStyle = { backdropFilter: 'blur(' + Math.round(blur * 1.7) + 'px) saturate(1.55)', WebkitBackdropFilter: 'blur(' + Math.round(blur * 1.7) + 'px) saturate(1.55)' };
      return h('div', { className: 'pbx-paletteBackdrop' + (closing ? ' closing' : ''), style: backdropStyle, onClick: close },
        h('div', {
          className: 'pbx-palette', style: panelStyle,
          onClick: (event) => event.stopPropagation(),
          onKeyDown: (event) => {
            if (event.key !== 'Escape' || isComposingEvent(event)) return;
            event.preventDefault();
            if (scope) setScope(null); else close();
          }
        },
          h('div', { className: 'pbx-paletteHead' },
            h(Icon, { name: 'search', size: 16 }),
            h('input', { ref: inputRef, className: 'pbx-paletteInput', value: query, placeholder: t('palette.placeholder'), onChange: (event) => setQuery(event.target.value), onKeyDown: onKeyDown })
          ),
          h('div', { className: 'pbx-paletteChips' },
            h('button', { type: 'button', className: 'pbx-pchip' + (scope === null ? ' on' : ''), onClick: () => { setScope(null); if (inputRef.current) inputRef.current.focus(); } }, t('palette.allProjects')),
            projects.map((project) => h('button', {
              key: project.id, type: 'button', className: 'pbx-pchip' + (scope === project.id ? ' on' : ''),
              onClick: () => { setScope(scope === project.id ? null : project.id); if (inputRef.current) inputRef.current.focus(); }
            },
              h('span', { className: 'pbx-pchipIcon', style: { color: project.color, background: hexToRgba(project.color, 0.16) } }, h(Icon, { name: project.icon, size: 12 })),
              project.name
            ))
          ),
          h('div', { className: 'pbx-paletteList', ref: listRef },
            visible.length === 0
              ? h('div', { className: 'pbx-paletteEmpty' }, t('palette.empty'))
              : visible.map((row, i) => h('button', {
                  key: row.id, type: 'button',
                  className: 'pbx-prow' + (i === index ? ' active' : ''),
                  onMouseEnter: () => setIndex(i),
                  onClick: () => choose(row)
                },
                  h('span', { className: 'pbx-rdot', 'data-tone': row.info.tone }),
                  h('span', { className: 'pbx-prowTitle' }, row.title),
                  h('span', { className: 'pbx-prowMeta' },
                    h('span', { className: 'pbx-prowWsIcon', style: { color: row.projectColor, background: hexToRgba(row.projectColor, 0.16) } }, h(Icon, { name: row.projectIcon, size: 10 })),
                    row.project
                  ),
                  h('span', { className: 'pbx-prowTime' }, relTime(row.updatedAt, t))
                ))
          ),
          h('div', { className: 'pbx-paletteFoot' }, t('palette.hint'))
        )
      );
    }

    /* --------------------------------------------------------- floating status */
    const HUD_POS_KEY = 'pbx.hud.pos';
    const HUD_STARTS_KEY = 'pbx.hud.starts';
    const HUD_COLLAPSE_KEY = 'pbx.hud.collapsed';
    function loadJson(key, fallback) {
      try { const raw = window.localStorage.getItem(key); if (!raw) return fallback; const value = JSON.parse(raw); return value && typeof value === 'object' ? value : fallback; } catch (error) { return fallback; }
    }
    function saveJson(key, value) { try { window.localStorage.setItem(key, JSON.stringify(value)); } catch (error) { /* ignore */ } }
    function fmtElapsed(milliseconds) {
      const total = Math.max(0, Math.floor(milliseconds / 1000));
      const hours = Math.floor(total / 3600);
      const minutes = Math.floor((total % 3600) / 60);
      const seconds = total % 60;
      const pad = (value) => String(value).padStart(2, '0');
      return hours > 0 ? hours + ':' + pad(minutes) + ':' + pad(seconds) : minutes + ':' + pad(seconds);
    }

    function FloatingStatus(props) {
      const { useSessions, useSessionStatus, useWorkspaces, t, openSession, saveSettings } = props;
      const useSettings = typeof props.useSettings === 'function' ? props.useSettings : NO_SCHEDULE_HOOK;
      const useScheduleCatalog = typeof props.useScheduleCatalog === 'function' ? props.useScheduleCatalog : NO_SCHEDULE_HOOK;
      const useFocus = typeof props.useFocus === 'function' ? props.useFocus : NO_SCHEDULE_HOOK;
      const config = useSettings((snapshot) => snapshot) || DEFAULT_SETTINGS;
      const list = useSessions((snapshot) => snapshot);
      const statuses = useSessionStatus((snapshot) => snapshot);
      const wsSnap = useWorkspaces((snapshot) => snapshot);
      const scheduleSnap = useScheduleCatalog((snapshot) => snapshot);
      const autoSet = (scheduleSnap && scheduleSnap.activeSessionIds) || NO_AUTO;
      const focusSnap = useFocus((snapshot) => snapshot);
      const hudMaxSessions = Math.min(20, Math.max(1, Number(config.hud.maxSessions) || 6));
      const hudListMaxHeight = Math.min(hudMaxSessions * 50 + 12, Math.max(160, (window.innerHeight || 800) - 180));
      const [now, setNow] = useState(() => Date.now());
      const [collapsed, setCollapsed] = useState(() => {
        try {
          const saved = window.localStorage.getItem(HUD_COLLAPSE_KEY);
          if (saved === '1') return true;
          if (saved === '0') return false;
        } catch (error) { /* ignore */ }
        return Boolean(config.hud.defaultCollapsed);
      });
      const [mounted, setMounted] = useState(() => config.hud.enabled !== false);
      const [swap, setSwap] = useState('');
      const swapTimersRef = useRef([]);
      const [pos, setPos] = useState(() => { const value = loadJson(HUD_POS_KEY, null); return value && typeof value.x === 'number' ? value : null; });
      const [dragging, setDragging] = useState(false);
      const [hasDragged, setHasDragged] = useState(false);
      const hudDragMovedRef = useRef(false);
      const prevDefaultCollapsedRef = useRef(config.hud.defaultCollapsed);
      const hudRef = useRef(null);
      const listContentRef = useRef(null);
      const [listHeight, setListHeight] = useState(0);
      const [present, setPresent] = useState(false);
      const publishedOrderRef = useRef('');
      const prevCurrentRef = useRef(undefined);
      const [localSpot, setLocalSpot] = useState({ id: null, at: 0 });
      const dragRef = useRef(null);
      const posRef = useRef(pos);
      const startsRef = useRef(null);
      if (startsRef.current === null) {
        const stored = loadJson(HUD_STARTS_KEY, {});
        startsRef.current = { running: (stored && stored.running) || {}, attention: (stored && stored.attention) || {} };
      }
      posRef.current = pos;

      useEffect(() => {
        if (config.hud.enabled === false) return undefined;
        const timer = window.setInterval(() => setNow(Date.now()), 1000);
        return () => window.clearInterval(timer);
      }, [config.hud.enabled]);

      /* Keep the card mounted for one exit frame so hiding it can animate. */
      useEffect(() => {
        if (config.hud.enabled === false) {
          const timer = window.setTimeout(() => setMounted(false), 220);
          return () => window.clearTimeout(timer);
        }
        setMounted(true);
        return undefined;
      }, [config.hud.enabled]);

      /* Alt+E swaps the pill and the list with a short crossfade. */
      const configRef = useRef(config);
      configRef.current = config;
      useEffect(() => {
        const runSwap = (mutate) => {
          swapTimersRef.current.forEach((timer) => window.clearTimeout(timer));
          setSwap('out');
          swapTimersRef.current = [
            window.setTimeout(() => {
              mutate();
              setSwap('in');
            }, 110),
            window.setTimeout(() => setSwap(''), 400)
          ];
        };
        const persist = (next) => {
          try { window.localStorage.setItem(HUD_COLLAPSE_KEY, next ? '1' : '0'); } catch (error) { /* ignore */ }
        };
        const onToggle = () => {
          const current = configRef.current || DEFAULT_SETTINGS;
          if (current.hud.enabled === false) {
            if (typeof saveSettings === 'function') {
              const next = cloneJson(current);
              next.hud = Object.assign({}, current.hud, { enabled: true });
              saveSettings(next);
            }
            setCollapsed(false);
            persist(false);
            return;
          }
          runSwap(() => {
            setCollapsed((value) => {
              const next = !value;
              persist(next);
              return next;
            });
          });
        };
        window.addEventListener('pbx-hud-toggle', onToggle);
        return () => {
          window.removeEventListener('pbx-hud-toggle', onToggle);
          swapTimersRef.current.forEach((timer) => window.clearTimeout(timer));
        };
      }, [config.hud.enabled, saveSettings]);

      useEffect(() => {
        if (!pos) return undefined;
        const clamp = () => {
          if (dragging) return;
          const box = hudRef.current;
          const width = box ? box.offsetWidth : 300;
          const height = box ? box.offsetHeight : 220;
          const next = {
            x: Math.min(Math.max(4, posRef.current.x), Math.max(4, window.innerWidth - width - 4)),
            y: Math.min(Math.max(4, posRef.current.y), Math.max(4, window.innerHeight - height - 4))
          };
          if (next.x !== posRef.current.x || next.y !== posRef.current.y) {
            setPos(next);
            saveJson(HUD_POS_KEY, next);
          }
        };
        clamp();
        window.addEventListener('resize', clamp);
        return () => window.removeEventListener('resize', clamp);
      }, [pos, dragging]);

      useEffect(() => {
        const handler = () => { setCollapsed(Boolean(config.hud.defaultCollapsed)); setPos(null); startsRef.current = { running: {}, attention: {} }; };
        window.addEventListener('pbx-hud-reset', handler);
        return () => window.removeEventListener('pbx-hud-reset', handler);
      }, [config.hud.defaultCollapsed]);

      useEffect(() => {
        if (prevDefaultCollapsedRef.current === config.hud.defaultCollapsed) return;
        prevDefaultCollapsedRef.current = config.hud.defaultCollapsed;
        try { window.localStorage.removeItem(HUD_COLLAPSE_KEY); } catch (error) { /* ignore */ }
        setCollapsed(Boolean(config.hud.defaultCollapsed));
      }, [config.hud.defaultCollapsed]);

      const useLayoutEffectSafe = typeof React.useLayoutEffect === 'function' ? React.useLayoutEffect : useEffect;
      useLayoutEffectSafe(() => {
        const element = listContentRef.current;
        if (!element) return;
        const next = Math.min(element.scrollHeight, hudListMaxHeight);
        setListHeight((previous) => Math.abs(previous - next) > 0.5 ? next : previous);
      });
      useEffect(() => {
        if (!dragging) return undefined;
        const move = (event) => {
          const drag = dragRef.current || {};
          if (Math.abs(event.clientX - (drag.startX || 0)) + Math.abs(event.clientY - (drag.startY || 0)) <= 4) return;
          hudDragMovedRef.current = true;
          const box = hudRef.current;
          const width = box ? box.offsetWidth : 280;
          const height = box ? box.offsetHeight : 160;
          const next = {
            x: Math.min(Math.max(4, event.clientX - (drag.dx || 0)), Math.max(4, window.innerWidth - width - 4)),
            y: Math.min(Math.max(4, event.clientY - (drag.dy || 0)), Math.max(4, window.innerHeight - height - 4))
          };
          posRef.current = next;
          setPos(next);
        };
        const up = () => {
          setDragging(false);
          if (!hudDragMovedRef.current) return;
          setHasDragged(true);
          if (posRef.current) saveJson(HUD_POS_KEY, posRef.current);
          if (config.hud.defaultPosition !== 'last' && typeof saveSettings === 'function') {
            const next = cloneJson(config);
            next.hud = Object.assign({}, next.hud, { defaultPosition: 'last' });
            saveSettings(next);
          }
        };
        window.addEventListener('pointermove', move);
        window.addEventListener('pointerup', up);
        return () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); };
      }, [dragging]);

      const onDragStart = (event) => {
        const hitButton = event.target && event.target.closest && event.target.closest('button');
        if (event.button !== 0 || (hitButton && hitButton !== event.currentTarget)) return;
        const box = hudRef.current;
        if (!box) return;
        const rect = box.getBoundingClientRect();
        dragRef.current = { dx: event.clientX - rect.left, dy: event.clientY - rect.top, startX: event.clientX, startY: event.clientY };
        hudDragMovedRef.current = false;
        setDragging(true);
        event.preventDefault();
      };

      const archived = new Set((wsSnap && wsSnap.archivedSessionIds) || []);
      const ids = (list && list.ids) || [];
      const byId = (list && list.byId) || {};
      const wsBySession = new Map();
      for (const workspace of (wsSnap && wsSnap.items) || []) for (const sid of workspace.sessionIds || []) wsBySession.set(sid, workspace);
      const starts = startsRef.current;
      const seenRunning = new Set();
      const seenAttention = new Set();
      let dirty = false;
      const allRows = [];
      for (const id of ids) {
        const row = byId[id];
        if (!row || row.blank || row.origin === 'subagent' || archived.has(id)) continue;
        const info = statusInfo(statuses ? statuses.get(id) : undefined, row);
        const workspace = wsBySession.get(id);
        let start = 0;
        let timed = false;
        if (info.tone === 'running') {
          seenRunning.add(id);
          if (!starts.running[id]) { starts.running[id] = now; dirty = true; }
          start = starts.running[id];
          timed = true;
        } else if (info.tone === 'attention') {
          seenAttention.add(id);
          if (!starts.attention[id]) { starts.attention[id] = now; dirty = true; }
          start = starts.attention[id];
          timed = true;
        }
        allRows.push({
          id: id, title: sessionTitleOf(row, t), project: workspace ? workspaceLabel(workspace.title, t) : '',
          tone: info.tone, labelKey: info.labelKey, updatedAt: row.updatedAt || 0, start: start, timed: timed,
          auto: autoSet.has(id)
        });
      }
      for (const key of Object.keys(starts.running)) if (!seenRunning.has(key)) { delete starts.running[key]; dirty = true; }
      for (const key of Object.keys(starts.attention)) if (!seenAttention.has(key)) { delete starts.attention[key]; dirty = true; }
      if (dirty) saveJson(HUD_STARTS_KEY, starts);

      const nonIdle = allRows.filter((row) => row.tone !== 'idle' && !(row.tone === 'done' && config.hud.includeDone === false));
      const included = new Set(nonIdle.map((row) => row.id));
      let recent = [];
      if (config.hud.recentEnabled !== false) {
        const limit = Math.min(20, Math.max(1, Number(config.hud.recentCount) || 5));
        recent = allRows
          .filter((row) => !included.has(row.id))
          .filter((row) => !(row.tone === 'done' && config.hud.includeDone === false))
          .filter((row) => !(config.hud.recentExcludeAuto !== false && row.auto))
          .sort((a, b) => b.updatedAt - a.updatedAt)
          .slice(0, limit)
          .map((row) => Object.assign({}, row, { recent: true }));
      }
      let currentId;
      for (const id of ids) { const row = byId[id]; if (row && row.retainedBy && (row.retainedBy.mainView || 0) > 0) { currentId = id; break; } }
      useEffect(() => {
        if (!currentId) return;
        const previous = prevCurrentRef.current;
        prevCurrentRef.current = currentId;
        if (previous !== undefined && previous !== currentId) setLocalSpot({ id: currentId, at: Date.now() });
      }, [currentId]);

      const localSpotAt = localSpot.at || 0;
      const focusSpotAt = (focusSnap && focusSnap.at) || 0;
      const useLocalSpot = Boolean(localSpot.id) && localSpotAt >= focusSpotAt;
      const spotlightId = useLocalSpot ? localSpot.id : ((focusSnap && focusSnap.id) || localSpot.id);
      const spotlightAt = useLocalSpot ? localSpotAt : (focusSpotAt || localSpotAt);
      const spotlightActive = Boolean(spotlightId) && (now - spotlightAt < 1800);
      const chosen = nonIdle.concat(recent);
      const chosenIds = new Set(chosen.map((row) => row.id));
      const rowById = new Map(allRows.map((row) => [row.id, row]));
      const ensure = (id) => { if (!id || chosenIds.has(id) || !rowById.has(id)) return; chosen.push(Object.assign({}, rowById.get(id))); chosenIds.add(id); };
      ensure(currentId);
      if (spotlightActive) ensure(spotlightId);
      const rows = chosen.map((row) => {
        const decorated = Object.assign({}, row);
        if (row.id === currentId) decorated.current = true;
        if (spotlightActive && row.id === spotlightId) decorated.spotlight = true;
        return decorated;
      });
      const order = { running: 0, attention: 1, done: 2, idle: 3 };
      rows.sort((a, b) => {
        const rank = order[a.tone] - order[b.tone];
        if (rank !== 0) return rank;
        if (a.tone === 'running' || a.tone === 'attention') return (a.start || 0) - (b.start || 0);
        return b.updatedAt - a.updatedAt;
      });
      const fullOrderIds = rows.map((row) => row.id);
      if (rows.length > hudMaxSessions) {
        const keep = rows.slice(0, hudMaxSessions);
        const pinId = currentId || (spotlightActive ? spotlightId : null);
        if (pinId && !keep.some((row) => row.id === pinId)) {
          const pinRow = rows.find((row) => row.id === pinId);
          if (pinRow) { keep[hudMaxSessions - 1] = pinRow; keep.sort((a, b) => rows.indexOf(a) - rows.indexOf(b)); }
        }
        rows.length = 0;
        for (const row of keep) rows.push(row);
      }
      useEffect(() => {
        if (!spotlightActive || !spotlightId) return;
        const root = listContentRef.current;
        if (!root) return;
        const target = Array.prototype.find.call(root.querySelectorAll('[data-hud-id]'), (node) => node.getAttribute('data-hud-id') === spotlightId);
        if (target && typeof target.scrollIntoView === 'function') target.scrollIntoView({ block: 'nearest' });
      }, [spotlightActive, spotlightId]);

      useEffect(() => {
        if (rows.length > 0) { setPresent(true); return undefined; }
        const timer = window.setTimeout(() => setPresent(false), 220);
        return () => window.clearTimeout(timer);
      }, [rows.length]);

      const orderKey = fullOrderIds.join('|');
      useEffect(() => {
        const store = props.hudOrder;
        if (!store || typeof store.set !== 'function') return;
        if (config.hud.enabled === false) { publishedOrderRef.current = ''; store.set({ ids: [] }); return; }
        if (publishedOrderRef.current === orderKey) return;
        publishedOrderRef.current = orderKey;
        store.set({ ids: fullOrderIds });
      }, [orderKey, config.hud.enabled]);

      if (config.hud.enabled === false && !mounted) return null;
      const closing = config.hud.enabled === false || (rows.length === 0 && present);
      if (rows.length === 0 && !present) return null;

      const positionMode = config.hud.defaultPosition || 'top-right';
      const useSavedPosition = Boolean(pos) && (positionMode === 'last' || dragging || hasDragged);
      const style = useSavedPosition ? { left: pos.x + 'px', top: pos.y + 'px' } : null;
      const className = 'pbx-hud' + (useSavedPosition ? ' moved' : ' default' + (positionMode === 'bottom-right' ? ' bottom' : '')) + (dragging ? ' dragging' : '') + (closing ? ' closing' : '');
      if (collapsed) {
        return h('button', {
          ref: hudRef, type: 'button', className: className + ' collapsed', style: style, title: t('hud.expand'),
          onPointerDown: onDragStart,
          onClick: () => {
            if (hudDragMovedRef.current) { hudDragMovedRef.current = false; return; }
            setCollapsed(false);
            try { window.localStorage.setItem(HUD_COLLAPSE_KEY, '0'); } catch (error) { /* ignore */ }
          }
        },
          h('span', { className: 'pbx-liveDot on' }),
          h('span', { className: 'pbx-hudPillText' }, String(rows.length)),
          h('span', { className: 'pbx-hudPillLabel' }, t('hud.collapsed'))
        );
      }
      return h('div', { ref: hudRef, className: className, style: style },
        h('div', { className: 'pbx-hudInner' + (swap ? ' ' + swap : '') },
          h('div', { className: 'pbx-hudHead', onPointerDown: onDragStart },
            h('span', { className: 'pbx-hudGrip', 'aria-hidden': 'true' }),
            h('span', { className: 'pbx-hudHeadTitle' }, t('hud.title')),
            h('span', { className: 'pbx-hudCount' }, String(rows.length)),
            h('button', { type: 'button', className: 'pbx-hudCollapse', title: t('hud.collapse'), onClick: () => { setCollapsed(true); try { window.localStorage.setItem(HUD_COLLAPSE_KEY, '1'); } catch (error) { /* ignore */ } } }, '—')
          ),
          h('div', { className: 'pbx-hudList', style: Object.assign({ maxHeight: hudListMaxHeight + 'px' }, listHeight > 0 ? { height: listHeight + 'px' } : {}) },
            h('div', { ref: listContentRef, className: 'pbx-hudListInner' },
              rows.map((row) => h('button', {
              key: row.id, type: 'button', 'data-hud-id': row.id, className: 'pbx-hudRow' + (row.auto ? ' auto' : '') + (row.tone === 'running' ? ' live' : '') + (row.current ? ' current' : '') + (row.spotlight ? ' spotlight' : ''),
              title: t('card.open'), onClick: () => { if (typeof openSession === 'function') openSession(row.id); }
            },
              h('span', { className: 'pbx-rdot', 'data-tone': row.tone }),
              row.auto ? h('span', { className: 'pbx-hudAuto', title: t('kind.auto') }, h(Icon, { name: 'clock', size: 11 })) : null,
              h('span', { className: 'pbx-hudRowMain' },
                h('span', { className: 'pbx-hudRowTitle' }, row.title),
                h('span', { className: 'pbx-hudRowMeta' }, t(row.labelKey) + (row.auto ? ' · ' + t('hud.auto') : '') + (row.project ? ' · ' + row.project : '') + (row.current ? ' · ' + t('card.current') : row.recent ? ' · ' + t('hud.recent') : ''))
              ),
              h('span', { className: 'pbx-hudTimer' }, row.timed ? fmtElapsed(now - row.start) : relTime(row.updatedAt, t))
            ))
          ))
        )
      );
    }

    /* ------------------------------------------------ responsive right-pane board */
    function ResponsiveBoard(props) {
      const useSettings = typeof props.useSettings === 'function' ? props.useSettings : NO_SCHEDULE_HOOK;
      const config = useSettings((snapshot) => snapshot) || DEFAULT_SETTINGS;
      const threshold = Math.min(1000, Math.max(320, Number(props.wideThreshold) || Number(config.board.wideThreshold) || 520));
      const boxRef = useRef(null);
      const [wide, setWide] = useState(false);
      useEffect(() => {
        const element = boxRef.current;
        if (!element) return undefined;
        const update = () => { setWide(element.clientWidth >= threshold); };
        update();
        if (typeof ResizeObserver !== 'undefined') {
          const observer = new ResizeObserver(update);
          observer.observe(element);
          return () => observer.disconnect();
        }
        window.addEventListener('resize', update);
        return () => window.removeEventListener('resize', update);
      }, [threshold]);
      if (config.board.enabled === false) return h('div', { className: 'pbx-responsive' }, h('div', { className: 'pbx-disabled' }, props.t('settings.boardDisabled')));
      return h('div', { ref: boxRef, className: 'pbx-responsive' }, h(ProjectBoard, Object.assign({}, props, { compact: !wide })));
    }

    /* ------------------------------------------------------------ rename dialog */
    function RenameDialog(props) {
      const useRename = typeof props.useRename === 'function' ? props.useRename : NO_SCHEDULE_HOOK;
      const snap = useRename((value) => value) || {};
      if (!snap.sessionId) return null;
      return h(RenameForm, Object.assign({}, props, {
        key: snap.sessionId + ':' + (snap.at || 0),
        request: { sessionId: snap.sessionId, currentTitle: snap.currentTitle || '', at: snap.at || 0 }
      }));
    }

    function RenameForm(props) {
      const { t, request } = props;
      const [draft, setDraft] = useState(request.currentTitle);
      const [busy, setBusy] = useState(false);
      const [error, setError] = useState('');
      const inputRef = useRef(null);
      const openerRef = useRef(null);
      useEffect(() => {
        openerRef.current = document.activeElement;
        if (inputRef.current) {
          inputRef.current.focus({ preventScroll: true });
          inputRef.current.select();
        }
        return () => {
          const opener = openerRef.current;
          if (opener && opener.isConnected && typeof opener.focus === 'function') {
            try { opener.focus({ preventScroll: true }); } catch (error) { /* ignore */ }
          }
        };
      }, []);
      const close = () => { if (!busy) props.rename.set({ sessionId: null, currentTitle: '' }); };
      useEffect(() => {
        const onKey = (event) => {
          if (event.key !== 'Escape' || busy || isComposingEvent(event)) return;
          event.preventDefault();
          event.stopPropagation();
          props.rename.set({ sessionId: null, currentTitle: '' });
        };
        document.addEventListener('keydown', onKey, true);
        return () => document.removeEventListener('keydown', onKey, true);
      }, [busy, props.rename]);
      const trimmed = draft.trim();
      const submit = () => {
        if (busy || !trimmed) return;
        setBusy(true);
        setError('');
        Promise.resolve(props.renameSession(request.sessionId, trimmed)).then((result) => {
          if (result && result.ok === false) {
            setBusy(false);
            setError((result.error && result.error.message) || t('rename.failed'));
            return;
          }
          props.rename.set({ sessionId: null, currentTitle: '' });
        }).catch((reason) => {
          setBusy(false);
          setError((reason && reason.message) || t('rename.failed'));
        });
      };
      const onKeyDown = (event) => {
        if (event.key !== 'Enter' || isComposingEvent(event)) return;
        event.preventDefault();
        event.stopPropagation();
        submit();
      };
      const onCardKeyDown = (event) => {
        if (event.key !== 'Tab') return;
        const card = event.currentTarget;
        const nodes = Array.prototype.slice.call(card.querySelectorAll('input, button'))
          .filter((node) => !node.disabled && node.getClientRects().length > 0);
        if (nodes.length === 0) return;
        const first = nodes[0];
        const last = nodes[nodes.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      };
      return h('div', { className: 'pbx-renameBackdrop', onClick: close },
        h('div', {
          className: 'pbx-renameCard', role: 'dialog', 'aria-modal': 'true', 'aria-label': t('rename.title'),
          onClick: (event) => event.stopPropagation(), onKeyDown: onCardKeyDown
        },
          h('div', { className: 'pbx-renameTitle' }, t('rename.title')),
          h('div', { className: 'pbx-renameLabel' }, t('rename.label')),
          h('input', {
            ref: inputRef, className: 'pbx-renameInput', value: draft, spellCheck: false, 'aria-label': t('rename.label'),
            placeholder: t('rename.placeholder'),
            onChange: (event) => { setDraft(event.target.value); if (error) setError(''); },
            onKeyDown: onKeyDown
          }),
          error ? h('div', { className: 'pbx-renameError' }, error) : null,
          h('div', { className: 'pbx-renameActions' },
            h('button', { type: 'button', className: 'pbx-renameBtn', disabled: busy, onClick: close }, t('rename.cancel')),
            h('button', { type: 'button', className: 'pbx-renameBtn primary', disabled: busy || !trimmed, onClick: submit }, busy ? t('rename.saving') : t('rename.confirm'))
          )
        )
      );
    }

    /* -------------------------------------------------------- session actions */
    function SessionMenuDialog(props) {
      const useMenu = typeof props.useSessionMenu === 'function' ? props.useSessionMenu : NO_SCHEDULE_HOOK;
      const snap = useMenu((value) => value) || {};
      if (!snap.sessionId) return null;
      return h(SessionMenuForm, Object.assign({}, props, {
        key: snap.sessionId + ':' + String(snap.at || ''),
        sessionId: snap.sessionId,
        sessionTitle: snap.title || ''
      }));
    }

    function SessionMenuForm(props) {
      const { t, sessionId, sessionTitle } = props;
      const [busy, setBusy] = useState('');
      const [error, setError] = useState('');
      const [confirmDelete, setConfirmDelete] = useState(false);
      const cardRef = useRef(null);
      const cancelRef = useRef(null);
      const openerRef = useRef(null);
      const close = () => {
        if (typeof props.closeSessionMenu === 'function') props.closeSessionMenu();
      };
      useEffect(() => {
        openerRef.current = document.activeElement;
        if (cancelRef.current) cancelRef.current.focus({ preventScroll: true });
        return () => {
          const opener = openerRef.current;
          if (opener && typeof opener.focus === 'function' && document.contains(opener)) opener.focus({ preventScroll: true });
        };
      }, []);
      useEffect(() => {
        const onKey = (event) => {
          if (event.key !== 'Escape' || isComposingEvent(event) || busy) return;
          event.preventDefault();
          event.stopPropagation();
          close();
        };
        document.addEventListener('keydown', onKey, true);
        return () => document.removeEventListener('keydown', onKey, true);
      }, [busy]);
      const run = async (kind) => {
        if (busy) return;
        if (kind === 'delete' && confirmDelete !== true) { setConfirmDelete(true); return; }
        setError('');
        setBusy(kind);
        try {
          const result = kind === 'archive'
            ? await props.archiveSession(sessionId)
            : await props.deleteSession(sessionId);
          if (result && result.ok) { close(); return; }
          const code = result && result.error ? result.error.code : '';
          if (kind === 'delete' && (code === 'unsupported' || code === 'unavailable')) {
            setError(t('menu.deleteUnavailable'));
          } else {
            setError(t('menu.failed', { message: (result && result.error && result.error.message) || code || 'failed' }));
          }
        } catch (errorValue) {
          setError(t('menu.failed', { message: String(errorValue && errorValue.message ? errorValue.message : errorValue) }));
        } finally {
          setBusy('');
        }
      };
      const onCardKeyDown = (event) => {
        if (event.key !== 'Tab' || !cardRef.current) return;
        const nodes = Array.prototype.slice.call(cardRef.current.querySelectorAll('button'))
          .filter((node) => !node.disabled && node.getClientRects().length > 0);
        if (nodes.length === 0) return;
        const first = nodes[0];
        const last = nodes[nodes.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      };
      const deleteSupported = props.deleteSupported === true;
      return h('div', { className: 'pbx-renameBackdrop', onClick: close },
        h('div', {
          ref: cardRef, className: 'pbx-renameCard', role: 'dialog', 'aria-modal': 'true', 'aria-label': t('menu.title'),
          onClick: (event) => event.stopPropagation(), onKeyDown: onCardKeyDown
        },
          h('div', { className: 'pbx-renameTitle' }, t('menu.title')),
          h('div', { className: 'pbx-renameLabel' }, sessionTitle || sessionId),
          h('div', { className: 'pbx-menuHint' }, t('menu.archiveHint')),
          h('div', { className: 'pbx-menuHint' }, t('menu.deleteHint')),
          deleteSupported ? null : h('div', { className: 'pbx-menuHint' }, t('menu.deleteUnavailable')),
          error ? h('div', { className: 'pbx-renameError' }, error) : null,
          h('div', { className: 'pbx-renameActions' },
            h('button', { type: 'button', className: 'pbx-renameBtn', disabled: Boolean(busy), onClick: () => run('archive') },
              busy === 'archive' ? t('menu.busy') : t('menu.archive')),
            h('button', {
              type: 'button', className: 'pbx-renameBtn danger', disabled: Boolean(busy) || !deleteSupported,
              title: deleteSupported ? t('menu.deleteHint') : t('menu.deleteUnavailable'),
              onClick: () => run('delete')
            }, busy === 'delete' ? t('menu.busy') : (confirmDelete ? t('menu.deleteConfirm') : t('menu.delete'))),
            h('button', { ref: cancelRef, type: 'button', className: 'pbx-renameBtn', disabled: Boolean(busy), onClick: close }, t('menu.cancel'))
          )
        )
      );
    }

    /* --------------------------------------------------------------- settings */
    function SettingsPage(props) {
      const { t } = props;
      const useSettings = typeof props.useSettings === 'function' ? props.useSettings : NO_SCHEDULE_HOOK;
      const config = useSettings((snapshot) => snapshot) || DEFAULT_SETTINGS;
      const saveSettings = typeof props.saveSettings === 'function' ? props.saveSettings : function () {};
      const [recording, setRecording] = useState(null);
      const [recordError, setRecordError] = useState('');
      const [builtinWarnings, setBuiltinWarnings] = useState([]);
      const scannedConflictsRef = useRef(new Set());

      useEffect(() => {
        if (!recording) return undefined;
        shortcutSuppressed = true;
        const onKey = (event) => {
          if (isComposingEvent(event)) return;
          if (event.key === 'Escape' && !event.altKey && !event.ctrlKey && !event.metaKey && !event.shiftKey) {
            event.preventDefault(); event.stopPropagation(); setRecording(null); setRecordError(''); return;
          }
          const combo = comboFromEvent(event);
          if (!combo) return;
          event.preventDefault(); event.stopPropagation();
          if (!comboHasModifier(combo)) { setRecordError(t('settings.shortcutNeedModifier')); return; }
          const next = cloneJson(config);
          const conflict = Object.keys(next.shortcuts).find((key) => key !== recording && next.shortcuts[key] === combo);
          if (conflict) {
            const message = t('toast.conflictOwn', { combo: comboDisplay(combo), name: t(SHORTCUT_LABEL_KEYS[conflict] || 'settings.shortcut.palette') });
            setRecordError(message);
            if (typeof props.notify === 'function') props.notify({ tone: 'warn', title: t('toast.conflictTitle'), message: message });
            return;
          }
          if (typeof props.findBuiltinConflict === 'function') {
            const builtin = props.findBuiltinConflict(combo);
            if (builtin) {
              const message = t('toast.conflictBuiltin', { combo: comboDisplay(combo), name: builtin.label });
              setRecordError(message);
              if (typeof props.notify === 'function') props.notify({ tone: 'warn', title: t('toast.conflictTitle'), message: message });
              return;
            }
          }
          setRecordError('');
          next.shortcuts[recording] = combo;
          saveSettings(next);
          setRecording(null);
        };
        document.addEventListener('keydown', onKey, true);
        return () => { shortcutSuppressed = false; document.removeEventListener('keydown', onKey, true); };
      }, [recording, config, saveSettings]);

      const useShortcutsCatalog = typeof props.useShortcutsCatalog === 'function' ? props.useShortcutsCatalog : NO_SCHEDULE_HOOK;
      const shortcutsCatalog = useShortcutsCatalog((value) => value);
      useEffect(() => {
        if (typeof props.findBuiltinConflict !== 'function') return;
        const found = [];
        for (const key of Object.keys(config.shortcuts || {})) {
          const conflict = props.findBuiltinConflict(config.shortcuts[key]);
          if (conflict) found.push({ key: key, combo: config.shortcuts[key], label: conflict.label });
        }
        setBuiltinWarnings(found);
        const present = new Set(found.map((item) => item.key + ':' + item.combo));
        for (const signature of Array.from(scannedConflictsRef.current)) {
          if (!present.has(signature)) scannedConflictsRef.current.delete(signature);
        }
        for (const item of found) {
          const signature = item.key + ':' + item.combo;
          if (scannedConflictsRef.current.has(signature)) continue;
          scannedConflictsRef.current.add(signature);
          if (typeof props.notify === 'function') {
            props.notify({ tone: 'warn', title: t('toast.conflictTitle'), message: t('toast.conflictExisting', { combo: comboDisplay(item.combo), name: item.label }) });
          }
        }
      }, [config.shortcuts, shortcutsCatalog]);

      const update = (section, patch) => { const next = cloneJson(config); Object.assign(next[section], patch); saveSettings(next); };
      const resetAll = () => {
        saveSettings(cloneJson(DEFAULT_SETTINGS));
        try {
          window.localStorage.removeItem(HUD_COLLAPSE_KEY);
          window.localStorage.removeItem(HUD_POS_KEY);
          window.localStorage.removeItem(HUD_STARTS_KEY);
          window.dispatchEvent(new Event('pbx-hud-reset'));
        } catch (error) { /* ignore */ }
      };
      const resetAppearance = () => {
        try { window.localStorage.removeItem(STORE_KEY); } catch (error) { /* ignore */ }
        try { window.dispatchEvent(new Event('pbx-appearance-reset')); } catch (error) { /* ignore */ }
      };

      const row = (key, labelKey, descKey, control) => h('div', { className: 'pbx-setRow', key: key },
        h('div', { className: 'pbx-setRowText' },
          h('div', { className: 'pbx-setLabel' }, t(labelKey)),
          descKey ? h('div', { className: 'pbx-setDesc' }, t(descKey)) : null
        ),
        h('div', { className: 'pbx-setControl' }, control)
      );
      const shortcutRow = (key, labelKey) => row('sc-' + key, labelKey, null,
        h('button', {
          type: 'button', className: 'pbx-keycap' + (recording === key ? ' recording' : ''),
          title: t('settings.shortcutResetHint'),
          onClick: () => { setRecordError(''); setRecording(recording === key ? null : key); },
          onDoubleClick: () => {
            const next = cloneJson(config);
            next.shortcuts[key] = DEFAULT_SETTINGS.shortcuts[key];
            setRecordError('');
            setRecording(null);
            saveSettings(next);
          }
        }, recording === key ? t('settings.recording') : comboDisplay(config.shortcuts[key]))
      );
      const toggleRow = (section, key, labelKey, descKey) => row(section + '-' + key, labelKey, descKey,
        h('button', {
          type: 'button', role: 'switch', 'aria-checked': Boolean(config[section][key]),
          className: 'pbx-switch' + (config[section][key] ? ' on' : ''),
          onClick: () => update(section, { [key]: !config[section][key] })
        }, h('span', { className: 'pbx-switchThumb' }))
      );
      const selectRow = (section, key, labelKey, options) => row(section + '-' + key, labelKey, null,
        h('select', {
          className: 'pbx-setSelect', value: config[section][key],
          onChange: (event) => update(section, { [key]: event.target.value })
        }, options.map((option) => h('option', { key: option.value, value: option.value }, t(option.labelKey))))
      );
      const numberRow = (section, key, labelKey, min, max, step) => row(section + '-' + key, labelKey, null,
        h('input', {
          key: section + '-' + key + '-' + config[section][key],
          type: 'number', className: 'pbx-setInput', defaultValue: config[section][key], min: min, max: max, step: step,
          onBlur: (event) => {
            const raw = String(event.target.value || '').trim();
            const value = Number(raw);
            if (raw === '' || !Number.isFinite(value)) { event.target.value = String(config[section][key]); return; }
            const clamped = Math.min(max, Math.max(min, Math.round(value)));
            event.target.value = String(clamped);
            if (clamped !== config[section][key]) update(section, { [key]: clamped });
          },
          onKeyDown: (event) => {
            if (event.key === 'Enter') event.currentTarget.blur();
            if (event.key === 'Escape') { event.currentTarget.value = String(config[section][key]); event.currentTarget.blur(); }
          }
        })
      );
      const rangeRow = (section, key, labelKey, min, max, step) => row(section + '-' + key, labelKey, null,
        h('span', { className: 'pbx-setRange' },
          h('input', {
            type: 'range', min: min, max: max, step: step, value: config[section][key],
            onChange: (event) => update(section, { [key]: Number(event.target.value) })
          }),
          h('span', { className: 'pbx-setRangeValue' }, String(config[section][key]))
        )
      );
      const headerButtonRow = (id, labelKey) => {
        const item = (config.headerButtons && config.headerButtons[id]) || DEFAULT_SETTINGS.headerButtons[id];
        const patchItem = (patch) => {
          const next = cloneJson(config);
          next.headerButtons = next.headerButtons || cloneJson(DEFAULT_SETTINGS.headerButtons);
          next.headerButtons[id] = Object.assign({}, item, patch);
          saveSettings(next);
        };
        return row('hb-' + id, labelKey, null,
          h('span', { className: 'pbx-setInline' },
            config.header && config.header.placement === 'composer'
              ? h('span', { className: 'pbx-setMuted' }, t('settings.hb.followPlacement'))
              : h('select', {
                className: 'pbx-setSelect', value: item.side,
                onChange: (event) => patchItem({ side: event.target.value })
              },
                h('option', { value: 'left' }, t('settings.hb.sideLeft')),
                h('option', { value: 'right' }, t('settings.hb.sideRight'))
              ),
            h('button', {
              type: 'button', role: 'switch', 'aria-checked': !item.hidden,
              className: 'pbx-switch' + (item.hidden ? '' : ' on'),
              onClick: () => patchItem({ hidden: !item.hidden })
            }, h('span', { className: 'pbx-switchThumb' }))
          )
        );
      };

      return h('div', { className: 'pbx-setPage' },
        h('h2', { className: 'pbx-setTitle' }, t('settings.title')),
        h('p', { className: 'pbx-setIntro' }, t('settings.intro')),

        h('section', { className: 'pbx-setSection' },
          h('h3', { className: 'pbx-setSectionTitle' }, t('settings.shortcuts')),
          shortcutRow('palette', 'settings.shortcut.palette'),
          shortcutRow('prev', 'settings.shortcut.prev'),
          shortcutRow('next', 'settings.shortcut.next'),
          shortcutRow('userPrev', 'settings.shortcut.userPrev'),
          shortcutRow('userNext', 'settings.shortcut.userNext'),
          shortcutRow('scrollBottom', 'settings.shortcut.scrollBottom'),
          shortcutRow('sidebarBoard', 'settings.shortcut.sidebarBoard'),
          shortcutRow('panelHalf', 'settings.shortcut.panelHalf'),
          shortcutRow('panelFull', 'settings.shortcut.panelFull'),
          shortcutRow('rename', 'settings.shortcut.rename'),
          shortcutRow('sessionMenu', 'settings.shortcut.sessionMenu'),
          shortcutRow('interject', 'settings.shortcut.interject'),
          shortcutRow('hud', 'settings.shortcut.hud'),
          builtinWarnings.map((item) => h('div', { key: 'warn-' + item.key, className: 'pbx-setWarn' },
            t('toast.conflictExisting', { combo: comboDisplay(item.combo), name: item.label })
          )),
          recordError ? h('div', { className: 'pbx-setError' }, recordError) : null,
          h('div', { className: 'pbx-setHint' }, t('settings.shortcut.hint'))
        ),

        h('section', { className: 'pbx-setSection' },
          h('h3', { className: 'pbx-setSectionTitle' }, t('settings.headerButtons')),
          selectRow('header', 'placement', 'settings.headerPlacement', [
            { value: 'header', labelKey: 'settings.placement.header' },
            { value: 'composer', labelKey: 'settings.placement.composer' }
          ]),
          ['switch', 'historyNav', 'capsule'].map((id) => headerButtonRow(id, 'settings.hb.' + id)),
          h('div', { className: 'pbx-setHint' }, t(config.header.placement === 'composer' ? 'settings.composerButtonsHint' : 'settings.headerButtonsHint'))
        ),

        h('section', { className: 'pbx-setSection' },
          h('h3', { className: 'pbx-setSectionTitle' }, t('settings.behavior')),
          toggleRow('palette', 'enabled', 'settings.paletteEnabled', 'settings.paletteEnabledDesc'),
          toggleRow('hints', 'shortcuts', 'settings.shortcutHints', 'settings.shortcutHintsDesc'),
          toggleRow('hud', 'enabled', 'settings.hudEnabled', 'settings.hudEnabledDesc'),
          toggleRow('hud', 'includeDone', 'settings.hudDone', 'settings.hudDoneDesc'),
          toggleRow('hud', 'recentEnabled', 'settings.hudRecent', 'settings.hudRecentDesc'),
          numberRow('hud', 'recentCount', 'settings.hudRecentCount', 1, 20, 1),
          numberRow('hud', 'maxSessions', 'settings.hudMaxSessions', 1, 20, 1),
          toggleRow('hud', 'recentExcludeAuto', 'settings.hudRecentExcludeAuto', 'settings.hudRecentExcludeAutoDesc'),
          toggleRow('hud', 'defaultCollapsed', 'settings.hudCollapsed', 'settings.hudCollapsedDesc'),
          selectRow('hud', 'defaultPosition', 'settings.hudPosition', [
            { value: 'top-right', labelKey: 'settings.pos.top' },
            { value: 'bottom-right', labelKey: 'settings.pos.bottom' },
            { value: 'last', labelKey: 'settings.pos.last' }
          ]),
          toggleRow('board', 'enabled', 'settings.boardEnabled', 'settings.boardEnabledDesc'),
          numberRow('board', 'wideThreshold', 'settings.boardThreshold', 320, 1000, 20),
          selectRow('board', 'defaultView', 'settings.boardView', [
            { value: 'sessions', labelKey: 'view.sessions' },
            { value: 'projects', labelKey: 'view.projects' }
          ]),
          toggleRow('notify', 'enabled', 'settings.notifyEnabled', 'settings.notifyEnabledDesc'),
          toggleRow('notify', 'sound', 'settings.notifySound', 'settings.notifySoundDesc'),
          rangeRow('palette', 'blur', 'settings.blur', 6, 32, 1)
        ),

        h('section', { className: 'pbx-setSection' },
          h('h3', { className: 'pbx-setSectionTitle' }, t('settings.data')),
          h('div', { className: 'pbx-setActions' },
            h('button', { type: 'button', className: 'pbx-setBtn', onClick: resetAll }, t('settings.reset')),
            h('button', { type: 'button', className: 'pbx-setBtn danger', onClick: resetAppearance }, t('settings.resetAppearance'))
          ),
          h('div', { className: 'pbx-setHint' }, t('settings.resetAppearanceHint'))
        )
      );
    }

    function PanelIcon(props) { return h(Icon, { name: 'board', size: props && props.size ? props.size : 16 }); }

    /* ------------------------------------------------------------------ css */
    const CSS = [
      '.pbx-root{height:100%;overflow:auto;box-sizing:border-box;background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);font-size:14px;line-height:1.45}',
      '.pbx-wrap{max-width:1400px;margin:0 auto;padding:26px 28px 40px}',
      '.pbx-header{display:flex;align-items:flex-end;justify-content:space-between;gap:16px;margin-bottom:16px;flex-wrap:wrap}',
      '.pbx-titleRow{display:flex;align-items:center;gap:9px;font-size:18px;font-weight:600}',
      '.pbx-glyph{display:inline-flex;color:var(--dsw-alias-brand-primary)}',
      '.pbx-subtitle{color:var(--dsw-alias-label-secondary);font-size:13px;margin-top:4px}',
      '.pbx-totals{display:flex;gap:8px;flex-wrap:wrap}',
      '.pbx-total{display:flex;align-items:center;gap:6px;padding:5px 11px;border-radius:999px;background:var(--dsw-alias-bg-layer-1);border:1px solid var(--dsw-alias-border-l1);font-size:12px;color:var(--dsw-alias-label-secondary)}',
      '.pbx-total strong{color:var(--dsw-alias-label-primary);font-weight:600;font-size:13px}',
      '.pbx-toolbar{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:10px;flex-wrap:wrap}',
      '.pbx-tabs{display:flex;gap:2px}',
      '.pbx-tab{display:inline-flex;align-items:center;gap:6px;border:none;background:transparent;color:var(--dsw-alias-label-secondary);font:inherit;font-size:13px;font-weight:500;padding:6px 10px;border-radius:8px;cursor:pointer}',
      '.pbx-tab:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}',
      '.pbx-tab.active{background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary);font-weight:600}',
      '.pbx-tabCount{font-size:11px;color:var(--dsw-alias-label-secondary);background:var(--dsw-alias-bg-layer-1);border-radius:999px;padding:0 6px;line-height:16px}',
      '.pbx-tools{display:flex;align-items:center;gap:8px;flex-wrap:wrap}',
      '.pbx-input{height:30px;min-width:180px;box-sizing:border-box;border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);border-radius:8px;padding:0 10px;font:inherit;font-size:13px;outline:none}',
      '.pbx-input:focus{border-color:var(--dsw-alias-brand-primary)}',
      '.pbx-select{height:30px;box-sizing:border-box;border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);border-radius:8px;padding:0 8px;font:inherit;font-size:12.5px;outline:none;max-width:200px}',
      '.pbx-toggle{height:30px;border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-secondary);border-radius:8px;padding:0 10px;font:inherit;font-size:12.5px;cursor:pointer}',
      '.pbx-toggle:hover{background:var(--dsw-alias-interactive-bg-hover)}',
      '.pbx-toggle.on{background:color-mix(in srgb,var(--dsw-alias-brand-primary) 14%,transparent);border-color:color-mix(in srgb,var(--dsw-alias-brand-primary) 45%,var(--dsw-alias-border-l1));color:var(--dsw-alias-brand-primary)}',
      '.pbx-sortHint{font-size:11px;color:var(--dsw-alias-label-secondary);white-space:nowrap;opacity:.8}',
      '.pbx-dbScroll{max-height:calc(100vh - 250px);overflow:auto;border:1px solid var(--dsw-alias-border-l1);border-radius:12px;background:var(--dsw-alias-bg-layer-1)}',
      '.pbx-table{width:100%;border-collapse:separate;border-spacing:0;table-layout:auto}',
      '.pbx-th{position:sticky;top:0;z-index:2;background:var(--dsw-alias-bg-layer-1);text-align:left;font-weight:500;font-size:12px;color:var(--dsw-alias-label-secondary);padding:9px 10px;border-bottom:1px solid var(--dsw-alias-border-l1);white-space:nowrap;user-select:none}',
      '.pbx-th.sortable{cursor:pointer}',
      '.pbx-th.sortable:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}',
      '.pbx-th.active{color:var(--dsw-alias-label-primary)}',
      '.pbx-th.num{text-align:right}',
      '.pbx-thType{opacity:.55;margin-right:5px;font-size:11px}',
      '.pbx-sortMark{margin-left:5px;color:var(--dsw-alias-brand-primary);font-size:11px}',
      '.pbx-tr{cursor:pointer}',
      '.pbx-tr-auto td{background:color-mix(in srgb,var(--dsw-alias-state-warn-primary) 5%,transparent)}',
      '.pbx-tr:hover td{background:var(--dsw-alias-interactive-bg-hover)}',
      '.pbx-tr td{padding:7px 10px;border-bottom:1px solid var(--dsw-alias-border-l1);font-size:13px;color:var(--dsw-alias-label-primary);vertical-align:middle}',
      '.pbx-tr-current td:first-child{box-shadow:inset 2px 0 0 var(--dsw-alias-brand-primary)}',
      '.pbx-tr-live td:first-child{box-shadow:inset 2px 0 0 var(--dsw-alias-brand-primary)}',
      '.pbx-titleCell{display:flex;align-items:center;gap:8px;min-width:0}',
      '.pbx-titleText{font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:420px}',
      '.pbx-subText{font-size:11.5px;color:var(--dsw-alias-label-secondary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:360px}',
      '.pbx-twoLine{display:flex;flex-direction:column;min-width:0;gap:1px}',
      '.pbx-rdot{width:8px;height:8px;border-radius:50%;flex:none}',
      '.pbx-kdot{width:7px;height:7px;border-radius:50%;flex:none}',
      '.pbx-rdot[data-tone=running],.pbx-kdot[data-tone=running]{background:var(--dsw-alias-brand-primary);animation:pbxDotPulse 1.6s ease-out infinite}',
      '.pbx-rdot[data-tone=attention],.pbx-kdot[data-tone=attention]{background:var(--dsw-alias-state-error-primary)}',
      '.pbx-rdot[data-tone=done],.pbx-kdot[data-tone=done]{background:var(--dsw-alias-state-success-primary)}',
      '.pbx-rdot[data-tone=idle],.pbx-kdot[data-tone=idle]{background:var(--dsw-alias-state-idle-primary)}',
      '.pbx-chip{display:inline-flex;align-items:center;gap:6px;max-width:220px}',
      '.pbx-chipIcon{width:20px;height:20px;border-radius:6px;display:inline-flex;align-items:center;justify-content:center;flex:none}',
      '.pbx-chipIcon.lg{width:24px;height:24px;border-radius:7px}',
      '.pbx-chipName{font-size:12.5px;color:var(--dsw-alias-label-secondary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      '.pbx-statusPill{display:inline-flex;align-items:center;gap:6px;padding:2px 9px;border-radius:999px;font-size:12px;font-weight:500;white-space:nowrap}',
      '.pbx-statusPill[data-tone=running]{background:color-mix(in srgb,var(--dsw-alias-brand-primary) 14%,transparent);color:var(--dsw-alias-brand-primary);animation:pbxPillBreathe 2.2s ease-in-out infinite}',
      '.pbx-statusPill[data-tone=attention]{background:color-mix(in srgb,var(--dsw-alias-state-error-primary) 14%,transparent);color:var(--dsw-alias-state-error-primary)}',
      '.pbx-statusPill[data-tone=done]{background:color-mix(in srgb,var(--dsw-alias-state-success-primary) 14%,transparent);color:var(--dsw-alias-state-success-primary)}',
      '.pbx-statusPill[data-tone=idle]{background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-secondary)}',
      '.pbx-curTag{font-size:10.5px;color:var(--dsw-alias-brand-primary);border:1px solid color-mix(in srgb,var(--dsw-alias-brand-primary) 45%,transparent);border-radius:999px;padding:0 6px;line-height:16px;flex:none}',
      '.pbx-check{width:16px;height:16px;border-radius:4px;border:1.5px solid var(--dsw-alias-border-l2);display:inline-flex;align-items:center;justify-content:center;color:var(--dsw-alias-bg-base)}',
      '.pbx-check.on{background:var(--dsw-alias-brand-primary);border-color:var(--dsw-alias-brand-primary)}',
      '.pbx-modeTag{display:inline-block;max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:12px;padding:2px 8px;border-radius:6px;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary);border:1px solid var(--dsw-alias-border-l1)}',
      '.pbx-modeTag.empty{color:var(--dsw-alias-label-secondary);background:transparent;border-color:transparent;padding-left:2px}',
      '.pbx-kindTag{display:inline-flex;align-items:center;gap:5px;font-size:12px;color:var(--dsw-alias-label-secondary);white-space:nowrap}',
      '.pbx-kindTag.auto{color:var(--dsw-alias-state-warn-primary);background:color-mix(in srgb,var(--dsw-alias-state-warn-primary) 15%,transparent);padding:2px 8px;border-radius:999px;font-weight:500}',
      '.pbx-autoGlyph{display:inline-flex;color:var(--dsw-alias-state-warn-primary);flex:none}',
      '.pbx-num{text-align:right;font-variant-numeric:tabular-nums;color:var(--dsw-alias-label-secondary)}',
      '.pbx-num.pbx-strong{color:var(--dsw-alias-label-primary);font-weight:600}',
      '.pbx-center{text-align:center}',
      '.pbx-openBtn{display:inline-flex;align-items:center;justify-content:center;width:26px;height:26px;border:none;background:transparent;color:var(--dsw-alias-label-secondary);border-radius:6px;cursor:pointer;opacity:0;transition:opacity .15s ease}',
      '.pbx-tr:hover .pbx-openBtn{opacity:1}',
      '.pbx-openBtn:hover{background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary)}',
      '.pbx-groupRow td{background:var(--dsw-alias-bg-layer-2);padding:7px 10px;border-bottom:1px solid var(--dsw-alias-border-l1);cursor:pointer;font-weight:600}',
      '.pbx-groupRow:hover td{background:var(--dsw-alias-interactive-bg-hover)}',
      '.pbx-groupChevron{display:inline-flex;color:var(--dsw-alias-label-secondary);transition:transform .15s ease;margin-right:6px;vertical-align:middle}',
      '.pbx-groupChevron.open{transform:rotate(90deg)}',
      '.pbx-groupCount{margin-left:8px;font-size:11.5px;color:var(--dsw-alias-label-secondary);font-weight:400}',
      '.pbx-appearCell{display:inline-flex;align-items:center;gap:7px}',
      '.pbx-miniSwatch{width:14px;height:14px;border-radius:4px;flex:none}',
      '.pbx-appearBtn{display:inline-flex;align-items:center;gap:5px;border:1px solid transparent;background:transparent;color:var(--dsw-alias-label-secondary);font:inherit;font-size:12px;padding:3px 7px;border-radius:6px;cursor:pointer}',
      '.pbx-appearBtn:hover{background:var(--dsw-alias-bg-layer-2);border-color:var(--dsw-alias-border-l1);color:var(--dsw-alias-label-primary)}',
      '.pbx-emptyCell{text-align:center;color:var(--dsw-alias-label-secondary);padding:24px 10px;font-size:13px}',
      '.pbx-dbFoot{padding:8px 10px;font-size:12px;color:var(--dsw-alias-label-secondary);border-top:1px solid var(--dsw-alias-border-l1)}',
      '.pbx-loading{padding:40px 8px;color:var(--dsw-alias-label-secondary);font-size:13px}',
      '.pbx-empty{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;padding:72px 24px;color:var(--dsw-alias-label-secondary);background:var(--dsw-alias-bg-layer-1);border:1px dashed var(--dsw-alias-border-l2);border-radius:16px}',
      '.pbx-emptyIcon{opacity:.7}.pbx-emptyTitle{font-size:15px;font-weight:600;color:var(--dsw-alias-label-primary)}.pbx-emptyDesc{font-size:13px;text-align:center;max-width:340px}',
      '.pbx-pop{position:absolute;top:calc(100% + 6px);right:0;z-index:50;background:var(--dsw-alias-bg-overlay);border:1px solid var(--dsw-alias-border-l2);border-radius:12px;padding:12px;width:236px;box-shadow:0 10px 30px rgba(0,0,0,.28)}',
      '.pbx-popLabel{font-size:12px;color:var(--dsw-alias-label-secondary);margin:0 0 8px}',
      '.pbx-swatches{display:grid;grid-template-columns:repeat(9,1fr);gap:6px;margin-bottom:12px}',
      '.pbx-swatchBtn{width:100%;aspect-ratio:1;border-radius:7px;border:2px solid transparent;cursor:pointer;padding:0}',
      '.pbx-swatchBtn.sel{border-color:var(--dsw-alias-label-primary);box-shadow:0 0 0 2px var(--dsw-alias-bg-overlay)}',
      '.pbx-icons{display:grid;grid-template-columns:repeat(5,1fr);gap:6px;margin-bottom:10px}',
      '.pbx-iconBtn{display:flex;align-items:center;justify-content:center;height:34px;border-radius:8px;border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-secondary);cursor:pointer}',
      '.pbx-iconBtn:hover{color:var(--dsw-alias-label-primary)}',
      '.pbx-iconBtn.sel{border-color:var(--dsw-alias-brand-primary);color:var(--dsw-alias-brand-primary)}',
      '.pbx-reset{width:100%;padding:6px;border-radius:8px;border:1px solid var(--dsw-alias-border-l1);background:transparent;color:var(--dsw-alias-label-secondary);cursor:pointer;font:inherit;font-size:12px}',
      '.pbx-reset:hover{background:var(--dsw-alias-interactive-bg-hover)}',
      '@keyframes pbxDotPulse{0%{box-shadow:0 0 0 0 color-mix(in srgb,var(--dsw-alias-brand-primary) 60%,transparent)}70%{box-shadow:0 0 0 6px color-mix(in srgb,var(--dsw-alias-brand-primary) 0%,transparent)}100%{box-shadow:0 0 0 0 color-mix(in srgb,var(--dsw-alias-brand-primary) 0%,transparent)}}',
      '@keyframes pbxPillBreathe{0%,100%{background:color-mix(in srgb,var(--dsw-alias-brand-primary) 12%,transparent)}50%{background:color-mix(in srgb,var(--dsw-alias-brand-primary) 26%,transparent)}}',
      '.pbx-nav{display:flex;align-items:center;gap:8px;min-width:0}',
      '.pbx-navRight{gap:4px;margin-right:2px}',
      '.pbx-navItem{display:flex;align-items:center;flex:none}',
      '.pbx-navHistory{display:flex;align-items:center;height:26px;border:1px solid var(--dsw-alias-border-l1);border-radius:7px;overflow:hidden;background:color-mix(in srgb,var(--dsw-alias-bg-layer-1) 78%,transparent)}',
      '.pbx-navSeg{display:inline-flex;align-items:center;justify-content:center;width:26px;height:24px;border:none;background:transparent;color:var(--dsw-alias-label-secondary);cursor:pointer}',
      '.pbx-navSeg+.pbx-navSeg{border-left:1px solid var(--dsw-alias-border-l1)}',
      '.pbx-navSeg:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}',
      '.pbx-navEmpty{width:0;min-width:0;gap:0}',
      '.pbx-dockButtons{display:flex;align-items:center;justify-content:flex-end;gap:8px;flex-wrap:wrap;padding:2px 2px 0}',
      '.pbx-shortcutHints{display:flex;align-items:center;gap:7px;flex-wrap:wrap;min-width:0;color:var(--dsw-alias-label-secondary);order:9999;opacity:.5;transition:opacity .18s ease}',
      '.pbx-hintGroup{display:inline-flex;align-items:center;gap:4px;flex:none}',
      '.pbx-hintGroupLabel{font-size:9.5px;font-weight:600;letter-spacing:.02em;color:var(--dsw-alias-label-tertiary)}',
      '.pbx-hintItem{display:inline-flex;align-items:center;gap:2px}',
      '.pbx-hintKey{font-family:inherit;font-size:9px;line-height:12px;padding:0 3px;border-radius:var(--dsw-radius-xs);border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-secondary)}',
      '.pbx-hintLabel{font-size:10px;color:var(--dsw-alias-label-secondary)}',
      '.pbx-hintSep{width:1px;height:11px;background:var(--dsw-alias-border-l1);flex:none}',
      '.pbx-hintClose{width:16px;height:16px;padding:0;border:none;background:transparent;color:var(--dsw-alias-label-tertiary);border-radius:var(--dsw-radius-xs);cursor:pointer;opacity:0;pointer-events:none;line-height:14px;font-size:13px;transition:opacity .15s ease,background .15s ease}',
      '.pbx-shortcutHints:hover{opacity:1}',
      '.pbx-shortcutHints:hover .pbx-hintClose,.pbx-hintClose:focus-visible{opacity:1;pointer-events:auto}',
      '.pbx-hintClose:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}',
      '.pbx-navGap{flex:none;align-self:center;height:28px;box-sizing:border-box;border-radius:7px;border:1px dashed color-mix(in srgb,var(--dsw-alias-brand-primary) 40%,transparent);background:color-mix(in srgb,var(--dsw-alias-brand-primary) 9%,transparent);transition:width .18s cubic-bezier(.2,.8,.2,1)}',
      '.pbx-dragGhost{border-radius:8px;overflow:hidden;filter:drop-shadow(0 8px 20px rgba(0,0,0,.25))}',
      '.pbx-setInline{display:flex;align-items:center;gap:8px}',
      '.pbx-setMuted{font-size:12px;color:var(--dsw-alias-label-tertiary)}',
      '.pbx-navSwitch{display:flex;align-items:center;gap:7px;height:30px;max-width:380px;padding:0 8px 0 9px;border:1px solid var(--dsw-alias-border-l1);background:color-mix(in srgb,var(--dsw-alias-bg-layer-1) 78%,transparent);backdrop-filter:blur(14px) saturate(1.3);-webkit-backdrop-filter:blur(14px) saturate(1.3);color:var(--dsw-alias-label-secondary);border-radius:8px;cursor:pointer;font:inherit;font-size:12.5px;min-width:0}',
      '.pbx-navSwitch:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}',
      '.pbx-navSwitch.active{border-color:var(--dsw-alias-brand-primary);color:var(--dsw-alias-label-primary)}',
      '.pbx-navTitle{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:240px}',
      '.pbx-navJump{display:flex;align-items:center;gap:2px}',
      '.pbx-navIconBtn{display:inline-flex;align-items:center;justify-content:center;width:26px;height:26px;border:1px solid var(--dsw-alias-border-l1);background:color-mix(in srgb,var(--dsw-alias-bg-layer-1) 78%,transparent);color:var(--dsw-alias-label-secondary);border-radius:7px;cursor:pointer}',
      '.pbx-navIconBtn:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}',
      '.pbx-kbd{font-size:10px;color:var(--dsw-alias-label-secondary);border:1px solid var(--dsw-alias-border-l1);border-radius:5px;padding:0 4px;line-height:14px;flex:none}',
      '.pbx-capsule{display:flex;align-items:center;gap:8px;height:30px;padding:0 10px;border:1px solid var(--dsw-alias-border-l1);background:color-mix(in srgb,var(--dsw-alias-bg-layer-1) 78%,transparent);backdrop-filter:blur(14px) saturate(1.3);-webkit-backdrop-filter:blur(14px) saturate(1.3);border-radius:999px;cursor:pointer;font:inherit;font-size:12px;color:var(--dsw-alias-label-secondary)}',
      '.pbx-capsule:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}',
      '.pbx-capStat{display:inline-flex;align-items:center;gap:5px;color:var(--dsw-alias-label-secondary);font-variant-numeric:tabular-nums}',
      '.pbx-capStat.live{color:var(--dsw-alias-brand-primary)}',
      '.pbx-capStat.attn{color:var(--dsw-alias-state-error-primary)}',
      '.pbx-liveDot{width:7px;height:7px;border-radius:50%;background:var(--dsw-alias-state-idle-primary);flex:none}',
      '.pbx-capStat.live .pbx-liveDot{background:var(--dsw-alias-brand-primary);animation:pbxDotPulse 1.6s ease-out infinite}',
      '.pbx-capDot{width:7px;height:7px;border-radius:50%;background:var(--dsw-alias-state-error-primary);flex:none}',
      '.pbx-capBoard{display:inline-flex;align-items:center;gap:5px;padding-left:8px;border-left:1px solid var(--dsw-alias-border-l1);color:var(--dsw-alias-label-secondary)}',
      '.pbx-paletteBackdrop{position:fixed;inset:0;z-index:1000;background:rgba(8,10,14,.20);backdrop-filter:blur(15px) saturate(1.35);-webkit-backdrop-filter:blur(15px) saturate(1.35);display:flex;justify-content:center;align-items:flex-start;padding-top:12vh;pointer-events:auto;animation:pbxBackdropIn .2s ease-out both}',
      '.pbx-palette{width:min(700px,92vw);max-height:72vh;display:flex;flex-direction:column;background:linear-gradient(180deg,color-mix(in srgb,var(--dsw-alias-bg-overlay) 74%,transparent),color-mix(in srgb,var(--dsw-alias-bg-overlay) 56%,transparent));backdrop-filter:blur(26px) saturate(1.55);-webkit-backdrop-filter:blur(26px) saturate(1.55);border:1px solid color-mix(in srgb,var(--dsw-alias-border-l2) 62%,rgba(255,255,255,.26));border-radius:16px;box-shadow:0 28px 90px rgba(0,0,0,.5),inset 0 1px 0 rgba(255,255,255,.09);overflow:hidden;animation:pbxPaletteIn .22s cubic-bezier(.2,.8,.2,1) both}',
      '.pbx-paletteHead{display:flex;align-items:center;gap:10px;padding:14px 16px;border-bottom:1px solid var(--dsw-alias-border-l1);color:var(--dsw-alias-label-secondary)}',
      '.pbx-paletteInput{flex:1;border:none;background:transparent;color:var(--dsw-alias-label-primary);font:inherit;font-size:15px;line-height:22px;outline:none}',
      '.pbx-paletteChips{display:flex;gap:7px;flex-wrap:wrap;padding:10px 14px;border-bottom:1px solid var(--dsw-alias-border-l1)}',
      '.pbx-pchip{display:inline-flex;align-items:center;gap:6px;height:26px;padding:0 10px 0 6px;border-radius:999px;border:1px solid var(--dsw-alias-border-l1);background:transparent;color:var(--dsw-alias-label-secondary);font:inherit;font-size:12px;cursor:pointer;transition:background .16s ease,border-color .16s ease,color .16s ease}',
      '.pbx-pchipIcon{width:17px;height:17px;border-radius:5px;display:inline-flex;align-items:center;justify-content:center;flex:none}',
      '.pbx-pchip:hover{background:var(--dsw-alias-interactive-bg-hover)}',
      '.pbx-pchip.on{background:color-mix(in srgb,var(--dsw-alias-brand-primary) 15%,transparent);border-color:color-mix(in srgb,var(--dsw-alias-brand-primary) 45%,var(--dsw-alias-border-l1));color:var(--dsw-alias-brand-primary)}',
      '.pbx-paletteList{overflow:auto;padding:8px;flex:1 1 auto;min-height:0}',
      '.pbx-prow{display:flex;align-items:center;gap:10px;width:100%;padding:9px 11px;border:none;background:transparent;border-radius:9px;cursor:pointer;font:inherit;text-align:left;color:var(--dsw-alias-label-primary)}',
      '.pbx-prow{animation:pbxProwIn .18s ease both;transition:background .16s ease}',
      '.pbx-prow.active{background:var(--dsw-alias-interactive-bg-hover)}',
      '.pbx-prowTitle{font-size:14px;font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1;min-width:0}',
      '.pbx-prowMeta{display:inline-flex;align-items:center;gap:6px;font-size:12px;color:var(--dsw-alias-label-secondary);flex:none;max-width:190px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      '.pbx-prowWsIcon{width:15px;height:15px;border-radius:4px;display:inline-flex;align-items:center;justify-content:center;flex:none}',
      '.pbx-prowTime{font-size:11.5px;color:var(--dsw-alias-label-secondary);flex:none;min-width:44px;text-align:right}',
      '.pbx-paletteEmpty{padding:24px;text-align:center;color:var(--dsw-alias-label-secondary);font-size:13.5px}',
      '.pbx-paletteFoot{padding:9px 16px;border-top:1px solid var(--dsw-alias-border-l1);font-size:12px;color:var(--dsw-alias-label-secondary)}',
      '.pbx-hud{position:fixed;z-index:900;width:300px;max-width:calc(100vw - 16px);background:linear-gradient(180deg,color-mix(in srgb,var(--dsw-alias-bg-overlay) 88%,transparent),color-mix(in srgb,var(--dsw-alias-bg-overlay) 78%,transparent));backdrop-filter:blur(26px) saturate(1.35);-webkit-backdrop-filter:blur(26px) saturate(1.35);border:1px solid var(--dsw-alias-border-l1);border-radius:14px;box-shadow:0 18px 48px rgba(0,0,0,.28);overflow:hidden;pointer-events:auto;transform-origin:top right}',
      '.pbx-hudInner{display:flex;flex-direction:column;min-height:0}',
      '.pbx-hudInner.swap-out{animation:pbxHudSwapOut .12s cubic-bezier(.4,0,1,1) both}',
      '.pbx-hudInner.swap-in{animation:pbxHudSwapIn .26s cubic-bezier(.22,.82,.3,1) both}',
      '.pbx-hud.default{right:18px;top:72px}',
      '.pbx-hud.moved{right:auto;top:auto}',
      '.pbx-hud.dragging{cursor:grabbing}',
      '.pbx-hudHead{display:flex;align-items:center;gap:8px;padding:10px 12px;border-bottom:1px solid var(--dsw-alias-border-l1);cursor:grab;user-select:none}',
      '.pbx-hudGrip{width:10px;height:14px;background-image:radial-gradient(var(--dsw-alias-label-secondary) 1px,transparent 1px);background-size:3px 3px;opacity:.5;flex:none}',
      '.pbx-hudHeadTitle{font-size:12.5px;font-weight:600;color:var(--dsw-alias-label-primary)}',
      '.pbx-hudCount{margin-left:auto;font-size:11px;color:var(--dsw-alias-label-secondary);background:var(--dsw-alias-bg-layer-2);border-radius:999px;padding:0 7px;line-height:17px}',
      '.pbx-hudCollapse{width:22px;height:22px;border:none;background:transparent;color:var(--dsw-alias-label-secondary);border-radius:5px;cursor:pointer;font:inherit;line-height:16px}',
      '.pbx-hudCollapse:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}',
      '.pbx-hudList{max-height:260px;overflow-x:hidden;overflow-y:auto;padding:7px;transition:height .28s cubic-bezier(.2,.8,.2,1);scrollbar-width:none;-ms-overflow-style:none}',
      '.pbx-hudList::-webkit-scrollbar{width:0;height:0}',
      '.pbx-hud:hover .pbx-hudList{scrollbar-width:thin;scrollbar-color:var(--dsw-alias-border-l2) transparent}',
      '.pbx-hud:hover .pbx-hudList::-webkit-scrollbar{width:6px;height:6px}',
      '.pbx-hud:hover .pbx-hudList::-webkit-scrollbar-thumb{background:var(--dsw-alias-border-l2);border-radius:3px}',
      '.pbx-hud:hover .pbx-hudList::-webkit-scrollbar-track{background:transparent}',
      '.pbx-hudListInner{display:flex;flex-direction:column;}',
      '.pbx-hudRow{position:relative;display:flex;align-items:center;gap:9px;width:100%;padding:8px 9px;border:none;background:transparent;border-radius:9px;cursor:pointer;font:inherit;text-align:left;color:var(--dsw-alias-label-primary);transition:background .45s ease,box-shadow .45s ease;animation:pbxHudRowIn .26s cubic-bezier(.2,.8,.2,1) both}',
      '.pbx-hudRow:hover{background:var(--dsw-alias-interactive-bg-hover)}',
      '.pbx-hudRow.auto{background:color-mix(in srgb,var(--dsw-alias-state-warn-primary) 6%,transparent)}',
      '.pbx-hudRow.auto:hover{background:color-mix(in srgb,var(--dsw-alias-state-warn-primary) 12%,var(--dsw-alias-interactive-bg-hover))}',
      '.pbx-hudRow.auto::before{content:"";position:absolute;left:0;top:7px;bottom:7px;width:2px;border-radius:2px;background:var(--dsw-alias-state-warn-primary);opacity:.75}',
      '.pbx-hudAuto{display:inline-flex;align-items:center;color:var(--dsw-alias-state-warn-primary);flex:none}',
      '.pbx-hudRow.current{box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--dsw-alias-brand-primary) 45%,transparent)}',
      '.pbx-hudRow.spotlight{box-shadow:inset 0 0 0 1px var(--dsw-alias-brand-primary)}',
      '.pbx-hudRow.live .pbx-hudTimer{color:var(--dsw-alias-brand-primary)}',
      '.pbx-hudRowMain{display:flex;flex-direction:column;min-width:0;flex:1;gap:1px}',
      '.pbx-hudRowTitle{font-size:13px;font-weight:500;line-height:18px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      '.pbx-hudRowMeta{font-size:11px;line-height:15px;color:var(--dsw-alias-label-secondary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      '.pbx-hudTimer{font-size:11.5px;color:var(--dsw-alias-label-secondary);font-variant-numeric:tabular-nums;flex:none}',
      '.pbx-hudFoot{display:flex;flex-direction:column;gap:5px;padding:8px 11px 9px;border-top:1px solid var(--dsw-alias-border-l1)}',
      '.pbx-hudFootGroup{display:flex;align-items:center;gap:6px;min-width:0;flex-wrap:wrap}',
      '.pbx-hudFootTitle{font-size:10px;font-weight:600;letter-spacing:.03em;color:var(--dsw-alias-label-tertiary);flex:none;min-width:22px}',
      '.pbx-hudFootItem{display:inline-flex;align-items:center;gap:3px;flex:none}',
      '.pbx-hudKey{font-family:inherit;font-size:9.5px;line-height:13px;padding:1px 4px;border-radius:4px;border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-secondary)}',
      '.pbx-hudFootLabel{font-size:10.5px;color:var(--dsw-alias-label-secondary)}',
      '.pbx-hud.collapsed{display:inline-flex;align-items:center;gap:6px;width:auto;padding:7px 11px;border-radius:999px;background:color-mix(in srgb,var(--dsw-alias-bg-overlay) 84%,transparent);backdrop-filter:blur(24px) saturate(1.35);-webkit-backdrop-filter:blur(24px) saturate(1.35);border:1px solid var(--dsw-alias-border-l1);cursor:pointer;font:inherit;color:var(--dsw-alias-label-primary);animation:pbxHudPillIn .2s ease both}',
      '.pbx-hudPillText{font-size:12px;font-weight:600;font-variant-numeric:tabular-nums}',
      '.pbx-hudPillLabel{font-size:11.5px;color:var(--dsw-alias-label-secondary)}',
      '.pbx-responsive{height:100%;min-height:0;display:flex;flex-direction:column}',
      '.pbx-responsive>.pbx-root{flex:1;min-height:0}',
      '.pbx-headerRight{display:flex;align-items:center;gap:10px;flex-wrap:wrap}',
      '.pbx-renameBackdrop{position:fixed;inset:0;z-index:1100;display:flex;justify-content:center;align-items:flex-start;padding-top:16vh;background:rgba(8,10,14,.34);backdrop-filter:blur(3px);-webkit-backdrop-filter:blur(3px);pointer-events:auto;animation:pbxBackdropIn .16s ease-out both}',
      '.pbx-renameCard{width:min(420px,calc(100vw - 32px));box-sizing:border-box;background:var(--dsw-alias-bg-layer-2);border:1px solid var(--dsw-alias-border-l2);border-radius:var(--dsw-radius-xl);box-shadow:0 24px 64px rgba(0,0,0,.32);padding:18px;display:flex;flex-direction:column;gap:7px;animation:pbxPaletteIn .18s cubic-bezier(.2,.8,.2,1) both}',
      '.pbx-renameTitle{font-size:15px;font-weight:600;color:var(--dsw-alias-label-primary);margin-bottom:2px}',
      '.pbx-renameLabel{font-size:12px;color:var(--dsw-alias-label-secondary)}',
      '.pbx-renameInput{height:34px;box-sizing:border-box;border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);border-radius:var(--dsw-radius-sm);padding:0 10px;font:inherit;font-size:13px;outline:none}',
      '.pbx-renameInput:focus{border-color:var(--dsw-alias-brand-primary)}',
      '.pbx-renameError{font-size:12px;color:var(--dsw-alias-state-error-primary);overflow-wrap:anywhere}',
      '.pbx-renameActions{display:flex;justify-content:flex-end;gap:8px;margin-top:6px}',
      '.pbx-renameBtn{height:30px;padding:0 12px;border-radius:var(--dsw-radius-sm);border:1px solid var(--dsw-alias-border-l1);background:transparent;color:var(--dsw-alias-label-primary);font:inherit;font-size:12.5px;cursor:pointer}',
      '.pbx-renameBtn:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover)}',
      '.pbx-renameBtn:disabled{opacity:.5;cursor:default}',
      '.pbx-renameBtn.primary{background:var(--dsw-alias-label-primary);border-color:transparent;color:var(--dsw-alias-bg-base);font-weight:600}',
      '.pbx-renameBtn.primary:hover:not(:disabled){opacity:.9}',
      '.pbx-renameBtn.danger{color:var(--dsw-alias-state-error-primary);border-color:color-mix(in srgb,var(--dsw-alias-state-error-primary) 45%,var(--dsw-alias-border-l1))}',
      '.pbx-renameBtn.danger:hover:not(:disabled){background:color-mix(in srgb,var(--dsw-alias-state-error-primary) 12%,transparent)}',
      '.pbx-menuHint{font-size:11.5px;color:var(--dsw-alias-label-secondary);line-height:1.45;overflow-wrap:anywhere}',
      '.pbx-toasts{position:fixed;top:calc(var(--dsh-windows-titlebar-height,0px) + 12px);left:50%;transform:translateX(-50%);z-index:1200;display:flex;flex-direction:column;align-items:center;gap:8px;pointer-events:none}',
      '.pbx-toast{pointer-events:auto;display:flex;align-items:flex-start;gap:10px;min-width:260px;max-width:min(520px,calc(100vw - 32px));box-sizing:border-box;padding:10px 12px;background:var(--dsw-alias-bg-layer-2);border:1px solid var(--dsw-alias-border-l2);border-radius:var(--dsw-radius-md);box-shadow:0 12px 32px rgba(0,0,0,.28);animation:pbxToastIn .18s ease-out both}',
      '.pbx-toast[data-tone=warn]{border-color:color-mix(in srgb,var(--dsw-alias-state-warn-primary) 55%,var(--dsw-alias-border-l2))}',
      '.pbx-toastIcon{display:inline-flex;color:var(--dsw-alias-state-warn-primary);flex:none;padding-top:1px}',
      '.pbx-toastMain{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px}',
      '.pbx-toastTitle{font-size:12.5px;font-weight:600;color:var(--dsw-alias-label-primary);line-height:1.4}',
      '.pbx-toastMsg{font-size:12px;color:var(--dsw-alias-label-secondary);line-height:1.45;overflow-wrap:anywhere}',
      '.pbx-toastClose{display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;border:none;background:transparent;color:var(--dsw-alias-label-secondary);border-radius:var(--dsw-radius-xs);cursor:pointer;flex:none}',
      '.pbx-toastClose:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}',
      '.pbx-notifDock{position:fixed;z-index:1180;display:flex;flex-direction:column;align-items:flex-end;gap:8px;pointer-events:none;max-width:min(420px,calc(100vw - 24px))}',
      '.pbx-notifCard{pointer-events:auto;box-sizing:border-box;min-width:280px;max-width:100%;background:var(--dsw-alias-bg-layer-2);border:1px solid var(--dsw-alias-border-l2);border-radius:var(--dsw-radius-md);box-shadow:0 16px 40px rgba(0,0,0,.32);padding:10px 12px;display:flex;flex-direction:column;gap:6px;cursor:pointer;animation:pbxNotifIn .2s ease-out both;outline:none}',
      '.pbx-notifCard[data-tone=success]{background:color-mix(in srgb,var(--dsw-alias-state-success-primary) 11%,var(--dsw-alias-bg-layer-2));border-color:color-mix(in srgb,var(--dsw-alias-state-success-primary) 38%,var(--dsw-alias-border-l2))}',
      '.pbx-notifCard[data-tone=warn]{background:color-mix(in srgb,var(--dsw-alias-state-warn-primary) 12%,var(--dsw-alias-bg-layer-2));border-color:color-mix(in srgb,var(--dsw-alias-state-warn-primary) 42%,var(--dsw-alias-border-l2))}',
      '.pbx-notifHead{display:flex;align-items:center;gap:8px}',
      '.pbx-notifGlyph{display:inline-flex;color:var(--dsw-alias-label-secondary);flex:none}',
      '.pbx-notifCard[data-tone=success] .pbx-notifGlyph{color:var(--dsw-alias-state-success-primary)}',
      '.pbx-notifCard[data-tone=warn] .pbx-notifGlyph{color:var(--dsw-alias-state-warn-primary)}',
      '.pbx-notifTitle{flex:1;min-width:0;font-size:12.5px;font-weight:600;color:var(--dsw-alias-label-primary);line-height:1.4}',
      '.pbx-notifClose{display:inline-flex;align-items:center;justify-content:center;width:20px;height:20px;border:none;background:transparent;color:var(--dsw-alias-label-secondary);border-radius:var(--dsw-radius-xs);cursor:pointer;flex:none}',
      '.pbx-notifClose:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}',
      '.pbx-notifBody{font-size:12px;color:var(--dsw-alias-label-secondary);line-height:1.5;white-space:pre-wrap;overflow-wrap:anywhere;max-height:220px;overflow:auto}',
      '.pbx-notifFoot{font-size:11px;color:var(--dsw-alias-label-secondary);opacity:.78}',
      '.pbx-setWarn{font-size:11.5px;color:var(--dsw-alias-state-warn-primary);line-height:1.45;overflow-wrap:anywhere}',
      '.pbx-compact{padding:0}',
      '.pbx-compactWrap{padding:14px 12px 28px;max-width:none}',
      '.pbx-compactHead{display:flex;align-items:center;gap:8px;margin-bottom:10px}',
      '.pbx-compactTitle{display:flex;align-items:center;gap:7px;font-weight:600;font-size:14px;color:var(--dsw-alias-label-primary)}',
      '.pbx-compactMeta{margin-left:auto;font-size:11.5px;color:var(--dsw-alias-label-secondary)}',
      '.pbx-compactFull{display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;border:none;background:transparent;color:var(--dsw-alias-label-secondary);border-radius:6px;cursor:pointer}',
      '.pbx-compactFull:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}',
      '.pbx-cgroup{margin-bottom:12px}',
      '.pbx-cgroupHead{display:flex;align-items:center;gap:7px;padding:4px 2px 6px;font-size:11.5px;font-weight:600;color:var(--dsw-alias-label-secondary)}',
      '.pbx-cgroupTitle{letter-spacing:.02em}',
      '.pbx-cgroupCount{margin-left:auto;color:var(--dsw-alias-label-secondary);font-weight:500}',
      '.pbx-cgroupEmpty{padding:7px 8px;font-size:12px;color:var(--dsw-alias-label-secondary)}',
      '.pbx-crow{display:flex;align-items:center;gap:7px;width:100%;padding:7px 8px;border:none;background:transparent;border-radius:8px;cursor:pointer;font:inherit;text-align:left;color:var(--dsw-alias-label-primary)}',
      '.pbx-crow:hover{background:var(--dsw-alias-interactive-bg-hover)}',
      '.pbx-crow.auto{background:color-mix(in srgb,var(--dsw-alias-state-warn-primary) 5%,transparent)}',
      '.pbx-ctitle{flex:1;min-width:0;font-size:13px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      '.pbx-ctime{font-size:11px;color:var(--dsw-alias-label-secondary);flex:none}',
      '.pbx-setPage{padding:4px 2px 30px}',
      '.pbx-setTitle{font-size:16px;font-weight:600;margin:0 0 4px;color:var(--dsw-alias-label-primary)}',
      '.pbx-setIntro{font-size:12.5px;color:var(--dsw-alias-label-secondary);margin:0 0 18px}',
      '.pbx-setSection{margin-bottom:22px}',
      '.pbx-setSectionTitle{font-size:12px;font-weight:600;color:var(--dsw-alias-label-secondary);margin:0 0 4px;padding-bottom:6px;border-bottom:1px solid var(--dsw-alias-border-l1)}',
      '.pbx-setRow{display:flex;align-items:center;gap:16px;padding:11px 2px;border-bottom:1px solid var(--dsw-alias-border-l1)}',
      '.pbx-setRowText{flex:1;min-width:0}',
      '.pbx-setLabel{font-size:13px;color:var(--dsw-alias-label-primary)}',
      '.pbx-setDesc{font-size:11.5px;color:var(--dsw-alias-label-secondary);margin-top:2px}',
      '.pbx-setControl{flex:none;display:flex;align-items:center;gap:8px}',
      '.pbx-keycap{min-width:68px;height:30px;padding:0 10px;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary);border-radius:8px;font:inherit;font-size:12px;cursor:pointer}',
      '.pbx-keycap:hover{background:var(--dsw-alias-interactive-bg-hover)}',
      '.pbx-keycap.recording{border-color:var(--dsw-alias-brand-primary);color:var(--dsw-alias-brand-primary)}',
      '.pbx-switch{position:relative;width:38px;height:22px;border-radius:999px;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-2);cursor:pointer;padding:0;transition:background .15s ease,border-color .15s ease}',
      '.pbx-switch.on{background:var(--dsw-alias-brand-primary);border-color:var(--dsw-alias-brand-primary)}',
      '.pbx-switchThumb{position:absolute;top:2px;left:2px;width:16px;height:16px;border-radius:50%;background:var(--dsw-alias-bg-base);transition:transform .15s ease}',
      '.pbx-switch.on .pbx-switchThumb{transform:translateX(16px)}',
      '.pbx-setSelect{height:30px;min-width:120px;border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);border-radius:8px;padding:0 8px;font:inherit;font-size:12.5px;outline:none}',
      '.pbx-setInput{height:30px;width:88px;border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);border-radius:8px;padding:0 8px;font:inherit;font-size:12.5px;outline:none}',
      '.pbx-setRange{display:inline-flex;align-items:center;gap:8px}',
      '.pbx-setRange input{width:150px}',
      '.pbx-setRangeValue{font-size:12px;color:var(--dsw-alias-label-secondary);font-variant-numeric:tabular-nums;min-width:24px;text-align:right}',
      '.pbx-setHint{font-size:11.5px;color:var(--dsw-alias-label-secondary);padding:8px 2px 0}',
      '.pbx-setError{font-size:11.5px;color:var(--dsw-alias-state-error-primary);padding:8px 2px 0}',
      '.pbx-setActions{display:flex;gap:8px;flex-wrap:wrap;padding-top:8px}',
      '.pbx-setBtn{height:32px;padding:0 12px;border-radius:8px;border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);font:inherit;font-size:12.5px;cursor:pointer}',
      '.pbx-setBtn:hover{background:var(--dsw-alias-interactive-bg-hover)}',
      '.pbx-setBtn.danger{color:var(--dsw-alias-state-error-primary);border-color:color-mix(in srgb,var(--dsw-alias-state-error-primary) 40%,var(--dsw-alias-border-l1))}',
      '.pbx-disabled{display:flex;align-items:center;justify-content:center;padding:40px 16px;color:var(--dsw-alias-label-secondary);font-size:13px}',
      '.pbx-tab,.pbx-input,.pbx-select,.pbx-toggle,.pbx-setBtn,.pbx-setSelect,.pbx-setInput,.pbx-navSwitch,.pbx-prow,.pbx-hudRow{border-radius:var(--dsw-radius-md)}',
      '.pbx-navIconBtn,.pbx-navHistory,.pbx-hudCollapse,.pbx-openBtn,.pbx-appearBtn,.pbx-keycap,.pbx-dragGhost,.pbx-navGap,.pbx-modeTag{border-radius:var(--dsw-radius-sm)}',
      '.pbx-hud,.pbx-palette{border-radius:var(--dsw-radius-lg)}',
      '.pbx-dbScroll{border-radius:var(--dsw-radius-lg)}',
      '.pbx-pchipIcon,.pbx-prowWsIcon,.pbx-chipIcon,.pbx-miniSwatch,.pbx-check,.pbx-hudKey{border-radius:var(--dsw-radius-xs)}',
      '.pbx-chipIcon.lg{border-radius:var(--dsw-radius-sm)}',
      '.pbx-user-jump-highlight{animation:pbxUserJump 1.2s ease both;border-radius:12px}',
      '@keyframes pbxUserJump{0%{background:transparent}22%{background:color-mix(in srgb,var(--dsw-alias-brand-primary) 10%,transparent)}100%{background:transparent}}',
      '.pbx-hud.default.bottom{top:auto;bottom:18px;right:18px}',
      '.pbx-hud.closing{animation:pbxHudOut .2s ease both;pointer-events:none}',
      '.pbx-paletteBackdrop.closing{animation:pbxBackdropOut .18s ease both;pointer-events:none}',
      '.pbx-paletteBackdrop.closing .pbx-palette{animation:pbxPaletteOut .18s cubic-bezier(.4,0,1,1) both}',
      '@keyframes pbxToastIn{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:none}}',
      '@keyframes pbxNotifIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}',
      '@keyframes pbxHudPillIn{from{opacity:0;transform:translateY(2px)}to{opacity:1;transform:none}}',
      '@keyframes pbxHudSwapOut{from{opacity:1;transform:translateY(0)}to{opacity:0;transform:translateY(3px)}}',
      '@keyframes pbxHudSwapIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}',
      '@keyframes pbxHudOut{from{opacity:1;transform:none}to{opacity:0;transform:translateY(-4px) scale(.99)}}',
      '@keyframes pbxHudRowIn{from{opacity:0;transform:translateX(-4px)}to{opacity:1;transform:none}}',
      '@keyframes pbxProwIn{from{opacity:0;transform:translateY(-3px)}to{opacity:1;transform:none}}',
      '@keyframes pbxBackdropOut{from{opacity:1}to{opacity:0}}',
      '@keyframes pbxPaletteOut{from{opacity:1;transform:none}to{opacity:0;transform:translateY(-6px) scale(.99)}}',
      '@keyframes pbxBackdropIn{from{opacity:0}to{opacity:1}}',
      '@keyframes pbxPaletteIn{from{opacity:0;transform:translateY(-10px) scale(.985)}to{opacity:1;transform:translateY(0) scale(1)}}',
      '@media (prefers-reduced-motion: reduce){.pbx-kdot,.pbx-rdot,.pbx-statusPill,.pbx-liveDot,.pbx-palette,.pbx-paletteBackdrop,.pbx-renameBackdrop,.pbx-renameCard,.pbx-toast,.pbx-notifCard,.pbx-hud,.pbx-hudInner,.pbx-hudRow,.pbx-prow,.pbx-user-jump-highlight{animation:none!important}}'
    ].join('\n');

    /* ----------------------------------------------------------------- apply */
    function apply(ctx) {
      ctx.effect(() => ctx.locale.register(NS, { zh: zh, en: en }), 'project-board: dictionaries');
      ctx.effect(() => {
        const tag = document.createElement('style');
        tag.dataset.plugin = '@local/dsh-project-board';
        tag.textContent = CSS;
        document.head.appendChild(tag);
        return () => { tag.remove(); };
      }, 'project-board: styles');

      let scheduleSource = null;
      ctx.effect(() => {
        if (!ctx.remote || !ctx.remote.schedule) return undefined;
        const created = createScheduleSource(ctx);
        scheduleSource = created.source;
        return () => { scheduleSource = null; created.dispose(); };
      }, 'project-board: automation catalog');

      let presetSource = null;
      ctx.effect(() => {
        if (!ctx.remote || !ctx.remote.agentPresets) return undefined;
        const created = createPresetSource(ctx);
        presetSource = created.source;
        return () => { presetSource = null; created.dispose(); };
      }, 'project-board: agent presets');

      const uiWorkspace = ctx.get('uiWorkspace');
      const shortcutsService = ctx.get('shortcuts');
      const openSession = (sessionId) => { try { if (uiWorkspace) uiWorkspace.openSession(sessionId); } catch (error) { console.warn('project-board: open session failed', error); } };
      const paletteStore = createUiStore({ open: false });
      const focusStore = createUiStore({ id: null, at: 0 });
      const hudOrderStore = createUiStore({ ids: [] });
      const headerDragStore = createUiStore({ id: null, side: null, index: -1, width: 0 });
      const toastStore = createUiStore({ items: [], seq: 0 });
      let toastSeq = 0;
      const dismissToast = (id) => { toastStore.set({ items: toastStore.getSnapshot().items.filter((item) => item.id !== id) }); };
      const pushToast = (input) => {
        const source = input || {};
        toastSeq += 1;
        const item = { id: toastSeq, tone: source.tone || 'warn', title: source.title || '', message: source.message || '' };
        toastStore.set({ seq: toastSeq, items: toastStore.getSnapshot().items.concat([item]).slice(-4) });
        window.setTimeout(() => dismissToast(item.id), 4800);
        return item.id;
      };
      const notifStore = createUiStore({ items: [], seq: 0 });
      let notifSeq = 0;
      const dismissNotif = (id) => { notifStore.set({ items: notifStore.getSnapshot().items.filter((item) => item.id !== id) }); };
      const pushNotif = (input) => {
        const source = input || {};
        notifSeq += 1;
        const item = { id: notifSeq, tone: source.tone || 'success', title: source.title || '', body: source.body || '', sessionId: source.sessionId || null };
        notifStore.set({ seq: notifSeq, items: notifStore.getSnapshot().items.concat([item]).slice(-3) });
        window.setTimeout(() => dismissNotif(item.id), Math.max(4000, Number(source.ttl) || 9000));
        return item.id;
      };
      /** Read the DSH shortcut catalog and report the first built-in command already using this combo. */
      const findBuiltinConflict = (combo) => {
        try {
          const shortcuts = ctx.get('shortcuts');
          const rows = shortcuts && shortcuts.catalog && typeof shortcuts.catalog.getSnapshot === 'function' ? shortcuts.catalog.getSnapshot() : null;
          if (!Array.isArray(rows) || rows.length === 0) return null;
          const target = comboBindingOf(combo);
          if (!target) return null;
          for (const row of rows) {
            if (!row || !row.binding || row.issue) continue;
            if (Array.isArray(row.conflicts) && row.conflicts.length > 0) continue;
            if (bindingsOverlap(target, row.binding)) return { id: row.id, label: row.label || row.id };
          }
        } catch (error) { /* ignore */ }
        return null;
      };
      const settingsStore = createUiStore(loadSettings());
      const writeSettings = (next) => { const merged = mergeSettings(DEFAULT_SETTINGS, next); merged.headerButtonsVersion = 3; merged.hintsVersion = 1; persistSettings(merged); settingsStore.set(merged); };
      const toggleHud = () => {
        try {
          window.dispatchEvent(new CustomEvent('pbx-hud-toggle'));
        } catch (error) { console.warn('project-board: toggle hud failed', error); }
      };
      const boardHooks = () => Object.assign(
        { settings: settingsStore },
        scheduleSource ? { scheduleCatalog: scheduleSource } : {},
        presetSource ? { presets: presetSource } : {}
      );
      /* The board lives in the native right sidebar: narrow / medium widths and
         the sidebar's own fullscreen mode, exactly like its panel button. */
      const rightBoardActive = () => {
        try {
          const active = ctx.sidebarRight && typeof ctx.sidebarRight.active === 'function' ? ctx.sidebarRight.active() : undefined;
          return Boolean(active && active.kind === BOARD_KIND);
        } catch (error) { return false; }
      };
      const collapseRightBoard = () => {
        try {
          const sidebarRight = ctx.sidebarRight;
          if (!sidebarRight) return;
          const expanded = typeof sidebarRight.isExpanded === 'function' ? sidebarRight.isExpanded() : false;
          if (expanded && rightBoardActive()) sidebarRight.toggleExpanded();
        } catch (error) { /* ignore */ }
      };
      const rightbarWidthNow = () => {
        const column = document.querySelector('[data-rightbar-col]');
        return column ? column.getBoundingClientRect().width : 0;
      };
      const rightbarFullscreen = () => Boolean(document.querySelector('[data-sidebar-right-panel="fullscreen"]')) || Boolean(document.querySelector('[data-rightbar-fullscreen]'));
      const setRightbarWidth = (px) => {
        try {
          const panels = ctx.layout && ctx.layout.panels;
          if (panels && typeof panels.setRightbar === 'function') panels.setRightbar(px);
        } catch (error) { /* ignore */ }
      };
      const toggleRightbarFullscreen = () => {
        try {
          const sidebarRight = ctx.sidebarRight;
          const target = sidebarRight && typeof sidebarRight.commandTarget === 'function' ? sidebarRight.commandTarget() : undefined;
          if (target && typeof sidebarRight.toggleFullscreen === 'function') sidebarRight.toggleFullscreen(target);
        } catch (error) { /* ignore */ }
      };
      const showNativeBoard = (mode) => {
        try {
          const sidebarRight = ctx.sidebarRight;
          if (!sidebarRight) return;
          if (!rightBoardActive()) sidebarRight.openTab(BOARD_KIND);
          if (!sidebarRight.isExpanded()) sidebarRight.toggleExpanded();
          if (mode === 'full') {
            if (!rightbarFullscreen()) toggleRightbarFullscreen();
            return;
          }
          if (rightbarFullscreen()) toggleRightbarFullscreen();
          const viewport = window.innerWidth || 1200;
          const width = mode === 'narrow' ? 380 : Math.round(viewport * 0.5);
          setRightbarWidth(width);
          /* A presentation persisted from a fullscreen open lands one render later. */
          window.setTimeout(() => {
            if (rightbarFullscreen()) toggleRightbarFullscreen();
            setRightbarWidth(width);
          }, 130);
        } catch (error) { console.warn('project-board: native board failed', error); }
      };
      const toggleNativeBoard = (mode) => {
        try {
          const sidebarRight = ctx.sidebarRight;
          if (!sidebarRight) return;
          const visible = rightBoardActive();
          const expanded = typeof sidebarRight.isExpanded === 'function' ? sidebarRight.isExpanded() : false;
          const full = rightbarFullscreen();
          if (mode === 'full') {
            if (visible && expanded && full) {
              /* Same key again closes the panel, like the narrow/medium toggles. */
              sidebarRight.toggleExpanded();
              return;
            }
            showNativeBoard('full');
            return;
          }
          const viewport = window.innerWidth || 1200;
          const targetWidth = mode === 'narrow' ? 380 : Math.round(viewport * 0.5);
          if (visible && expanded && !full && Math.abs(rightbarWidthNow() - targetWidth) < 40) {
            sidebarRight.toggleExpanded();
            return;
          }
          showNativeBoard(mode);
        } catch (error) { console.warn('project-board: toggle native board failed', error); }
      };
      const openBoard = () => {
        try { if (ctx.sidebarRight) ctx.sidebarRight.openTab(BOARD_KIND); } catch (error) { console.warn('project-board: open board tab failed', error); }
      };
      const openFullBoard = () => { collapseRightBoard(); try { ctx.layout.selectPanel('project-board'); } catch (error) { /* ignore */ } };
      const renameStore = createUiStore({ sessionId: null, currentTitle: '', at: 0 });
      const requestRename = (sessionId, currentTitle) => {
        if (!sessionId) return;
        renameStore.set({ sessionId: sessionId, currentTitle: currentTitle || '', at: Date.now() });
      };
      const renameSession = async (sessionId, title) => {
        try {
          if (!ctx.remote || !ctx.remote.session || typeof ctx.remote.session.rename !== 'function') {
            return { ok: false, error: { message: 'session rename is unavailable' } };
          }
          return await ctx.remote.session.rename({ sessionId: sessionId, title: title });
        } catch (error) {
          return { ok: false, error: { message: String(error && error.message ? error.message : error) } };
        }
      };
      const boardInject = () => ({ openSession: openSession, openBoard: openBoard, openFullBoard: openFullBoard, hooks: boardHooks() });

      const sessionMenuStore = createUiStore({ sessionId: null, title: '', at: 0 });
      const requestSessionMenu = (sessionId, title) => {
        if (sessionId) sessionMenuStore.set({ sessionId: sessionId, title: title || '', at: Date.now() });
      };
      const closeSessionMenu = () => sessionMenuStore.set({ sessionId: null, title: '', at: 0 });
      const archiveSession = async (sessionId) => {
        try {
          const workspaces = ctx.get('workspaces');
          if (!workspaces || typeof workspaces.archiveSession !== 'function') {
            return { ok: false, error: { code: 'unsupported', message: 'session archive is unavailable' } };
          }
          await workspaces.archiveSession(sessionId);
          return { ok: true };
        } catch (error) {
          const rpc = error && error.rpcError;
          return { ok: false, error: { code: rpc && rpc.code ? rpc.code : '', message: String(error && error.message ? error.message : error) } };
        }
      };
      const sessionDeleteApi = () => {
        const owns = (object, name) => {
          try {
            return Boolean(object) && Object.prototype.hasOwnProperty.call(object, name) && typeof object[name] === 'function';
          } catch (error) { return false; }
        };
        try {
          const session = ctx.remote && ctx.remote.session;
          if (owns(session, 'delete')) return session.delete.bind(session);
          if (owns(session, 'remove')) return session.remove.bind(session);
          if (owns(ctx.remote, 'deleteSession')) return ctx.remote.deleteSession.bind(ctx.remote);
        } catch (error) { /* ignore */ }
        return null;
      };
      const deleteSession = async (sessionId) => {
        const remove = sessionDeleteApi();
        if (!remove) return { ok: false, error: { code: 'unsupported', message: 'session delete is unavailable' } };
        try {
          const result = await remove({ sessionId: sessionId });
          if (!result || result.ok !== false) return { ok: true };
          return { ok: false, error: result.error || { message: 'delete failed' } };
        } catch (error) {
          return { ok: false, error: { message: String(error && error.message ? error.message : error) } };
        }
      };

      /* Warn once at startup when saved shortcuts collide with built-in DSH commands. */
      /* Warn once at startup when saved shortcuts collide with built-in DSH commands. */
      ctx.effect(() => {
        const timer = window.setTimeout(() => {
          try {
            const snap = settingsStore.getSnapshot();
            const translate = ctx.locale.bind(NS);
            const conflicts = [];
            for (const key of Object.keys(snap.shortcuts || {})) {
              const conflict = findBuiltinConflict(snap.shortcuts[key]);
              if (conflict) conflicts.push({ key: key, combo: snap.shortcuts[key], label: conflict.label });
            }
            if (conflicts.length === 0) return;
            const first = conflicts[0];
            pushToast({
              tone: 'warn',
              title: translate('toast.conflictTitle'),
              message: conflicts.length === 1
                ? translate('toast.conflictExisting', { combo: comboDisplay(first.combo), name: first.label })
                : translate('toast.conflictExistingMany', { n: conflicts.length })
            });
          } catch (error) { /* ignore */ }
        }, 1500);
        return () => window.clearTimeout(timer);
      }, 'project-board: shortcut conflict scan');


      ctx.slots.inject('sidebar.panellist', () => ctx.slots.register({
        name: 'sidebar.panellist', id: 'project-board', order: 50, locale: NS,
        label: () => { try { return ctx.locale.bind(NS)('panel.label'); } catch (error) { return '项目看板'; } }
      }, PanelIcon));

      ctx.slots.inject('main', () => ctx.slots.register({
        name: 'main', key: 'project-board', locale: NS,
        inject: () => ({ openSession: openSession, hooks: boardHooks() })
      }, ProjectBoard));

      ctx.effect(() => ctx.sidebarRightTabs.register({
        id: BOARD_ID, kind: BOARD_KIND, priority: 'builtin',
        title: () => { try { return ctx.locale.bind(NS)('rightTab.title'); } catch (error) { return '项目看板'; } }
      }), 'project-board: right tab type');

      ctx.slots.inject('sidebar.right.pane.tab', () => ctx.slots.register({
        name: 'sidebar.right.pane.tab', key: BOARD_ID, locale: NS,
        inject: boardInject
      }, ResponsiveBoard));

      ctx.slots.inject('conversation.header.leading', () => ctx.slots.register({
        name: 'conversation.header.leading', locale: NS,
        inject: () => ({ openSession: openSession, openBoard: openBoard, palette: paletteStore, saveSettings: writeSettings, headerDrag: headerDragStore, hooks: { palette: paletteStore, settings: settingsStore, headerDrag: headerDragStore } })
      }, HeaderLeading));

      ctx.slots.inject('conversation.session.header.utilities', () => ctx.slots.register({
        name: 'conversation.session.header.utilities', id: 'project-board-header-right', order: 40, locale: NS,
        inject: () => ({ openSession: openSession, openBoard: openBoard, palette: paletteStore, saveSettings: writeSettings, headerDrag: headerDragStore, hooks: { palette: paletteStore, settings: settingsStore, headerDrag: headerDragStore } })
      }, HeaderUtilities));

      ctx.slots.inject('conversation.composer.dock', () => ctx.slots.register({
        name: 'conversation.composer.dock', id: 'project-board-shortcut-hints', order: 90, locale: NS,
        inject: () => ({ saveSettings: writeSettings, hooks: { settings: settingsStore } })
      }, ShortcutHints));

      ctx.slots.inject('conversation.composer.dock', () => ctx.slots.register({
        name: 'conversation.composer.dock', id: 'project-board-buttons', order: 100, locale: NS,
        inject: () => ({ openSession: openSession, openBoard: openBoard, palette: paletteStore, saveSettings: writeSettings, headerDrag: headerDragStore, hooks: { palette: paletteStore, settings: settingsStore, headerDrag: headerDragStore } })
      }, ComposerDockButtons));

      ctx.slots.inject('shell.overlay', () => ctx.slots.register({
        name: 'shell.overlay', id: 'project-board-palette', order: 40, locale: NS,
        inject: () => ({ openSession: openSession, palette: paletteStore, focus: focusStore, toggleBoard: toggleNativeBoard, toggleHud: toggleHud, requestRename: requestRename, requestSessionMenu: requestSessionMenu, notify: pushToast, hooks: { palette: paletteStore, settings: settingsStore, focus: focusStore, hudOrder: hudOrderStore } })
      }, Palette));

      ctx.slots.inject('shell.overlay', () => ctx.slots.register({
        name: 'shell.overlay', id: 'project-board-session-menu', order: 41, locale: NS,
        inject: () => ({ archiveSession: archiveSession, deleteSession: deleteSession, deleteSupported: Boolean(sessionDeleteApi()), closeSessionMenu: closeSessionMenu, hooks: { sessionMenu: sessionMenuStore } })
      }, SessionMenuDialog));

      ctx.slots.inject('shell.overlay', () => ctx.slots.register({
        name: 'shell.overlay', id: 'project-board-rename', order: 39, locale: NS,
        inject: () => ({ renameSession: renameSession, rename: renameStore, hooks: { rename: renameStore } })
      }, RenameDialog));

      ctx.slots.inject('shell.overlay', () => ctx.slots.register({
        name: 'shell.overlay', id: 'project-board-hud', order: 35, locale: NS,
        inject: () => ({ openSession: openSession, hudOrder: hudOrderStore, saveSettings: writeSettings, hooks: Object.assign({ settings: settingsStore, focus: focusStore }, scheduleSource ? { scheduleCatalog: scheduleSource } : {}) })
      }, FloatingStatus));

      ctx.slots.inject('shell.overlay', () => ctx.slots.register({
        name: 'shell.overlay', id: 'project-board-toast', order: 45, locale: NS,
        inject: () => ({ dismissToast: dismissToast, hooks: { toasts: toastStore } })
      }, ToastStack));

      ctx.slots.inject('shell.overlay', () => ctx.slots.register({
        name: 'shell.overlay', id: 'project-board-notifier', order: 36, locale: NS,
        inject: () => ({ notify: pushNotif, system: showSystemNotification, openSession: openSession, hooks: { settings: settingsStore } })
      }, NotificationWatcher));

      ctx.slots.inject('shell.overlay', () => ctx.slots.register({
        name: 'shell.overlay', id: 'project-board-notification-dock', order: 44, locale: NS,
        inject: () => ({ dismissNotif: dismissNotif, openSession: openSession, hooks: { notifications: notifStore } })
      }, NotificationDock));

      ctx.slots.inject('settings.section', () => ctx.slots.register({
        name: 'settings.section', id: 'project-board-settings', order: 60, locale: NS,
        label: () => { try { return ctx.locale.bind(NS)('settings.title'); } catch (error) { return '项目看板设置'; } },
        inject: () => ({ settings: settingsStore, saveSettings: writeSettings, notify: pushToast, findBuiltinConflict: findBuiltinConflict, hooks: Object.assign({ settings: settingsStore }, shortcutsService && shortcutsService.catalog ? { shortcutsCatalog: shortcutsService.catalog } : {}) })
      }, SettingsPage));
    }

    return { inject: ['slots', 'locale', 'uiWorkspace', 'remote', 'remote.session', 'remote.schedule', 'remote.agentPresets', 'sidebarRight', 'sidebarRightTabs', 'layout'], apply: apply };
  }
});
