/**
 * Shapes of the read-only host snapshots this plugin consumes.
 *
 * These live in `core/` rather than inside a feature because several features read them
 * (board, HUD, palette, header, notifications, guard, settings). Keeping them here means no
 * feature has to import another feature just to name a host snapshot — the board module
 * stays an implementation instead of doubling as the type hub for the whole plugin.
 *
 * Every field is optional on purpose: the snapshots come from `useX(selector)` hooks whose
 * exact shape is the host's, and this plugin only ever reads a subset. Narrowing to the
 * fields actually used keeps a host field rename from breaking compilation.
 */

/** One workspace as the host lists it. */
export interface WorkspaceView {
  workspaceId: string;
  title?: string;
  path?: string;
  updatedAt?: string;
  sessionIds?: string[];
}

/** One session summary as the host lists it. */
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

/** Live session status for one session (the status hook's value). */
export interface SessionStatusLike {
  running?: boolean;
  completionUnread?: boolean;
  pendingInteraction?: { kind?: string } | null;
}

/** The workspace-list snapshot. */
export interface WorkspaceSnapshot {
  items?: WorkspaceView[];
  archivedSessionIds?: string[];
}

/** The session-list snapshot. */
export interface SessionListSnapshot {
  ids?: string[];
  byId?: Record<string, SessionSummary>;
  phase?: string;
}

/** The session-status map: session id → status. */
export type SessionStatusMap = Map<string, SessionStatusLike>;
