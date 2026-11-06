/**
 * Scoped logging: filtered by the configured level, optionally mirrored into the in-app log
 * store, and always written to the console for devtools.
 */
import type { LogConfig, LogEntry, LogLevel } from '../types';

const LOG_LEVELS: Record<LogLevel, number> = { error: 0, warn: 1, info: 2, debug: 3 };
const LOG_LIMIT_FALLBACK = 200;

let logConfigGetter: (() => LogConfig | null) | null = null;
let logSink: ((entry: LogEntry) => void) | null = null;

export function setLogConfigGetter(getter: () => LogConfig | null): void {
  logConfigGetter = typeof getter === 'function' ? getter : null;
}

export function setLogSink(sink: (entry: LogEntry) => void): void {
  logSink = typeof sink === 'function' ? sink : null;
}

export function logConfigNow(): LogConfig {
  let config: Partial<LogConfig> | null = null;
  try {
    config = logConfigGetter ? logConfigGetter() : null;
  } catch (error) {
    config = null;
  }
  return Object.assign({ enabled: true, level: 'info' as LogLevel, max: LOG_LIMIT_FALLBACK }, config || {});
}

function cleanLogData(data: unknown): unknown {
  if (data === undefined) return undefined;
  try {
    return JSON.parse(
      JSON.stringify(data, (_key, value: unknown) => {
        if (typeof value === 'string') return value.length > 300 ? value.slice(0, 300) + '…' : value;
        if (typeof value === 'function') return '[fn]';
        return value;
      })
    );
  } catch (error) {
    return String(data).slice(0, 300);
  }
}

/** One scoped log line: filtered by the configured level, kept in memory and (throttled) in storage. */
export function logEvent(level: LogLevel, scope: string, message: string, data?: unknown): void {
  try {
    const config = logConfigNow();
    if (config.enabled === false) return;
    const name: LogLevel = Object.prototype.hasOwnProperty.call(LOG_LEVELS, level) ? level : 'info';
    const limit = LOG_LEVELS[config.level] === undefined ? LOG_LEVELS.info : LOG_LEVELS[config.level];
    if (LOG_LEVELS[name] > limit) return;
    const entry: LogEntry = {
      at: Date.now(),
      level: name,
      scope: String(scope || 'app').slice(0, 40),
      message: String(message === undefined ? '' : message).slice(0, 400)
    };
    const payload = cleanLogData(data);
    if (payload !== undefined) entry.data = payload;
    if (logSink) {
      try {
        logSink(entry);
      } catch (error) {
        /* ignore */
      }
    }
    const writer = name === 'error' ? console.error : name === 'warn' ? console.warn : console.log;
    try {
      writer('[project-board][' + entry.scope + '] ' + entry.message, payload === undefined ? '' : payload);
    } catch (error) {
      /* ignore */
    }
  } catch (error) {
    /* never break a feature because logging failed */
  }
}
