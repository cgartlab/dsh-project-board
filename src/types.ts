/** Shared domain types for the dsh-tac client bundle. */

export type LogLevel = 'error' | 'warn' | 'info' | 'debug';

export interface LogEntry {
  at: number;
  level: LogLevel;
  scope: string;
  message: string;
  data?: unknown;
}

export interface LogConfig {
  enabled: boolean;
  level: LogLevel;
  max: number;
}

export type ShortcutAction =
  | 'palette'
  | 'prev'
  | 'next'
  | 'userPrev'
  | 'userNext'
  | 'scrollBottom'
  | 'sidebarBoard'
  | 'leftSidebar'
  | 'panelHalf'
  | 'panelFull'
  | 'rename'
  | 'interject'
  | 'hud'
  | 'sessionMenu';

export type ShortcutMap = Record<ShortcutAction, string>;

export interface HeaderButtonSetting {
  hidden: boolean;
  side: string;
  order: number;
}

export interface PaletteSettings {
  enabled: boolean;
  blur: number;
  includeArchived: boolean;
}

export interface HintsSettings {
  shortcuts: boolean;
}

export interface HudSettings {
  enabled: boolean;
  includeDone: boolean;
  defaultCollapsed: boolean;
  defaultPosition: string;
  recentEnabled: boolean;
  recentCount: number;
  recentExcludeAuto: boolean;
  maxSessions: number;
}

export interface NotifySettings {
  enabled: boolean;
  sound: boolean;
}

export interface BoardSettings {
  enabled: boolean;
  wideThreshold: number;
  defaultView: string;
}

export interface ProjectColumnsSettings {
  total: boolean;
  running: boolean;
  attention: boolean;
  done: boolean;
  idle: boolean;
  auto: boolean;
  lastUpdated: boolean;
  presets: boolean;
}

export interface Settings {
  shortcuts: ShortcutMap;
  palette: PaletteSettings;
  header: { capsule: boolean; placement: string };
  hints: HintsSettings;
  hintsVersion: number;
  shortcutsVersion: number;
  headerButtonsVersion: number;
  /** Migration marker for the project-first board view. */
  boardProjVersion?: number;
  headerButtons: Record<string, HeaderButtonSetting>;
  hud: HudSettings;
  notify: NotifySettings;
  log: LogConfig;
  board: BoardSettings;
  projectColumns: ProjectColumnsSettings;
}

/** Minimal observable store used for the plugin's own UI state. */
export interface UiStore<T extends object> {
  getSnapshot(): T;
  subscribe(listener: () => void): () => void;
  set(patch: Partial<T>): void;
  toggle(key: keyof T & string): void;
}
