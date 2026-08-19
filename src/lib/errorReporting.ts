/**
 * Centralized Error Reporting Adapter for CampusBite.
 * Designed to integrate with Sentry, Datadog, or OpenTelemetry
 * without requiring direct external package dependencies.
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
  captureException(error: Error, context?: ErrorContext): void;
  captureMessage(
    message: string,
    level?: "info" | "warn" | "error",
    context?: ErrorContext
  ): void;
}

class DefaultConsoleErrorReporter implements ErrorReporter {
  captureException(error: Error, context?: ErrorContext): void {
    const prefix = context?.sectionName
      ? `ErrorReporting:${context.sectionName}`
      : "ErrorReporting";

    logger.error(prefix, error.message, {
      name: error.name,
      stack: error.stack,
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

    if (level === "error") {
      logger.error(prefix, message, context);
    } else if (level === "warn") {
      logger.warn(prefix, message, context);
    } else {
      logger.info(prefix, message, context);
    }
  }
}

let activeReporter: ErrorReporter = new DefaultConsoleErrorReporter();

/**
 * Configure a custom error reporting adapter (e.g. Sentry / OpenTelemetry).
 */
export function setErrorReporter(reporter: ErrorReporter): void {
  activeReporter = reporter;
}

/**
 * Report an unhandled exception or caught error through the active error adapter.
 */
export function reportError(error: Error, context?: ErrorContext): void {
  try {
    activeReporter.captureException(error, {
      url: typeof window !== "undefined" ? window.location.href : undefined,
      ...context,
    });
  } catch (reporterErr) {
    console.error("[ErrorReporting] Failed to report error:", reporterErr);
  }
}

/**
 * Report an operational message or diagnostic log event.
 */
export function reportMessage(
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
    console.error("[ErrorReporting] Failed to report message:", reporterErr);
  }
}
