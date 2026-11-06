/**
 * The project/session board: a database view of the current workspace's sessions and a
 * project view with per-project attribute columns. Rendered both in the right sidebar pane
 * (narrow/full) and as a standalone main panel.
 */
import { DEFAULT_SETTINGS } from '../constants';
import type { Translate, UseHook } from '../host';
import { h, useEffect, useMemo, useRef, useState } from '../runtime';
import type { Settings } from '../types';
import type { AppearanceMap } from '../ui/appearance';
import { ICONS, PALETTE, hexToRgba, loadAppearance, paletteFor, saveAppearance } from '../ui/appearance';
import { Icon, RunRing } from '../ui/icons';
import { fallbackHook, type PresetSnapshot, type ScheduleSnapshot } from '../core/schedule';
import { PROJECT_COLUMNS, SORT_DIR_DEFAULT, type ProjectColumn, relTime, sessionTitleOf, statusInfo, workspaceLabel, type SessionStatusLike, type StatusInfo } from './format';

export interface WorkspaceView {
  workspaceId: string;
  title?: string;
  path?: string;
  updatedAt?: string;
  sessionIds?: string[];
}

export interface SessionSummary {
  id?: string;
  title?: string;
  displayTitle?: string;
  updatedAt?: number;
  running?: boolean;
  origin?: string;
  blank?: boolean;
  retainedBy?: { mainView?: number };
  projectionValues?: Record<string, unknown>;
}

export interface WorkspaceSnapshot {
  items?: WorkspaceView[];
  archivedSessionIds?: string[];
}

export interface SessionListSnapshot {
  ids?: string[];
  byId?: Record<string, SessionSummary>;
  phase?: string;
}

export type SessionStatusMap = Map<string, SessionStatusLike>;

export interface ProjectBoardProps {
  useWorkspaces: UseHook<WorkspaceSnapshot>;
  useSessions: UseHook<SessionListSnapshot>;
  useSessionStatus: UseHook<SessionStatusMap>;
  useSettings?: UseHook<Settings>;
  useScheduleCatalog?: UseHook<ScheduleSnapshot | null>;
  usePresets?: UseHook<PresetSnapshot | null>;
  openSession?: (id: string) => void;
  openFullBoard?: () => void;
  t: Translate;
  compact?: boolean;
}

interface SortEntry {
  key: string;
  dir: 'asc' | 'desc';
}

interface SessionRow {
  id: string;
  title: string;
  workspaceId: string;
  workspaceLabel: string;
  workspacePath: string;
  info: StatusInfo;
  updatedAt: number;
  running: boolean;
  current: boolean;
  preset: string;
  auto: boolean;
}

interface ProjectModel {
  workspaceId: string;
  name: string;
  path: string;
  counts: Record<string, number>;
  presets: Set<string>;
  hasCurrent: boolean;
  lastUpdated: number;
}

const BUILTIN_PRESET_COPY: Record<string, string> = {
  standard: 'preset.standard',
  ptc: 'preset.ptc',
  minimal: 'preset.minimal',
  cordis: 'preset.cordis'
};

const NO_AUTO = new Set<string>();

interface PopoverPosition {
  left: number;
  top: number;
}

interface CompactRow {
  id: string;
  title: string;
  info: StatusInfo;
  archived: boolean;
  auto: boolean;
  updatedAt: number;
}

