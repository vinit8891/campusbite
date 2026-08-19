/**
 * Production-ready logger for CampusBite frontend.
 * Provides environment-aware log levels and standardized formatting.
 */

export type LogLevel = "debug" | "info" | "warn" | "error";

const isDev = process.env.NODE_ENV !== "production";

function formatMessage(prefix: string, message: string): string {
  return `[${prefix}] ${message}`;
}

export const logger = {
  debug(prefix: string, message: string, ...args: unknown[]) {
    if (isDev) {
      console.debug(formatMessage(prefix, message), ...args);
    }
  },

  info(prefix: string, message: string, ...args: unknown[]) {
    if (isDev) {
      console.info(formatMessage(prefix, message), ...args);
    }
  },

  warn(prefix: string, message: string, ...args: unknown[]) {
    console.warn(formatMessage(prefix, message), ...args);
  },

  error(prefix: string, message: string, error?: unknown) {
    console.error(formatMessage(prefix, message), error ?? "");
  },
};
