/**
 * Centralized Production Error Reporting & Observability Adapter for CampusBite.
 * Integrates with Sentry (via NEXT_PUBLIC_SENTRY_DSN or window.Sentry) with
 * structured diagnostic JSON fallback in development/unconfigured environments.
 */

import { logger } from "@/lib/logger";

export type ErrorContext = {
  sectionName?: string;
  componentStack?: string;
  userId?: string;
  userRole?: string;
  url?: string;
  metadata?: Record<string, unknown>;
};

export interface ErrorReporter {
  captureException(error: Error | string | unknown, context?: ErrorContext): void;
  captureMessage(
    message: string,
    level?: "info" | "warn" | "error",
    context?: ErrorContext
  ): void;
}

declare global {
  interface Window {
    Sentry?: {
      captureException: (error: unknown, captureContext?: unknown) => string;
      captureMessage: (message: string, captureContext?: unknown) => string;
    };
  }
}

/**
 * Production Sentry Reporter with Graceful Diagnostic Fallback.
 */
export class SentryErrorReporter implements ErrorReporter {
  private dsn: string;

  constructor(dsn?: string) {
    this.dsn = dsn || (typeof process !== "undefined" ? process.env.NEXT_PUBLIC_SENTRY_DSN || "" : "");
  }

  captureException(error: Error | string | unknown, context?: ErrorContext): void {
    const errorObj = error instanceof Error ? error : new Error(String(error || "Unknown Error"));
    const prefix = context?.sectionName
      ? `ErrorReporting:${context.sectionName}`
      : "ErrorReporting";

    // 1. If global Sentry SDK is attached to window, forward directly
    if (typeof window !== "undefined" && window.Sentry?.captureException) {
      window.Sentry.captureException(errorObj, {
        extra: {
          ...context,
          url: context?.url || window.location.href,
        },
      });
      return;
    }

    // 2. Structured JSON diagnostic logger fallback
    logger.error(prefix, errorObj.message, {
      name: errorObj.name,
      stack: errorObj.stack,
      dsn_configured: Boolean(this.dsn),
      ...context,
    });
  }

  captureMessage(
    message: string,
    level: "info" | "warn" | "error" = "info",
    context?: ErrorContext
  ): void {
    const prefix = context?.sectionName
      ? `ErrorReporting:${context.sectionName}`
      : "ErrorReporting";

    if (typeof window !== "undefined" && window.Sentry?.captureMessage) {
      window.Sentry.captureMessage(message, {
        level,
        extra: {
          ...context,
          url: context?.url || window.location.href,
        },
      });
      return;
    }

    const payload = {
      dsn_configured: Boolean(this.dsn),
      ...context,
    };

    if (level === "error") {
      logger.error(prefix, message, payload);
    } else if (level === "warn") {
      logger.warn(prefix, message, payload);
    } else {
      logger.info(prefix, message, payload);
    }
  }
}

let activeReporter: ErrorReporter = new SentryErrorReporter();

/**
 * Configure a custom error reporting adapter.
 */
export function setErrorReporter(reporter: ErrorReporter): void {
  activeReporter = reporter;
}

/**
 * Retrieve the active error reporting adapter.
 */
export function getErrorReporter(): ErrorReporter {
  return activeReporter;
}

/**
 * Direct alias to capture an exception through the active reporter.
 */
export function captureException(
  error: Error | string | unknown,
  context?: ErrorContext
): void {
  try {
    activeReporter.captureException(error, {
      url: typeof window !== "undefined" ? window.location.href : undefined,
      ...context,
    });
  } catch (reporterErr) {
    console.error("[ErrorReporting] Failed to capture exception:", reporterErr);
  }
}

/**
 * Direct alias to capture an operational log or message.
 */
export function captureMessage(
  message: string,
  level: "info" | "warn" | "error" = "info",
  context?: ErrorContext
): void {
  try {
    activeReporter.captureMessage(message, level, {
      url: typeof window !== "undefined" ? window.location.href : undefined,
      ...context,
    });
  } catch (reporterErr) {
    console.error("[ErrorReporting] Failed to capture message:", reporterErr);
  }
}

/**
 * Report an unhandled exception or caught error through the active error adapter.
 */
export function reportError(
  error: Error | string | unknown,
  context?: ErrorContext
): void {
  captureException(error, context);
}

/**
 * Report an operational message or diagnostic log event.
 */
export function reportMessage(
  message: string,
  level: "info" | "warn" | "error" = "info",
  context?: ErrorContext
): void {
  captureMessage(message, level, context);
}
