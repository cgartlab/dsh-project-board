/** The plugin's top button row (header or composer dock) and the shortcut hint bar. */
import { DEFAULT_SETTINGS } from '../constants';
import type { Translate, UseHook } from '../host';
import { h, useEffect, useState } from '../runtime';
import type { Settings } from '../types';
import { comboDisplay } from '../core/combos';
import { type HeaderDragState, type SaveSettings, startHeaderButtonDrag } from '../core/header-drag';
import { headerClickBlocked } from '../core/state';
import { fallbackHook } from '../core/schedule';
import { Icon, RunRing } from '../ui/icons';
import { jumpUserMessage } from './chat-nav';
import { sessionTitleOf, statusInfo } from './format';
import { cloneJson } from '../core/json';
import type { SessionListSnapshot, SessionStatusMap, WorkspaceSnapshot } from './board';

export interface PaletteSnapshot {
  open: boolean;
  move: { dir: number; at: number };
}

export interface PaletteStore {
  getSnapshot(): PaletteSnapshot;
  set(patch: Partial<PaletteSnapshot>): void;
  toggle(key: 'open'): void;
}

export interface HeaderDragStore {
  getSnapshot(): HeaderDragState;
  set(patch: Partial<HeaderDragState>): void;
}

export interface HeaderButtonsProps {
  useSessions: UseHook<SessionListSnapshot>;
  useSessionStatus: UseHook<SessionStatusMap>;
  useWorkspaces: UseHook<WorkspaceSnapshot>;
  usePalette?: UseHook<PaletteSnapshot>;
  useSettings?: UseHook<Settings>;
  useHeaderDrag?: UseHook<HeaderDragState>;
  palette?: PaletteStore;
  headerDrag?: HeaderDragStore;
  saveSettings?: SaveSettings;
  openBoard?: () => void;
  t: Translate;
  side?: 'left' | 'right' | 'composer';
  placement?: 'header' | 'composer';
}

export function HeaderLeading(props: HeaderButtonsProps): unknown {
  return h(HeaderButtons, Object.assign({}, props, { side: 'left', placement: 'header' }));
}

export function HeaderUtilities(props: HeaderButtonsProps): unknown {
  return h(HeaderButtons, Object.assign({}, props, { side: 'right', placement: 'header' }));
}

export function ComposerDockButtons(props: HeaderButtonsProps): unknown {
  return h(HeaderButtons, Object.assign({}, props, { side: 'composer', placement: 'composer' }));
}

type HeaderButtonNode = unknown;

