import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import { BatchWindowCountdown } from "@/components/checkout/BatchWindowCountdown";
import * as batchWindowsModule from "@/lib/batchWindows";

describe("BatchWindowCountdown Component", () => {
  it("renders live countdown banner with exact hostelBlock, deliveryWindow, and minutes remaining", () => {
    vi.spyOn(batchWindowsModule, "getNextBatchWindow").mockReturnValue({
      slotId: "LUNCH_WAVE_1",
      label: "Lunch Wave 1",
      cutoffTime: new Date(),
      deliveryWindow: "12:45 PM – 1:15 PM",
      minutesRemaining: 18,
      isRolling: false,
      scheduledWave: "Lunch Wave 1 (12:45 PM – 1:15 PM)",
    });

    render(
      <BatchWindowCountdown
        hostelBlock="Block A (Girls Wing)"
        deliveryMode="HOSTEL_BATCH"
      />
    );

    expect(screen.getByTestId("batch-window-countdown")).toBeInTheDocument();
    expect(
      screen.getByText(
        /🚚 Next Batch to Block A \(Girls Wing\): 12:45 PM – 1:15 PM • Ordering closes in 18 mins/i
      )
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /Grouped lobby drop — keeps your delivery fee at ₹15 flat\./i
      )
    ).toBeInTheDocument();
    expect(screen.getByText(/₹15 Flat Fee/i)).toBeInTheDocument();
  });

  it("falls back to 'Hostel Lobby' when hostelBlock is not provided", () => {
    vi.spyOn(batchWindowsModule, "getNextBatchWindow").mockReturnValue({
      slotId: "DINNER_WAVE_1",
      label: "Dinner Wave 1",
      cutoffTime: new Date(),
      deliveryWindow: "8:00 PM – 8:30 PM",
      minutesRemaining: 42,
      isRolling: false,
      scheduledWave: "Dinner Wave 1 (8:00 PM – 8:30 PM)",
    });

    render(
      <BatchWindowCountdown
        hostelBlock={null}
        deliveryMode="HOSTEL_BATCH"
      />
    );

    expect(
      screen.getByText(
        /🚚 Next Batch to Hostel Lobby: 8:00 PM – 8:30 PM • Ordering closes in 42 mins/i
      )
    ).toBeInTheDocument();
  });

  it("renders nothing when delivery mode is not batch (e.g. COUNTER_TAKEAWAY or EXPRESS_DOOR)", () => {
    const { container: c1 } = render(
      <BatchWindowCountdown
        hostelBlock="Block B"
        deliveryMode="COUNTER_TAKEAWAY"
      />
    );
    expect(c1.firstChild).toBeNull();

    const { container: c2 } = render(
      <BatchWindowCountdown
        hostelBlock="Block B"
        deliveryMode="EXPRESS_DOOR"
      />
    );
    expect(c2.firstChild).toBeNull();
  });

  it("triggers onWindowChange callback on mount", () => {
    const mockWindow = {
      slotId: "SNACKS_WAVE_1",
      label: "Evening Snacks Wave",
      cutoffTime: new Date(),
      deliveryWindow: "5:15 PM – 5:45 PM",
      minutesRemaining: 20,
      isRolling: false,
      scheduledWave: "Evening Snacks Wave (5:15 PM – 5:45 PM)",
    };
    vi.spyOn(batchWindowsModule, "getNextBatchWindow").mockReturnValue(mockWindow);

    const onWindowChange = vi.fn();
    render(
      <BatchWindowCountdown
        hostelBlock="Block C"
        deliveryMode="HOSTEL_BATCH"
        onWindowChange={onWindowChange}
      />
    );

    expect(onWindowChange).toHaveBeenCalledWith(mockWindow);
  });
});
