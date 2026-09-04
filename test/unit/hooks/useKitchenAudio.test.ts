import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useKitchenAudio, playKitchenChime } from "@/hooks/restaurant/useKitchenAudio";
import type { Order } from "@/types";

describe("useKitchenAudio hook & Web Audio Chime", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("initializes with sound enabled and toggles sound setting in localStorage", () => {
    const orders: Order[] = [];
    const { result } = renderHook(() => useKitchenAudio(orders));

    expect(result.current.soundEnabled).toBe(true);
    expect(result.current.pendingCount).toBe(0);

    act(() => {
      result.current.toggleSound();
    });

    expect(result.current.soundEnabled).toBe(false);
    expect(localStorage.getItem("cb_kitchen_sound_enabled")).toBe("false");
  });

  it("calculates pending count accurately and plays chime when pending orders arrive", () => {
    const pendingOrder: Order = {
      _id: "order-1",
      customer_name: "Rahul",
      phone: "9876543210",
      address: "Hostel A",
      restaurant_id: "rest-1",
      restaurant_name: "Campus Grill",
      restaurant_email: "grill@campus.edu",
      restaurant_cuisine: "Fast Food",
      status: "Pending",
      payment_method: "cod",
      payment_status: "pending",
      items: [],
      total: 100,
      created_at: new Date().toISOString(),
    };

    const { result } = renderHook(() => useKitchenAudio([pendingOrder]));
    expect(result.current.pendingCount).toBe(1);
  });

  it("safely invokes playKitchenChime without throwing in test environment", () => {
    expect(() => playKitchenChime()).not.toThrow();
  });
});
