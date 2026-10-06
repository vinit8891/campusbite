import { describe, it, expect } from "vitest";
import {
  CAMPUS_WAVE_SLOTS,
  getNextBatchWindow,
  getAllCampusWaveSlots,
  getIstDateComponents,
  createIstDate,
} from "@/lib/batchWindows";

describe("Canonical Batch Window Utility & Rules (batchWindows.ts)", () => {
  it("defines all 6 canonical campus delivery wave slots", () => {
    const slots = getAllCampusWaveSlots();
    expect(slots).toHaveLength(6);

    const slotIds = slots.map((s) => s.slotId);
    expect(slotIds).toEqual([
      "LUNCH_WAVE_1",
      "LUNCH_WAVE_2",
      "SNACKS_WAVE_1",
      "DINNER_WAVE_1",
      "DINNER_WAVE_2",
      "DINNER_WAVE_3",
    ]);

    // Cutoff time must be strictly 15 minutes before the wave starts
    slots.forEach((slot) => {
      const startMins = slot.startHour * 60 + slot.startMinute;
      const cutoffMins = slot.cutoffHour * 60 + slot.cutoffMinute;
      expect(startMins - cutoffMins).toBe(15);
    });
  });

  it("selects Lunch Wave 1 when order is placed at 12:00 PM IST (before 12:30 PM cutoff)", () => {
    // 12:00 PM IST on Oct 6, 2026
    const currentTime = createIstDate(2026, 9, 6, 12, 0);
    const window = getNextBatchWindow(currentTime);

    expect(window.slotId).toBe("LUNCH_WAVE_1");
    expect(window.deliveryWindow).toBe("12:45 PM – 1:15 PM");
    expect(window.minutesRemaining).toBe(30);
    expect(window.isRolling).toBe(false);
  });

  it("selects Lunch Wave 2 when order is placed at 12:35 PM IST (after Wave 1 cutoff, before 1:00 PM cutoff)", () => {
    const currentTime = createIstDate(2026, 9, 6, 12, 35);
    const window = getNextBatchWindow(currentTime);

    expect(window.slotId).toBe("LUNCH_WAVE_2");
    expect(window.deliveryWindow).toBe("1:15 PM – 1:45 PM");
    expect(window.minutesRemaining).toBe(25);
  });

  it("selects Evening Snacks Wave when order is placed at 4:30 PM IST (before 5:00 PM cutoff)", () => {
    const currentTime = createIstDate(2026, 9, 6, 16, 30);
    const window = getNextBatchWindow(currentTime);

    expect(window.slotId).toBe("SNACKS_WAVE_1");
    expect(window.deliveryWindow).toBe("5:15 PM – 5:45 PM");
    expect(window.minutesRemaining).toBe(30);
  });

  it("selects Dinner Wave 1 when order is placed at 7:00 PM IST (before 7:45 PM cutoff)", () => {
    const currentTime = createIstDate(2026, 9, 6, 19, 0);
    const window = getNextBatchWindow(currentTime);

    expect(window.slotId).toBe("DINNER_WAVE_1");
    expect(window.deliveryWindow).toBe("8:00 PM – 8:30 PM");
    expect(window.minutesRemaining).toBe(45);
  });

  it("selects Dinner Wave 2 when order is placed at 8:00 PM IST (after Wave 1 cutoff, before 8:30 PM cutoff)", () => {
    const currentTime = createIstDate(2026, 9, 6, 20, 0);
    const window = getNextBatchWindow(currentTime);

    expect(window.slotId).toBe("DINNER_WAVE_2");
    expect(window.deliveryWindow).toBe("8:45 PM – 9:15 PM");
    expect(window.minutesRemaining).toBe(30);
  });

  it("selects Dinner Wave 3 when order is placed at 8:50 PM IST (before 9:15 PM cutoff)", () => {
    const currentTime = createIstDate(2026, 9, 6, 20, 50);
    const window = getNextBatchWindow(currentTime);

    expect(window.slotId).toBe("DINNER_WAVE_3");
    expect(window.deliveryWindow).toBe("9:30 PM – 10:00 PM");
    expect(window.minutesRemaining).toBe(25);
  });

  it("assigns tomorrow's first wave when order is placed late night at 10:30 PM IST (after 10:00 PM)", () => {
    const currentTime = createIstDate(2026, 9, 6, 22, 30);
    const window = getNextBatchWindow(currentTime);

    expect(window.slotId).toBe("LUNCH_WAVE_1");
    expect(window.label).toContain("Tomorrow");
    expect(window.deliveryWindow).toContain("Tomorrow 12:45 PM – 1:15 PM");
    expect(window.minutesRemaining).toBeGreaterThan(60);
  });

  it("assigns tomorrow's first wave when order is placed in the early morning at 3:00 AM IST", () => {
    const currentTime = createIstDate(2026, 9, 6, 3, 0);
    const window = getNextBatchWindow(currentTime);

    expect(window.slotId).toBe("LUNCH_WAVE_1");
    expect(window.deliveryWindow).toContain("12:45 PM – 1:15 PM");
  });

  it("accurately converts UTC dates to IST date components via getIstDateComponents", () => {
    // 12:00 PM IST is 06:30 AM UTC
    const date = new Date(Date.UTC(2026, 9, 6, 6, 30, 0));
    const ist = getIstDateComponents(date);

    expect(ist.hours).toBe(12);
    expect(ist.minutes).toBe(0);
    expect(ist.totalMinutes).toBe(720);
  });
});
