/** Label/tone formatting shared by the board and the floating list. */
import type { Translate } from '../host';

export interface SessionStatusLike {
  running?: boolean;
  completionUnread?: boolean;
  pendingInteraction?: { kind?: string } | null;
}

export interface SessionSummaryLike {
  id?: string;
  title?: string;
  running?: boolean;
  updatedAt?: number;
}

export type Tone = 'attention' | 'running' | 'done' | 'idle';

export interface StatusInfo {
  tone: Tone;
  labelKey: string;
  rank: number;
}

export function workspaceLabel(title: string | undefined, t: Translate): string {
  if (!title || title === 'default-workspace') return t('workspace.default');
  return title;
}

export function sessionTitleOf(summary: { title?: string } | null | undefined, t: Translate): string {
  const title = summary && typeof summary.title === 'string' ? summary.title.trim() : '';
  return title || t('session.untitled');
}

export function statusInfo(status: SessionStatusLike | null | undefined, summary: SessionSummaryLike | null | undefined): StatusInfo {
  const kind = status && status.pendingInteraction ? status.pendingInteraction.kind : undefined;
  if (kind === 'approval') return { tone: 'attention', labelKey: 'status.approval', rank: 4 };
  if (kind === 'plan-review') return { tone: 'attention', labelKey: 'status.plan', rank: 4 };
  if (kind === 'question') return { tone: 'attention', labelKey: 'status.question', rank: 4 };
  const running = status ? status.running : undefined;
  if (running === undefined ? summary && summary.running : running) return { tone: 'running', labelKey: 'status.running', rank: 3 };
  if (status && status.completionUnread) return { tone: 'done', labelKey: 'status.done', rank: 2 };
  return { tone: 'idle', labelKey: 'status.idle', rank: 1 };
}

export function relTime(updatedAt: number | undefined, t: Translate): string {
  if (!updatedAt) return '—';
  const diff = Math.max(0, Date.now() - updatedAt);
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return t('time.now');
  if (minutes < 60) return t('time.min', { n: minutes });
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return t('time.hour', { n: hours });
  return t('time.day', { n: Math.floor(hours / 24) });
}

/** Project attributes that can be shown as columns in the board's project table. */
export interface ProjectColumn {
  key: string;
  labelKey: string;
  type: string;
}

export const PROJECT_COLUMNS: ProjectColumn[] = [
  { key: 'total', labelKey: 'settings.pc.total', type: '#' },
  { key: 'running', labelKey: 'settings.pc.running', type: '#' },
  { key: 'attention', labelKey: 'settings.pc.attention', type: '#' },
  { key: 'done', labelKey: 'settings.pc.done', type: '#' },
  { key: 'idle', labelKey: 'settings.pc.idle', type: '#' },
  { key: 'auto', labelKey: 'settings.pc.auto', type: '#' },
  { key: 'presets', labelKey: 'settings.pc.presets', type: '#' },
  { key: 'lastUpdated', labelKey: 'settings.pc.lastUpdated', type: '◷' }
];

export const SORT_DIR_DEFAULT: Record<string, 'asc' | 'desc'> = {
  title: 'asc',
  project: 'asc',
  status: 'desc',
  kind: 'asc',
  running: 'desc',
  current: 'desc',
  preset: 'asc',
  updatedAt: 'desc',
  name: 'asc',
  appearance: 'asc',
  total: 'desc',
  auto: 'desc',
  attention: 'desc',
  done: 'desc',
  idle: 'desc',
  lastUpdated: 'desc'
};
