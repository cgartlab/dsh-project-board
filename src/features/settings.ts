/** The plugin's settings page: shortcut recording, header buttons, behaviour, logs and data. */
import { DEFAULT_SETTINGS, HUD_COLLAPSE_KEY, HUD_POS_KEY, HUD_STARTS_KEY, LOG_KEY, SHORTCUT_LABEL_KEYS, STORE_KEY } from '../constants';
import type { Translate, UseHook } from '../host';
import { comboDisplay, comboFromEvent, comboHasModifier, isComposingEvent } from '../core/combos';
import { cloneJson } from '../core/json';
import { logEvent } from '../core/log';
import { fallbackHook } from '../core/schedule';
import { shortcutState } from '../core/state';
import { h, useEffect, useRef, useState } from '../runtime';
import type { LogEntry, Settings, ShortcutAction } from '../types';
import { type SaveSettings } from '../core/header-drag';
import { PROJECT_COLUMNS } from './format';

export interface SettingsPageProps {
  useSettings?: UseHook<Settings>;
  saveSettings?: SaveSettings;
  useLogs?: UseHook<{ entries: LogEntry[] }>;
  logs?: { set(patch: { entries: LogEntry[] }): void };
  notify?: (payload: { tone: string; title: string; message: string; ttl?: number }) => void;
  findBuiltinConflict?: (combo: string) => { label: string } | null;
  useShortcutsCatalog?: UseHook<unknown>;
  t: Translate;
}

type SettingsSection = 'palette' | 'header' | 'hints' | 'hud' | 'notify' | 'log' | 'board' | 'projectColumns';

interface SelectOption {
  value: string;
  labelKey: string;
}

interface BuiltinWarning {
  key: string;
  combo: string;
  label: string;
}