export function ProjectBoard(props: ProjectBoardProps): unknown {
  const { useWorkspaces, useSessions, useSessionStatus, openSession, t } = props;
  const useScheduleCatalog = typeof props.useScheduleCatalog === 'function' ? props.useScheduleCatalog : fallbackHook<ScheduleSnapshot | null>();
  const usePresets = typeof props.usePresets === 'function' ? props.usePresets : fallbackHook<PresetSnapshot | null>();
  const useSettings = typeof props.useSettings === 'function' ? props.useSettings : fallbackHook<Settings>();
  const config = useSettings((snapshot) => snapshot) || DEFAULT_SETTINGS;
  const wsSnap = useWorkspaces((snapshot) => snapshot);
  const list = useSessions((snapshot) => snapshot);
  const statuses = useSessionStatus((snapshot) => snapshot);
  const scheduleSnap = useScheduleCatalog((snapshot) => snapshot);
  const presetSnap = usePresets((snapshot) => snapshot);
  const presetNames: Record<string, string> = (presetSnap && presetSnap.names) || {};
  const presetText = (preset: string | undefined): string => {
    if (!preset) return t('preset.none');
    if (presetNames[preset]) return presetNames[preset];
    return BUILTIN_PRESET_COPY[preset] ? t(BUILTIN_PRESET_COPY[preset]) : preset;
  };
  const autoSet = (scheduleSnap && scheduleSnap.activeSessionIds) || NO_AUTO;
  const compact = props.compact === true;
  const openFullBoard = props.openFullBoard;

  const [appearance, setAppearance] = useState<AppearanceMap>(() => loadAppearance());
  useEffect(() => {
    const handler = (): void => setAppearance(loadAppearance());
    window.addEventListener('pbx-appearance-reset', handler);
    return () => window.removeEventListener('pbx-appearance-reset', handler);
  }, []);
  const [editingProject, setEditingProject] = useState<string | null>(null);
  const popRef = useRef<HTMLElement | null>(null);
  const [view, setView] = useState<'projects' | 'sessions'>(() =>
    config.board.defaultView === 'projects' ? 'projects' : 'sessions'
  );
  const [sessionSorts, setSessionSorts] = useState<SortEntry[]>([{ key: 'updatedAt', dir: 'desc' }]);
  const [projectSorts, setProjectSorts] = useState<SortEntry[]>([{ key: 'lastUpdated', dir: 'desc' }]);
  const sorts = view === 'sessions' ? sessionSorts : projectSorts;
  const [statusFilter, setStatusFilter] = useState('all');
  const [kindFilter, setKindFilter] = useState('all');
  const [projectFilter, setProjectFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [grouped, setGrouped] = useState(false);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [compactProjectId, setCompactProjectId] = useState<string | null>(null);
  const [popoverPos, setPopoverPos] = useState<PopoverPosition | null>(null);

  useEffect(() => {
    if (editingProject === null) return undefined;
    const onDown = (event: Event): void => {
      if (popRef.current && !popRef.current.contains(event.target as Node)) setEditingProject(null);
    };
    const onScroll = (): void => setEditingProject(null);
    document.addEventListener('pointerdown', onDown, true);
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onScroll);
    return () => {
      document.removeEventListener('pointerdown', onDown, true);
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onScroll);
    };
  }, [editingProject]);

  const updateAppearance = (id: string, patch: { color?: string; icon?: string }): void => {
    setAppearance((prev) => {
      const next = Object.assign({}, prev);
      next[id] = Object.assign({}, prev[id] || {}, patch);
      saveAppearance(next);
      return next;
    });
  };
  const resetAppearance = (id: string): void => {
    setAppearance((prev) => {
      const next = Object.assign({}, prev);
      delete next[id];
      saveAppearance(next);
      return next;
    });
  };
  const specOf = (workspaceId: string): { color: string; icon: string } => {
    const spec = appearance[workspaceId] || {};
    return { color: spec.color || paletteFor(workspaceId), icon: spec.icon || 'folder' };
  };

  const workspaces = (wsSnap && wsSnap.items) || [];
  const archived = useMemo(() => new Set((wsSnap && wsSnap.archivedSessionIds) || []), [wsSnap]);
  const byId = (list && list.byId) || {};
  const ids = (list && list.ids) || [];
  const ready = Boolean(list && list.phase === 'ready');

  const currentId = useMemo(() => {
    for (const id of ids) {
      const row = byId[id];
      if (row && row.retainedBy && (row.retainedBy.mainView || 0) > 0) return id;
    }
    return undefined;
  }, [ids, byId]);

  const allSessions = useMemo(() => {
    const out: SessionRow[] = [];
    for (const workspace of workspaces) {
      for (const sessionId of workspace.sessionIds || []) {
        const summary = byId[sessionId];
        if (!summary || summary.origin === 'subagent' || summary.blank) continue;
        if (archived.has(sessionId)) continue;
        const status = statuses ? statuses.get(sessionId) : undefined;
        const info = statusInfo(status, summary);
        out.push({
          id: sessionId,
          title: sessionTitleOf(summary, t),
          workspaceId: workspace.workspaceId,
          workspaceLabel: workspaceLabel(workspace.title, t),
          workspacePath: workspace.path || '',
          info: info,
          updatedAt: summary.updatedAt || 0,
          running: info.tone === 'running',
          current: sessionId === currentId,
          preset:
            summary.projectionValues && typeof summary.projectionValues.agentPreset === 'string'
              ? summary.projectionValues.agentPreset
              : '',
          auto: autoSet.has(sessionId)
        });
      }
    }
    return out;
  }, [workspaces, byId, archived, statuses, currentId, t, autoSet]);

  const projectModels = useMemo(() => {
    return workspaces.map((workspace) => {
      const rows = allSessions.filter((s) => s.workspaceId === workspace.workspaceId);
      const counts: Record<string, number> = { total: rows.length, running: 0, attention: 0, done: 0, idle: 0, auto: 0 };
      const presets = new Set<string>();
      let last = 0;
      let hasCurrent = false;
      for (const row of rows) {
        if (counts[row.info.tone] !== undefined) counts[row.info.tone] += 1;
        if (row.auto) counts.auto += 1;
        if (row.preset) presets.add(row.preset);
        if (row.current) hasCurrent = true;
        last = Math.max(last, row.updatedAt);
      }
      if (!last) last = Date.parse(workspace.updatedAt || '') || 0;
      const model: ProjectModel = {
        workspaceId: workspace.workspaceId,
        name: workspaceLabel(workspace.title, t),
        path: workspace.path || '',
        counts: counts,
        presets: presets,
        hasCurrent: hasCurrent,
        lastUpdated: last
      };
      return model;
    });
  }, [workspaces, allSessions, t]);

  const compactStatusRank = (row: CompactRow): number =>
    row.archived ? 9 : row.info.tone === 'running' ? 0 : row.info.tone === 'attention' ? 1 : row.info.tone === 'done' ? 2 : 3;
  const compactSessionsOf = (workspaceId: string): CompactRow[] => {
    const workspace = workspaces.find((item) => item.workspaceId === workspaceId);
    if (!workspace) return [];
    const rows: CompactRow[] = [];
    for (const sessionId of workspace.sessionIds || []) {
      const summary = byId[sessionId];
      if (!summary || summary.origin === 'subagent' || summary.blank) continue;
      const isArchived = archived.has(sessionId);
      const info: StatusInfo = isArchived
        ? { tone: 'idle', labelKey: 'status.archived', rank: 9 }
        : statusInfo(statuses ? statuses.get(sessionId) : undefined, summary);
      rows.push({
        id: sessionId,
        title: sessionTitleOf(summary, t),
        info: info,
        archived: isArchived,
        auto: autoSet.has(sessionId),
        updatedAt: summary.updatedAt || 0
      });
    }
    rows.sort((a, b) => compactStatusRank(a) - compactStatusRank(b) || b.updatedAt - a.updatedAt);
    return rows;
  };

  const totals = useMemo(() => {
    const acc = { workspaces: workspaces.length, sessions: allSessions.length, attention: 0, running: 0 };
    for (const s of allSessions) {
      if (s.info.tone === 'running') acc.running += 1;
      if (s.info.tone === 'attention') acc.attention += 1;
    }
    return acc;
  }, [workspaces, allSessions]);

  const open = (id: string): void => {
    if (typeof openSession === 'function') openSession(id);
  };

  const sortBy = (key: string, additive: boolean): void => {
    const setter = view === 'sessions' ? setSessionSorts : setProjectSorts;
    setter((previous) => {
      const existing = previous.findIndex((entry) => entry.key === key);
      if (!additive) {
        if (previous.length === 1 && previous[0].key === key) {
          return [{ key: key, dir: previous[0].dir === 'asc' ? 'desc' : 'asc' }];
        }
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
  const sessionSortValue = (row: SessionRow, key: string): string | number => {
    if (key === 'title') return row.title.toLowerCase();
    if (key === 'project') return row.workspaceLabel.toLowerCase();
    if (key === 'status') return row.info.rank;
    if (key === 'kind') return row.auto ? 0 : 1;
    if (key === 'preset') return presetText(row.preset).toLowerCase();
    if (key === 'updatedAt') return row.updatedAt;
    return 0;
  };
  const projectSortValue = (project: ProjectModel, key: string): string | number => {
    if (key === 'name') return project.name.toLowerCase();
    if (key === 'lastUpdated') return project.lastUpdated;
    if (key === 'presets') return project.presets ? project.presets.size : 0;
    return project.counts[key] !== undefined ? project.counts[key] : 0;
  };
  const compareBySorts =
    <T,>(sortList: SortEntry[], valueOf: (row: T, key: string) => string | number) =>
    (a: T, b: T): number => {
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

  const renderPopover = (workspaceId: string, color: string, icon: string): unknown => {
    const spec = appearance[workspaceId] || {};
    const popStyle = popoverPos ? { left: popoverPos.left + 'px', top: popoverPos.top + 'px' } : undefined;
    return h(
      'div',
      { className: 'pbx-pop', ref: popRef, style: popStyle, onClick: (event: Event) => event.stopPropagation() },
      h('div', { className: 'pbx-popLabel' }, t('appearance.color')),
      h(
        'div',
        { className: 'pbx-swatches' },
        PALETTE.map((value) =>
          h('button', {
            key: value,
            type: 'button',
            className: 'pbx-swatchBtn' + ((spec.color || color) === value ? ' sel' : ''),
            style: { background: value },
            'aria-label': value,
            onClick: (event: Event) => {
              event.stopPropagation();
              updateAppearance(workspaceId, { color: value });
            }
          })
        )
      ),
      h('div', { className: 'pbx-popLabel' }, t('appearance.icon')),
      h(
        'div',
        { className: 'pbx-icons' },
        ICONS.map((name) =>
          h(
            'button',
            {
              key: name,
              type: 'button',
              className: 'pbx-iconBtn' + ((spec.icon || icon) === name ? ' sel' : ''),
              'aria-label': name,
              onClick: (event: Event) => {
                event.stopPropagation();
                updateAppearance(workspaceId, { icon: name });
              }
            },
            h(Icon, { name: name, size: 16 })
          )
        )
      ),
      h(
        'button',
        {
          type: 'button',
          className: 'pbx-reset',
          onClick: (event: Event) => {
            event.stopPropagation();
            resetAppearance(workspaceId);
          }
        },
        t('appearance.reset')
      )
    );
  };

  const projectChip = (workspaceId: string, label: string, size?: 'lg'): unknown => {
    const spec = specOf(workspaceId);
    return h(
      'span',
      { className: 'pbx-chip' },
      h(
        'span',
        { className: 'pbx-chipIcon' + (size === 'lg' ? ' lg' : ''), style: { color: spec.color, background: hexToRgba(spec.color, 0.16) } },
        h(Icon, { name: spec.icon, size: size === 'lg' ? 15 : 12 })
      ),
      h('span', { className: 'pbx-chipName' }, label)
    );
  };

  const statusPill = (info: StatusInfo): unknown =>
    h(
      'span',
      { className: 'pbx-statusPill', 'data-tone': info.tone },
      info.tone === 'running' ? h(RunRing, { size: 8 }) : h('span', { className: 'pbx-kdot', 'data-tone': info.tone }),
      t(info.labelKey)
    );

  const th = (key: string, label: string, type: string, options?: { num?: boolean; sortable?: boolean }): unknown => {
    const opts = options || {};
    const position = sorts.findIndex((entry) => entry.key === key);
    const active = position >= 0;
    const direction = active ? sorts[position].dir : null;
    return h(
      'th',
      {
        className: 'pbx-th' + (opts.sortable === false ? '' : ' sortable') + (active ? ' active' : '') + (opts.num ? ' num' : ''),
        title: opts.sortable === false ? undefined : t('sort.hint'),
        'aria-sort': opts.sortable === false ? undefined : active ? (direction === 'asc' ? 'ascending' : 'descending') : 'none',
        tabIndex: opts.sortable === false ? undefined : 0,
        onClick: opts.sortable === false ? undefined : (event: MouseEvent) => sortBy(key, Boolean(event.shiftKey)),
        onKeyDown:
          opts.sortable === false
            ? undefined
            : (event: KeyboardEvent) => {
                if (event.key !== 'Enter' && event.key !== ' ') return;
                event.preventDefault();
                sortBy(key, Boolean(event.shiftKey));
              }
      },
      h('span', { className: 'pbx-thType', 'aria-hidden': 'true' }, type || ''),
      h('span', { className: 'pbx-thLabel' }, label),
      active ? h('span', { className: 'pbx-sortMark' }, (sorts.length > 1 ? String(position + 1) : '') + (direction === 'asc' ? '↑' : '↓')) : null
    );
  };

  const renderSessionRow = (row: SessionRow): unknown =>
    h(
      'tr',
      {
        key: row.id,
        className: 'pbx-tr' + (row.running ? ' pbx-tr-live' : '') + (row.current ? ' pbx-tr-current' : '') + (row.auto ? ' pbx-tr-auto' : ''),
        onClick: () => open(row.id),
        tabIndex: 0,
        onKeyDown: (e: KeyboardEvent) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            open(row.id);
          }
        }
      },
      h('td', null, projectChip(row.workspaceId, row.workspaceLabel)),
      h(
        'td',
        null,
        h(
          'div',
          { className: 'pbx-titleCell' },
          row.auto ? h('span', { className: 'pbx-autoGlyph', title: t('kind.auto') }, h(Icon, { name: 'clock', size: 13 })) : null,
          row.info.tone === 'running' ? h(RunRing, { size: 9 }) : h('span', { className: 'pbx-rdot', 'data-tone': row.info.tone }),
          h('span', { className: 'pbx-titleText' }, row.title),
          row.current ? h('span', { className: 'pbx-curTag' }, t('card.current')) : null
        )
      ),
      h('td', null, statusPill(row.info)),
      h(
        'td',
        null,
        row.auto
          ? h('span', { className: 'pbx-kindTag auto' }, h(Icon, { name: 'clock', size: 12 }), t('kind.auto'))
          : h('span', { className: 'pbx-kindTag' }, t('kind.normal'))
      ),
      h('td', null, row.preset ? h('span', { className: 'pbx-modeTag' }, presetText(row.preset)) : h('span', { className: 'pbx-modeTag empty' }, t('preset.none'))),
      h('td', { className: 'pbx-num' }, relTime(row.updatedAt, t)),
      h(
        'td',
        { className: 'pbx-center' },
        h(
          'button',
          {
            type: 'button',
            className: 'pbx-openBtn',
            title: t('open'),
            'aria-label': t('open'),
            onClick: (e: Event) => {
              e.stopPropagation();
              open(row.id);
            }
          },
          h(Icon, { name: 'arrow', size: 14 })
        )
      )
    );

  const renderGroupHeader = (workspaceId: string, label: string, count: number): unknown => {
    const isCollapsed = collapsed[workspaceId] === true;
    return h(
      'tr',
      { key: 'g-' + workspaceId, className: 'pbx-groupRow' },
      h(
        'td',
        { colSpan: 7, onClick: () => setCollapsed((prev) => Object.assign({}, prev, { [workspaceId]: !isCollapsed })) },
        h('span', { className: 'pbx-groupChevron' + (isCollapsed ? '' : ' open') }, h(Icon, { name: 'chevron', size: 13 })),
        projectChip(workspaceId, label, 'lg'),
        h('span', { className: 'pbx-groupCount' }, t('count.rows', { n: count }))
      )
    );
  };

  const renderSessionsBody = (): unknown => {
    if (filteredSessions.length === 0) {
      return h('tr', null, h('td', { colSpan: 7, className: 'pbx-emptyCell' }, t('empty.filtered')));
    }
    if (!grouped) return filteredSessions.map(renderSessionRow);
    const rows: unknown[] = [];
    for (const project of projectModels) {
      const groupRows = filteredSessions.filter((s) => s.workspaceId === project.workspaceId);
      if (groupRows.length === 0) continue;
      rows.push(renderGroupHeader(project.workspaceId, project.name, groupRows.length));
      if (collapsed[project.workspaceId] !== true) rows.push.apply(rows, groupRows.map(renderSessionRow));
    }
    return rows;
  };

  const projectCols: ProjectColumn[] = PROJECT_COLUMNS.filter((def) => !config.projectColumns || (config.projectColumns as unknown as Record<string, boolean>)[def.key] !== false);
  const projectCell = (project: ProjectModel, def: ProjectColumn): unknown => {
    if (def.key === 'lastUpdated') return relTime(project.lastUpdated, t);
    if (def.key === 'presets') return String(project.presets ? project.presets.size : 0);
    const value = project.counts[def.key] ?? 0;
    const style =
      def.key === 'running'
        ? { color: value > 0 ? 'var(--dsw-alias-brand-primary)' : undefined }
        : def.key === 'attention'
          ? { color: value > 0 ? '#f59e0b' : undefined }
          : def.key === 'auto'
            ? { color: value > 0 ? 'var(--dsw-alias-state-warn-primary)' : undefined }
            : undefined;
    return h('td', { className: 'pbx-num' + (def.key === 'total' ? ' pbx-strong' : ''), style: style }, String(value));
  };
  const renderProjectRow = (project: ProjectModel): unknown => {
    const spec = specOf(project.workspaceId);
    const isEditing = editingProject === project.workspaceId;
    return h(
      'tr',
      {
        key: project.workspaceId,
        className: 'pbx-tr',
        tabIndex: 0,
        onClick: () => {
          setProjectFilter(project.workspaceId);
          setView('sessions');
          setStatusFilter('all');
        },
        onKeyDown: (e: KeyboardEvent) => {
          if (e.key === 'Enter') {
            setProjectFilter(project.workspaceId);
            setView('sessions');
          }
        }
      },
      h(
        'td',
        null,
        h(
          'div',
          { className: 'pbx-titleCell' },
          h(
            'span',
            { className: 'pbx-iconField', style: { position: 'relative' } },
            h(
              'button',
              {
                type: 'button',
                className: 'pbx-chipIcon lg pbx-iconTrigger',
                title: t('col.appearance'),
                'aria-label': t('col.appearance'),
                style: { color: spec.color, background: hexToRgba(spec.color, 0.16) },
                onPointerDown: (e: Event) => e.stopPropagation(),
                onClick: (e: MouseEvent) => {
                  e.stopPropagation();
                  if (isEditing) {
                    setEditingProject(null);
                    return;
                  }
                  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                  setPopoverPos({
                    left: Math.max(12, Math.min(window.innerWidth - 248, Math.round(rect.left))),
                    top: Math.max(12, Math.min(window.innerHeight - 300, Math.round(rect.bottom + 8)))
                  });
                  setEditingProject(project.workspaceId);
                }
              },
              h(Icon, { name: spec.icon, size: 15 })
            ),
            isEditing ? renderPopover(project.workspaceId, spec.color, spec.icon) : null
          ),
          h(
            'div',
            { className: 'pbx-twoLine' },
            h('div', { className: 'pbx-titleText' }, project.name),
            h('div', { className: 'pbx-subText' }, project.path)
          )
        )
      ),
      projectCols.map((def) => projectCell(project, def))
    );
  };

  const header = h(
    'div',
    { className: 'pbx-header' },
    h(
      'div',
      null,
      h('div', { className: 'pbx-titleRow' }, h('span', { className: 'pbx-glyph' }, h(Icon, { name: 'board', size: 20 })), h('span', null, t('title'))),
      h('div', { className: 'pbx-subtitle' }, t('subtitle'))
    ),
    h(
      'div',
      { className: 'pbx-headerRight' },
      h(
        'div',
        { className: 'pbx-totals' },
        h('span', { className: 'pbx-total' }, h('strong', null, String(totals.workspaces)), t('stat.workspaces')),
        h('span', { className: 'pbx-total' }, h('strong', null, String(totals.sessions)), t('stat.sessions')),
        totals.attention > 0
          ? h('span', { className: 'pbx-total' }, h('strong', { style: { color: '#f59e0b' } }, String(totals.attention)), t('stat.attention'))
          : null,
        totals.running > 0
          ? h(
              'span',
              { className: 'pbx-total' },
              h('strong', { style: { color: 'var(--dsw-alias-brand-primary)' } }, String(totals.running)),
              t('stat.running')
            )
          : null
      )
    )
  );

  const toolbar = h(
    'div',
    { className: 'pbx-toolbar' },
    h(
      'div',
      { className: 'pbx-tabs', role: 'tablist' },
      h(
        'button',
        {
          type: 'button',
          role: 'tab',
          'aria-selected': view === 'projects' ? 'true' : 'false',
          className: 'pbx-tab' + (view === 'projects' ? ' active' : ''),
          onClick: () => setView('projects')
        },
        t('view.projects'),
        h('span', { className: 'pbx-tabCount' }, String(projectModels.length))
      ),
      h(
        'button',
        {
          type: 'button',
          role: 'tab',
          'aria-selected': view === 'sessions' ? 'true' : 'false',
          className: 'pbx-tab' + (view === 'sessions' ? ' active' : ''),
          onClick: () => setView('sessions')
        },
        t('view.sessions'),
        h('span', { className: 'pbx-tabCount' }, String(allSessions.length))
      )
    ),
    h(
      'div',
      { className: 'pbx-tools' },
      h('input', {
        className: 'pbx-input',
        type: 'text',
        placeholder: t('filter.search'),
        'aria-label': t('filter.search'),
        value: query,
        onChange: (e: Event) => setQuery((e.target as HTMLInputElement).value)
      }),
      view === 'sessions'
        ? h(
            'select',
            {
              className: 'pbx-select',
              value: statusFilter,
              onChange: (e: Event) => setStatusFilter((e.target as HTMLSelectElement).value),
              'aria-label': t('filter.status')
            },
            h('option', { value: 'all' }, t('filter.status') + ': ' + t('filter.all')),
            h('option', { value: 'running' }, t('status.running')),
            h('option', { value: 'attention' }, t('status.attention')),
            h('option', { value: 'done' }, t('status.done')),
            h('option', { value: 'idle' }, t('status.idle'))
          )
        : null,
      view === 'sessions'
        ? h(
            'select',
            {
              className: 'pbx-select',
              value: kindFilter,
              onChange: (e: Event) => setKindFilter((e.target as HTMLSelectElement).value),
              'aria-label': t('filter.kind')
            },
            h('option', { value: 'all' }, t('filter.kind') + ': ' + t('filter.all')),
            h('option', { value: 'auto' }, t('kind.auto')),
            h('option', { value: 'normal' }, t('kind.normal'))
          )
        : null,
      view === 'sessions'
        ? h(
            'select',
            {
              className: 'pbx-select',
              value: projectFilter,
              onChange: (e: Event) => setProjectFilter((e.target as HTMLSelectElement).value),
              'aria-label': t('filter.project')
            },
            h('option', { value: 'all' }, t('filter.project') + ': ' + t('filter.all')),
            projectModels.map((p) => h('option', { key: p.workspaceId, value: p.workspaceId }, p.name))
          )
        : null,
      view === 'sessions'
        ? h('button', { type: 'button', className: 'pbx-toggle' + (grouped ? ' on' : ''), onClick: () => setGrouped((v) => !v) }, t('group.byProject'))
        : null,
      h('span', { className: 'pbx-sortHint' }, t('sort.hint'))
    )
  );

  let body: unknown;
  if (!ready && workspaces.length === 0) {
    body = h('div', { className: 'pbx-loading' }, t('loading'));
  } else if (workspaces.length === 0) {
    body = h(
      'div',
      { className: 'pbx-empty' },
      h('div', { className: 'pbx-emptyIcon' }, h(Icon, { name: 'board', size: 30 })),
      h('div', { className: 'pbx-emptyTitle' }, t('empty.title')),
      h('div', { className: 'pbx-emptyDesc' }, t('empty.desc'))
    );
  } else if (view === 'sessions') {
    body = h(
      'div',
      { className: 'pbx-dbScroll' },
      h(
        'table',
        { className: 'pbx-table' },
        h(
          'thead',
          null,
          h(
            'tr',
            null,
            th('project', t('col.project'), '↗'),
            th('title', t('col.title'), 'Aa'),
            th('status', t('col.status'), '◉'),
            th('kind', t('col.kind'), '◇'),
            th('preset', t('col.preset'), '◈'),
            th('updatedAt', t('col.updated'), '◷', { num: true }),
            th('open', '', '', { sortable: false })
          )
        ),
        h('tbody', null, renderSessionsBody())
      ),
      h('div', { className: 'pbx-dbFoot' }, t('count.rows', { n: filteredSessions.length }))
    );
  } else {
    body = h(
      'div',
      { className: 'pbx-dbScroll' },
      h(
        'table',
        { className: 'pbx-table' },
        h(
          'thead',
          null,
          h('tr', null, th('name', t('col.project'), 'Aa'), projectCols.map((def) => th(def.key, t(def.labelKey), def.type, { num: true })))
        ),
        h(
          'tbody',
          null,
          filteredProjects.length === 0
            ? h('tr', null, h('td', { colSpan: 1 + projectCols.length, className: 'pbx-emptyCell' }, t('empty.filtered')))
            : filteredProjects.map(renderProjectRow)
        )
      ),
      h('div', { className: 'pbx-dbFoot' }, t('count.rows', { n: filteredProjects.length }))
    );
  }

  if (compact) {
    const statChip = (label: string, value: number, color?: string): unknown =>
      value > 0 ? h('span', { className: 'pbx-pcardStat', style: { color: color } }, String(value) + ' ' + label) : null;
    const activeProject = compactProjectId ? projectModels.find((item) => item.workspaceId === compactProjectId) : null;
    const activeRows = activeProject ? compactSessionsOf(activeProject.workspaceId) : [];
    return h(
      'div',
      { className: 'pbx-root pbx-compact' },
      h(
        'div',
        { className: 'pbx-compactWrap' },
        h(
          'div',
          { className: 'pbx-compactHead' },
          activeProject
            ? h(
                'button',
                {
                  type: 'button',
                  className: 'pbx-compactBack',
                  title: t('compact.allProjects'),
                  'aria-label': t('compact.allProjects'),
                  onClick: () => setCompactProjectId(null)
                },
                h(Icon, { name: 'left', size: 14 })
              )
            : null,
          h(
            'div',
            { className: 'pbx-compactTitle' },
            h(Icon, { name: 'board', size: 16 }),
            h('span', null, activeProject ? activeProject.name : t('title'))
          ),
          h(
            'div',
            { className: 'pbx-compactMeta' },
            activeProject
              ? String(activeRows.length) + ' ' + t('stat.sessions')
              : String(projectModels.length) + ' ' + t('stat.workspaces') + ' · ' + String(totals.running) + ' ' + t('stat.running')
          ),
          typeof openFullBoard === 'function'
            ? h(
                'button',
                { type: 'button', className: 'pbx-compactFull', title: t('compact.full'), onClick: () => openFullBoard() },
                h(Icon, { name: 'expand', size: 14 })
              )
            : null
        ),
        activeProject
          ? h(
              'div',
              { className: 'pbx-compactBody' },
              activeRows.length === 0
                ? h('div', { className: 'pbx-cgroupEmpty' }, t('col.empty'))
                : h(
                    'div',
                    { className: 'pbx-compactList' },
                    activeRows.map((row) =>
                      h(
                        'button',
                        {
                          key: row.id,
                          type: 'button',
                          className:
                            'pbx-crow' +
                            (row.auto ? ' auto' : '') +
                            (row.archived ? ' archived' : '') +
                            (row.info.tone === 'running' ? ' live' : ''),
                          title: t('card.open'),
                          onClick: () => open(row.id)
                        },
                        row.info.tone === 'running' ? h(RunRing, { size: 9 }) : h('span', { className: 'pbx-rdot', 'data-tone': row.info.tone }),
                        row.auto ? h('span', { className: 'pbx-autoGlyph' }, h(Icon, { name: 'clock', size: 12 })) : null,
                        h('span', { className: 'pbx-ctitle' }, row.title),
                        row.archived ? h('span', { className: 'pbx-prowArchived' }, t('palette.archived')) : null,
                        h('span', { className: 'pbx-ctime' }, relTime(row.updatedAt, t))
                      )
                    )
                  ),
              activeProject.path
                ? h(
                    'div',
                    { className: 'pbx-compactPath', title: activeProject.path },
                    h('span', { className: 'pbx-compactPathLabel' }, t('col.path')),
                    h('span', { className: 'pbx-compactPathText' }, activeProject.path)
                  )
                : null
            )
          : filteredProjects.length === 0
            ? h('div', { className: 'pbx-cgroupEmpty' }, t('empty.filtered'))
            : filteredProjects.map((project) => {
                const spec = specOf(project.workspaceId);
                return h(
                  'button',
                  {
                    key: project.workspaceId,
                    type: 'button',
                    className: 'pbx-pcard',
                    title: t('card.open'),
                    onClick: () => {
                      setCompactProjectId(project.workspaceId);
                      setProjectFilter(project.workspaceId);
                      setStatusFilter('all');
                    }
                  },
                  h(
                    'span',
                    { className: 'pbx-pcardTop' },
                    h(
                      'span',
                      { className: 'pbx-chipIcon', style: { color: spec.color, background: hexToRgba(spec.color, 0.16) } },
                      h(Icon, { name: spec.icon, size: 13 })
                    ),
                    h('span', { className: 'pbx-pcardName' }, project.name),
                    h('span', { className: 'pbx-pcardTotal' }, String(project.counts.total))
                  ),
                  h(
                    'span',
                    { className: 'pbx-pcardStats' },
                    statChip(t('stat.running'), project.counts.running, 'var(--dsw-alias-brand-primary)'),
                    statChip(t('stat.attention'), project.counts.attention, '#f59e0b'),
                    statChip(t('status.done'), project.counts.done, 'var(--dsw-alias-state-success-primary)'),
                    statChip(t('stat.auto'), project.counts.auto, 'var(--dsw-alias-state-warn-primary)')
                  )
                );
              })
      )
    );
  }

  return h('div', { className: 'pbx-root' }, h('div', { className: 'pbx-wrap' }, header, toolbar, body));
}
