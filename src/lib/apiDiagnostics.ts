/**
 * API Request & Response Diagnostics for development and observability.
 * Provides request timing, status tracking, and correlation IDs.
 */

import { logger } from "@/lib/logger";

export type ApiDiagnosticEvent = {
  requestId: string;
  method: string;
  url: string;
  durationMs?: number;
  status?: number;
  error?: unknown;
};

export function generateCorrelationId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `req_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function logApiStart(requestId: string, method: string, url: string): number {
  const startTime = Date.now();
  logger.debug("API:Request", `[${requestId}] ${method.toUpperCase()} ${url}`);
  return startTime;
}

export function logApiSuccess(
  requestId: string,
  method: string,
  url: string,
  status: number,
  startTime: number
): void {
  const durationMs = Date.now() - startTime;
  logger.debug(
    "API:Response",
    `[${requestId}] ${method.toUpperCase()} ${url} -> ${status} (${durationMs}ms)`
  );
}

export function logApiFailure(
  requestId: string,
  method: string,
  url: string,
  error: unknown,
  startTime: number
): void {
  const durationMs = Date.now() - startTime;
  logger.warn(
    "API:Failure",
    `[${requestId}] ${method.toUpperCase()} ${url} failed after ${durationMs}ms:`,
    error
  );
}