export function HeaderButtons(props: HeaderButtonsProps): unknown {
  const { useSessions, useSessionStatus, useWorkspaces, t, openBoard } = props;
  const usePalette = typeof props.usePalette === 'function' ? props.usePalette : fallbackHook<PaletteSnapshot>();
  const useSettings = typeof props.useSettings === 'function' ? props.useSettings : fallbackHook<Settings>();
  const useHeaderDrag = typeof props.useHeaderDrag === 'function' ? props.useHeaderDrag : fallbackHook<HeaderDragState>();
  const palette = props.palette;
  const config = useSettings((snapshot) => snapshot) || DEFAULT_SETTINGS;
  const dragSnap = useHeaderDrag((snapshot) => snapshot) || { id: null, side: null, index: -1, width: 0 };
  const list = useSessions((snapshot) => snapshot);
  const statuses = useSessionStatus((snapshot) => snapshot);
  const wsSnap = useWorkspaces((snapshot) => snapshot);
  const paletteSnap = usePalette((snapshot) => snapshot);
  const open = Boolean(paletteSnap && paletteSnap.open);
  /* The native centre column (*_centerCol) is a real minmax(0,1fr) grid track: it shrinks on
     window resize, sidebar collapse/drag and right-panel open/close. The slot anchor is
     display:contents (no box, clientWidth 0) and measuring our own row would feed back into the
     fold decision, so this is the only stable signal. Two stages: compact labels, then fold. */
  const [navSpace, setNavSpace] = useState<number | null>(null);
  const [moreOpen, setMoreOpen] = useState(false);
  useEffect(() => {
    const read = (): void => {
      const box = document.querySelector('[class*="_centerCol"]') || document.querySelector('[class*="_frame"]');
      if (!box) return;
      const width = Math.round(box.getBoundingClientRect().width);
      setNavSpace((previous) => (previous === null || Math.abs(previous - width) > 2 ? width : previous));
    };
    read();
    let observer: ResizeObserver | null = null;
    const box = document.querySelector('[class*="_centerCol"]') || document.querySelector('[class*="_frame"]');
    if (box && typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(read);
      observer.observe(box);
    }
    window.addEventListener('resize', read);
    return () => {
      if (observer) observer.disconnect();
      window.removeEventListener('resize', read);
    };
  }, []);
  const headerPlacement = config && config.header && config.header.placement === 'composer' ? 'composer' : 'header';
  const foldedNav = headerPlacement !== 'composer' && navSpace !== null && navSpace < (props.side === 'right' ? 700 : 620);
  const tightNav = headerPlacement !== 'composer' && navSpace !== null && navSpace < 900;
  useEffect(() => {
    if (!foldedNav) setMoreOpen(false);
  }, [foldedNav]);
  useEffect(() => {
    if (!moreOpen) return undefined;
    const onDown = (event: Event): void => {
      const target = event.target as Element | null;
      if (target && typeof target.closest === 'function' && target.closest('.pbx-navMoreWrap')) return;
      setMoreOpen(false);
    };
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') setMoreOpen(false);
    };
    document.addEventListener('pointerdown', onDown, true);
    document.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('pointerdown', onDown, true);
      document.removeEventListener('keydown', onKey, true);
    };
  }, [moreOpen]);
  const archived = new Set((wsSnap && wsSnap.archivedSessionIds) || []);
  const ids = (list && list.ids) || [];
  const byId = (list && list.byId) || {};
  let currentId: string | undefined;
  for (const id of ids) {
    const row = byId[id];
    if (row && row.retainedBy && (row.retainedBy.mainView || 0) > 0) {
      currentId = id;
      break;
    }
  }
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
  const placement = headerPlacement;
  const buttons = config.headerButtons || DEFAULT_SETTINGS.headerButtons;
  const nodes: Record<string, HeaderButtonNode> = {
    switch: showSwitch
      ? h(
          'button',
          {
            type: 'button',
            className: 'pbx-navSwitch' + (open ? ' active' : ''),
            title: t('nav.switch') + ' (' + comboDisplay(config.shortcuts.palette || DEFAULT_SETTINGS.shortcuts.palette) + ')' + (title ? ' · ' + title : ''),
            onClick: () => {
              if (palette) palette.set({ open: true });
            }
          },
          h(Icon, { name: 'search', size: 14 }),
          h('span', { className: 'pbx-navTitle' }, t('nav.switchLabel')),
          h('kbd', { className: 'pbx-kbd' }, comboDisplay(config.shortcuts.palette || DEFAULT_SETTINGS.shortcuts.palette))
        )
      : null,
    historyNav: h(
      'div',
      { className: 'pbx-navHistory' },
      h(
        'button',
        {
          type: 'button',
          className: 'pbx-navSeg',
          title: t('settings.shortcut.userPrev') + ' (' + comboDisplay(config.shortcuts.userPrev) + ')',
          'aria-label': t('settings.shortcut.userPrev'),
          onClick: () => jumpUserMessage(-1)
        },
        h(Icon, { name: 'up', size: 14 })
      ),
      h(
        'button',
        {
          type: 'button',
          className: 'pbx-navSeg',
          title: t('settings.shortcut.userNext') + ' (' + comboDisplay(config.shortcuts.userNext) + ')',
          'aria-label': t('settings.shortcut.userNext'),
          onClick: () => jumpUserMessage(1)
        },
        h(Icon, { name: 'down', size: 14 })
      )
    ),
    capsule:
      showStats || showBoard
        ? h(
            'button',
            {
              type: 'button',
              className: 'pbx-capsule',
              title: t('nav.openBoard') + ' · ' + comboDisplay(config.shortcuts.prev) + ' / ' + comboDisplay(config.shortcuts.next),
              onClick: () => {
                if (showBoard && openBoard) openBoard();
              }
            },
            showStats
              ? h(
                  'span',
                  { className: 'pbx-capStat' + (running > 0 ? ' live' : '') },
                  running > 0 ? h(RunRing, { size: 8 }) : h('span', { className: 'pbx-liveDot' }),
                  String(running)
                )
              : null,
            showStats && attention > 0 ? h('span', { className: 'pbx-capStat attn' }, h('span', { className: 'pbx-capDot' }), String(attention)) : null,
            showBoard ? h('span', { className: 'pbx-capBoard' }, h(Icon, { name: 'board', size: 14 }), t('nav.board')) : null
          )
        : null
  };
  if (props.placement === 'composer') {
    if (placement !== 'composer') return null;
    const dockIds = Object.keys(DEFAULT_SETTINGS.headerButtons)
      .filter((id) => buttons[id] && buttons[id].hidden !== true && Boolean(nodes[id]))
      .sort((a, b) => (buttons[a].order || 0) - (buttons[b].order || 0));
    if (dockIds.length === 0) return null;
    return h(
      'div',
      { className: 'pbx-dockButtons' },
      dockIds.map((id) => h('div', { key: id, className: 'pbx-navItem', 'data-hb-id': id }, nodes[id]))
    );
  }
  if (placement === 'composer') {
    if (!currentId && props.side === 'left') {
      const fallbackIds = Object.keys(DEFAULT_SETTINGS.headerButtons)
        .filter((id) => buttons[id] && buttons[id].hidden !== true && Boolean(nodes[id]))
        .sort((a, b) => (buttons[a].order || 0) - (buttons[b].order || 0));
      if (fallbackIds.length > 0) {
        return h(
          'div',
          { className: 'pbx-nav' },
          fallbackIds.map((id) => h('div', { key: id, className: 'pbx-navItem' }, nodes[id]))
        );
      }
    }
    return null;
  }
  if (foldedNav) {
    const menuIds = Object.keys(DEFAULT_SETTINGS.headerButtons)
      .filter((id) => buttons[id] && buttons[id].hidden !== true && Boolean(nodes[id]))
      .sort((a, b) => (buttons[a].order || 0) - (buttons[b].order || 0));
    if (menuIds.length === 0) return null;
    return h(
      'div',
      { className: 'pbx-navMoreWrap' },
      h(
        'button',
        {
          type: 'button',
          className: 'pbx-navMore' + (moreOpen ? ' open' : ''),
          title: t('nav.more'),
          'aria-label': t('nav.more'),
          'aria-expanded': moreOpen ? 'true' : 'false',
          'aria-haspopup': 'menu',
          onClick: () => setMoreOpen((value) => !value)
        },
        h(Icon, { name: 'sliders', size: 16 })
      ),
      moreOpen
        ? h(
            'div',
            { className: 'pbx-navMenu', role: 'menu' },
            menuIds.map((id) => h('div', { key: id, className: 'pbx-navMenuItem', onClickCapture: () => setMoreOpen(false) }, nodes[id]))
          )
        : null
    );
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
    .sort((a, b) => (buttons[a].order || 0) - (buttons[b].order || 0));
  const children: unknown[] = sideIds.map((id) =>
    h(
      'div',
      {
        key: id,
        className: 'pbx-navItem',
        'data-hb-id': id,
        onPointerDown: (event: never) => startHeaderButtonDrag(id, event, props.saveSettings, config, props.headerDrag),
        onClickCapture: (event: Event) => {
          if (headerClickBlocked()) {
            event.preventDefault();
            event.stopPropagation();
          }
        }
      },
      nodes[id]
    )
  );
  if (dragSnap.id && dragSnap.index >= 0 && dragSnap.side === props.side) {
    const gapIndex = Math.max(0, Math.min(dragSnap.index < 0 ? children.length : dragSnap.index, children.length));
    children.splice(
      gapIndex,
      0,
      h('div', { key: '__headerGap', className: 'pbx-navGap', style: { width: (dragSnap.width || 0) + 'px' } })
    );
  }
  return h(
    'div',
    {
      className:
        'pbx-nav' +
        (props.side === 'right' ? ' pbx-navRight' : '') +
        (tightNav ? ' pbx-tight' : '') +
        (children.length === 0 ? ' pbx-navEmpty' : '')
    },
    children
  );
}