export function SettingsPage(props: SettingsPageProps): unknown {
  const { t } = props;
  const useSettings = typeof props.useSettings === 'function' ? props.useSettings : fallbackHook<Settings>();
  const config = useSettings((snapshot) => snapshot) || DEFAULT_SETTINGS;
  const saveSettings: SaveSettings = typeof props.saveSettings === 'function' ? props.saveSettings : function (): void {};
  const useLogs = typeof props.useLogs === 'function' ? props.useLogs : fallbackHook<{ entries: LogEntry[] }>();
  const logsSnap = useLogs((value) => value) || { entries: [] };
  const logEntries = Array.isArray(logsSnap.entries) ? logsSnap.entries : [];
  const [recording, setRecording] = useState<ShortcutAction | null>(null);
  const [recordError, setRecordError] = useState('');
  const [builtinWarnings, setBuiltinWarnings] = useState<BuiltinWarning[]>([]);
  const scannedConflictsRef = useRef(new Set<string>());

  useEffect(() => {
    if (!recording) return undefined;
    shortcutState.suppressed = true;
    const onKey = (event: KeyboardEvent): void => {
      if (isComposingEvent(event)) return;
      if (event.key === 'Escape' && !event.altKey && !event.ctrlKey && !event.metaKey && !event.shiftKey) {
        event.preventDefault();
        event.stopPropagation();
        setRecording(null);
        setRecordError('');
        return;
      }
      const combo = comboFromEvent(event);
      if (!combo) return;
      event.preventDefault();
      event.stopPropagation();
      if (!comboHasModifier(combo)) {
        setRecordError(t('settings.shortcutNeedModifier'));
        return;
      }
      const next = cloneJson(config);
      const conflict = (Object.keys(next.shortcuts) as ShortcutAction[]).find((key) => key !== recording && next.shortcuts[key] === combo);
      if (conflict) {
        const message = t('toast.conflictOwn', {
          combo: comboDisplay(combo),
          name: t(SHORTCUT_LABEL_KEYS[conflict] || 'settings.shortcut.palette')
        });
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
    return () => {
      shortcutState.suppressed = false;
      document.removeEventListener('keydown', onKey, true);
    };
  }, [recording, config, saveSettings]);

  const useShortcutsCatalog = typeof props.useShortcutsCatalog === 'function' ? props.useShortcutsCatalog : fallbackHook<unknown>();
  const shortcutsCatalog = useShortcutsCatalog((value) => value);
  useEffect(() => {
    if (typeof props.findBuiltinConflict !== 'function') return;
    const found: BuiltinWarning[] = [];
    for (const key of Object.keys(config.shortcuts || {})) {
      const combo = config.shortcuts[key as ShortcutAction];
      const conflict = props.findBuiltinConflict(combo);
      if (conflict) found.push({ key: key, combo: combo, label: conflict.label });
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
        props.notify({
          tone: 'warn',
          title: t('toast.conflictTitle'),
          message: t('toast.conflictExisting', { combo: comboDisplay(item.combo), name: item.label })
        });
      }
    }
  }, [config.shortcuts, shortcutsCatalog]);

  const readSection = (section: SettingsSection): Record<string, unknown> => config[section] as unknown as Record<string, unknown>;
  const update = (section: SettingsSection, patch: Record<string, unknown>): void => {
    const next = cloneJson(config);
    Object.assign(next[section] as unknown as Record<string, unknown>, patch);
    saveSettings(next);
  };
  const resetAll = (): void => {
    saveSettings(cloneJson(DEFAULT_SETTINGS));
    try {
      window.localStorage.removeItem(HUD_COLLAPSE_KEY);
      window.localStorage.removeItem(HUD_POS_KEY);
      window.localStorage.removeItem(HUD_STARTS_KEY);
      window.dispatchEvent(new Event('pbx-hud-reset'));
    } catch (error) {
      /* ignore */
    }
  };
  const resetAppearance = (): void => {
    try {
      window.localStorage.removeItem(STORE_KEY);
    } catch (error) {
      /* ignore */
    }
    try {
      window.dispatchEvent(new Event('pbx-appearance-reset'));
    } catch (error) {
      /* ignore */
    }
  };
  const copyLogs = async (): Promise<void> => {
    const text = JSON.stringify(logEntries, null, 1);
    try {
      await navigator.clipboard.writeText(text);
      if (typeof props.notify === 'function') {
        props.notify({ tone: 'success', title: t('settings.logging'), message: t('settings.logCopied'), ttl: 5000 });
      }
    } catch (error) {
      if (typeof props.notify === 'function') {
        props.notify({ tone: 'warn', title: t('settings.logging'), message: t('settings.logCopyFailed'), ttl: 6000 });
      }
    }
  };
  const clearLogs = (): void => {
    try {
      if (props.logs && typeof props.logs.set === 'function') props.logs.set({ entries: [] });
    } catch (error) {
      /* ignore */
    }
    try {
      window.localStorage.removeItem(LOG_KEY);
    } catch (error) {
      /* ignore */
    }
    logEvent('info', 'settings', 'logs cleared');
  };

  const row = (key: string, labelKey: string, descKey: string | null, control: unknown): unknown =>
    h(
      'div',
      { className: 'pbx-setRow', key: key },
      h('div', { className: 'pbx-setRowText' }, h('div', { className: 'pbx-setLabel' }, t(labelKey)), descKey ? h('div', { className: 'pbx-setDesc' }, t(descKey)) : null),
      h('div', { className: 'pbx-setControl' }, control)
    );
  const shortcutRow = (key: ShortcutAction, labelKey: string): unknown =>
    row(
      'sc-' + key,
      labelKey,
      null,
      h(
        'button',
        {
          type: 'button',
          className: 'pbx-keycap' + (recording === key ? ' recording' : ''),
          title: t('settings.shortcutResetHint'),
          onClick: () => {
            setRecordError('');
            setRecording(recording === key ? null : key);
          },
          onDoubleClick: () => {
            const next = cloneJson(config);
            next.shortcuts[key] = DEFAULT_SETTINGS.shortcuts[key];
            setRecordError('');
            setRecording(null);
            saveSettings(next);
          }
        },
        recording === key ? t('settings.recording') : comboDisplay(config.shortcuts[key])
      )
    );
  const toggleRow = (section: SettingsSection, key: string, labelKey: string, descKey?: string): unknown => {
    const values = readSection(section);
    return row(
      section + '-' + key,
      labelKey,
      descKey || null,
      h(
        'button',
        {
          type: 'button',
          role: 'switch',
          'aria-checked': Boolean(values[key]),
          'aria-label': t(labelKey),
          className: 'pbx-switch' + (values[key] ? ' on' : ''),
          onClick: () => update(section, { [key]: !values[key] })
        },
        h('span', { className: 'pbx-switchThumb' })
      )
    );
  };
  const selectRow = (section: SettingsSection, key: string, labelKey: string, options: SelectOption[]): unknown => {
    const values = readSection(section);
    return row(
      section + '-' + key,
      labelKey,
      null,
      h(
        'select',
        {
          className: 'pbx-setSelect',
          value: String(values[key]),
          onChange: (event: Event) => update(section, { [key]: (event.target as HTMLSelectElement).value })
        },
        options.map((option) => h('option', { key: option.value, value: option.value }, t(option.labelKey)))
      )
    );
  };
  const numberRow = (section: SettingsSection, key: string, labelKey: string, min: number, max: number, step: number): unknown => {
    const values = readSection(section);
    const value = Number(values[key]);
    return row(
      section + '-' + key,
      labelKey,
      null,
      h('input', {
        key: section + '-' + key + '-' + value,
        type: 'number',
        className: 'pbx-setInput',
        defaultValue: value,
        min: min,
        max: max,
        step: step,
        onBlur: (event: Event) => {
          const target = event.target as HTMLInputElement;
          const raw = String(target.value || '').trim();
          const parsed = Number(raw);
          if (raw === '' || !Number.isFinite(parsed)) {
            target.value = String(value);
            return;
          }
          const clamped = Math.min(max, Math.max(min, Math.round(parsed)));
          target.value = String(clamped);
          if (clamped !== value) update(section, { [key]: clamped });
        },
        onKeyDown: (event: KeyboardEvent) => {
          const target = event.currentTarget as HTMLInputElement;
          if (event.key === 'Enter') target.blur();
          if (event.key === 'Escape') {
            target.value = String(value);
            target.blur();
          }
        }
      })
    );
  };
  const rangeRow = (section: SettingsSection, key: string, labelKey: string, min: number, max: number, step: number): unknown => {
    const values = readSection(section);
    const value = Number(values[key]);
    return row(
      section + '-' + key,
      labelKey,
      null,
      h(
        'span',
        { className: 'pbx-setRange' },
        h('input', {
          type: 'range',
          min: min,
          max: max,
          step: step,
          value: value,
          onChange: (event: Event) => update(section, { [key]: Number((event.target as HTMLInputElement).value) })
        }),
        h('span', { className: 'pbx-setRangeValue' }, String(value))
      )
    );
  };
  const headerButtonRow = (id: string, labelKey: string): unknown => {
    const item = (config.headerButtons && config.headerButtons[id]) || DEFAULT_SETTINGS.headerButtons[id];
    const patchItem = (patch: Record<string, unknown>): void => {
      const next = cloneJson(config);
      next.headerButtons = next.headerButtons || cloneJson(DEFAULT_SETTINGS.headerButtons);
      next.headerButtons[id] = Object.assign({}, item, patch);
      saveSettings(next);
    };
    return row(
      'hb-' + id,
      labelKey,
      null,
      h(
        'span',
        { className: 'pbx-setInline' },
        config.header && config.header.placement === 'composer'
          ? h('span', { className: 'pbx-setMuted' }, t('settings.hb.followPlacement'))
          : h(
              'select',
              {
                className: 'pbx-setSelect',
                value: item.side,
                onChange: (event: Event) => patchItem({ side: (event.target as HTMLSelectElement).value })
              },
              h('option', { value: 'left' }, t('settings.hb.sideLeft')),
              h('option', { value: 'right' }, t('settings.hb.sideRight'))
            ),
        h(
          'button',
          {
            type: 'button',
            role: 'switch',
            'aria-checked': !item.hidden,
            className: 'pbx-switch' + (item.hidden ? '' : ' on'),
            onClick: () => patchItem({ hidden: !item.hidden })
          },
          h('span', { className: 'pbx-switchThumb' })
        )
      )
    );
  };

  return h(
    'div',
    { className: 'pbx-setPage' },
    h('h2', { className: 'pbx-setTitle' }, t('settings.title')),
    h('p', { className: 'pbx-setIntro' }, t('settings.intro')),

    h(
      'section',
      { className: 'pbx-setSection' },
      h('h3', { className: 'pbx-setSectionTitle' }, t('settings.shortcuts')),
      shortcutRow('palette', 'settings.shortcut.palette'),
      shortcutRow('prev', 'settings.shortcut.prev'),
      shortcutRow('next', 'settings.shortcut.next'),
      shortcutRow('userPrev', 'settings.shortcut.userPrev'),
      shortcutRow('userNext', 'settings.shortcut.userNext'),
      shortcutRow('scrollBottom', 'settings.shortcut.scrollBottom'),
      shortcutRow('sidebarBoard', 'settings.shortcut.sidebarBoard'),
      shortcutRow('leftSidebar', 'settings.shortcut.leftSidebar'),
      shortcutRow('panelHalf', 'settings.shortcut.panelHalf'),
      shortcutRow('panelFull', 'settings.shortcut.panelFull'),
      shortcutRow('rename', 'settings.shortcut.rename'),
      shortcutRow('sessionMenu', 'settings.shortcut.sessionMenu'),
      shortcutRow('interject', 'settings.shortcut.interject'),
      shortcutRow('hud', 'settings.shortcut.hud'),
      builtinWarnings.map((item) =>
        h(
          'div',
          { key: 'warn-' + item.key, className: 'pbx-setWarn' },
          t('toast.conflictExisting', { combo: comboDisplay(item.combo), name: item.label })
        )
      ),
      recordError ? h('div', { className: 'pbx-setError' }, recordError) : null,
      h('div', { className: 'pbx-setHint' }, t('settings.shortcut.hint'))
    ),

    h(
      'section',
      { className: 'pbx-setSection' },
      h('h3', { className: 'pbx-setSectionTitle' }, t('settings.headerButtons')),
      selectRow('header', 'placement', 'settings.headerPlacement', [
        { value: 'header', labelKey: 'settings.placement.header' },
        { value: 'composer', labelKey: 'settings.placement.composer' }
      ]),
      ['switch', 'historyNav', 'capsule'].map((id) => headerButtonRow(id, 'settings.hb.' + id)),
      h('div', { className: 'pbx-setHint' }, t(config.header.placement === 'composer' ? 'settings.composerButtonsHint' : 'settings.headerButtonsHint'))
    ),

    h(
      'section',
      { className: 'pbx-setSection' },
      h('h3', { className: 'pbx-setSectionTitle' }, t('settings.behavior')),
      toggleRow('palette', 'enabled', 'settings.paletteEnabled', 'settings.paletteEnabledDesc'),
      toggleRow('palette', 'includeArchived', 'settings.paletteArchived', 'settings.paletteArchivedDesc'),
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
      h('div', { className: 'pbx-setSubTitle' }, t('settings.projectColumns')),
      PROJECT_COLUMNS.map((def) => toggleRow('projectColumns', def.key, def.labelKey)),
      h('div', { className: 'pbx-setHint' }, t('settings.projectColumnsHint')),
      toggleRow('notify', 'enabled', 'settings.notifyEnabled', 'settings.notifyEnabledDesc'),
      toggleRow('notify', 'sound', 'settings.notifySound', 'settings.notifySoundDesc'),
      rangeRow('palette', 'blur', 'settings.blur', 6, 32, 1)
    ),

    h(
      'section',
      { className: 'pbx-setSection' },
      h('h3', { className: 'pbx-setSectionTitle' }, t('settings.logging')),
      toggleRow('log', 'enabled', 'settings.logEnabled', 'settings.logEnabledDesc'),
      selectRow('log', 'level', 'settings.logLevel', [
        { value: 'error', labelKey: 'settings.logLevelError' },
        { value: 'warn', labelKey: 'settings.logLevelWarn' },
        { value: 'info', labelKey: 'settings.logLevelInfo' },
        { value: 'debug', labelKey: 'settings.logLevelDebug' }
      ]),
      numberRow('log', 'max', 'settings.logMax', 20, 500, 10),
      h('div', { className: 'pbx-setHint' }, t('settings.logHint', { count: String(logEntries.length) })),
      h(
        'div',
        { className: 'pbx-setActions' },
        h('button', { type: 'button', className: 'pbx-setBtn', onClick: () => void copyLogs() }, t('settings.logCopy')),
        h('button', { type: 'button', className: 'pbx-setBtn danger', onClick: clearLogs }, t('settings.logClear'))
      )
    ),

    h(
      'section',
      { className: 'pbx-setSection' },
      h('h3', { className: 'pbx-setSectionTitle' }, t('settings.data')),
      h(
        'div',
        { className: 'pbx-setActions' },
        h('button', { type: 'button', className: 'pbx-setBtn', onClick: resetAll }, t('settings.reset')),
        h('button', { type: 'button', className: 'pbx-setBtn danger', onClick: resetAppearance }, t('settings.resetAppearance'))
      ),
      h('div', { className: 'pbx-setHint' }, t('settings.resetAppearanceHint'))
    )
  );
}
