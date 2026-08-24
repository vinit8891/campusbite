import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  captureException,
  captureMessage,
  reportError,
  reportMessage,
  setErrorReporter,
  SentryErrorReporter,
  type ErrorReporter,
} from "@/lib/errorReporting";
import { logger } from "@/lib/logger";

describe("ErrorReporting Adapter Layer", () => {
  let mockReporter: ErrorReporter;

  beforeEach(() => {
    mockReporter = {
      captureException: vi.fn(),
      captureMessage: vi.fn(),
    };
    setErrorReporter(mockReporter);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("captures exception and forwards to active reporter", () => {
    const error = new Error("Network timeout 504");
    reportError(error, { sectionName: "Checkout" });

    expect(mockReporter.captureException).toHaveBeenCalledWith(
      error,
      expect.objectContaining({
        sectionName: "Checkout",
      })
    );
  });

  it("supports direct captureException alias", () => {
    const err = new Error("Payment Gateway unreachable");
    captureException(err, { userId: "usr_123" });

    expect(mockReporter.captureException).toHaveBeenCalledWith(
      err,
      expect.objectContaining({
        userId: "usr_123",
      })
    );
  });

  it("captures informational and warning messages with level and metadata", () => {
    reportMessage("Order placed successfully", "info", {
      metadata: { orderId: "ord-123" },
    });

    expect(mockReporter.captureMessage).toHaveBeenCalledWith(
      "Order placed successfully",
      "info",
      expect.objectContaining({
        metadata: { orderId: "ord-123" },
      })
    );

    captureMessage("Low inventory warning", "warn", {
      metadata: { itemId: "item-456" },
    });

    expect(mockReporter.captureMessage).toHaveBeenCalledWith(
      "Low inventory warning",
      "warn",
      expect.objectContaining({
        metadata: { itemId: "item-456" },
      })
    );
  });

  it("SentryErrorReporter routes to window.Sentry when globally present", () => {
    const mockSentryCapture = vi.fn();
    const mockSentryMsg = vi.fn();
    (window as any).Sentry = {
      captureException: mockSentryCapture,
      captureMessage: mockSentryMsg,
    };

    const sentryReporter = new SentryErrorReporter("https://key@sentry.io/123");
    const testErr = new Error("Component render fault");
    sentryReporter.captureException(testErr, { sectionName: "Cart" });

    expect(mockSentryCapture).toHaveBeenCalledWith(
      testErr,
      expect.objectContaining({
        extra: expect.objectContaining({ sectionName: "Cart" }),
      })
    );

    sentryReporter.captureMessage("Test Sentry log", "error", { userId: "user-99" });
    expect(mockSentryMsg).toHaveBeenCalledWith(
      "Test Sentry log",
      expect.objectContaining({
        level: "error",
        extra: expect.objectContaining({ userId: "user-99" }),
      })
    );

    delete (window as any).Sentry;
  });

  it("SentryErrorReporter logs structured JSON diagnostics when window.Sentry is absent", () => {
    delete (window as any).Sentry;
    const loggerSpy = vi.spyOn(logger, "error").mockImplementation(() => {});
    const sentryReporter = new SentryErrorReporter("");

    const err = new Error("DB connection timeout");
    sentryReporter.captureException(err, { sectionName: "Database" });

    expect(loggerSpy).toHaveBeenCalledWith(
      "ErrorReporting:Database",
      "DB connection timeout",
      expect.objectContaining({
        name: "Error",
        dsn_configured: false,
        sectionName: "Database",
      })
    );
  });
});