export interface ShortcutHintsProps {
  useSettings?: UseHook<Settings>;
  saveSettings?: SaveSettings;
  t: Translate;
}

export function ShortcutHints(props: ShortcutHintsProps): unknown {
  const { t } = props;
  const useSettings = typeof props.useSettings === 'function' ? props.useSettings : fallbackHook<Settings>();
  const config = useSettings((snapshot) => snapshot) || DEFAULT_SETTINGS;
  if (config.hints && config.hints.shortcuts === false) return null;
  const dismiss = (): void => {
    const next = cloneJson(config);
    next.hints = Object.assign({}, next.hints, { shortcuts: false });
    if (typeof props.saveSettings === 'function') props.saveSettings(next);
  };
  const item = (combo: string, label: string): unknown =>
    h('span', { className: 'pbx-hintItem' }, h('kbd', { className: 'pbx-hintKey' }, comboDisplay(combo)), h('span', { className: 'pbx-hintLabel' }, label));
  return h(
    'div',
    { className: 'pbx-shortcutHints' },
    h(
      'span',
      { className: 'pbx-hintGroup' },
      h('span', { className: 'pbx-hintGroupLabel' }, t('hud.groupSession')),
      item(config.shortcuts.prev, t('hud.prev')),
      item(config.shortcuts.next, t('hud.next'))
    ),
    h('span', { className: 'pbx-hintSep' }),
    h(
      'span',
      { className: 'pbx-hintGroup' },
      h('span', { className: 'pbx-hintGroupLabel' }, t('hud.groupMessage')),
      item(config.shortcuts.userPrev, t('hud.prevInstruction')),
      item(config.shortcuts.userNext, t('hud.nextInstruction')),
      item(config.shortcuts.scrollBottom, t('hud.toBottom'))
    ),
    h(
      'button',
      { type: 'button', className: 'pbx-hintClose', title: t('hints.dismiss'), 'aria-label': t('hints.dismiss'), onClick: dismiss },
      '×'
    )
  );
}
