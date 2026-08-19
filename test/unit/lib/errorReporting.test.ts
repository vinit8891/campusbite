import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  reportError,
  reportMessage,
  setErrorReporter,
  type ErrorReporter,
} from "@/lib/errorReporting";

describe("ErrorReporting Adapter Layer", () => {
  let mockReporter: ErrorReporter;

  beforeEach(() => {
    mockReporter = {
      captureException: vi.fn(),
      captureMessage: vi.fn(),
    };
    setErrorReporter(mockReporter);
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

  it("captures informational messages with level and metadata", () => {
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
  });
});
