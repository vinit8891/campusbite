import { describe, it, expect } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { AuthProvider } from "@/context/AuthContext";
import { useCustomerSubscriptions } from "@/hooks/subscriptions/useCustomerSubscriptions";

describe("useCustomerSubscriptions hook", () => {
  it("fetches active subscriptions, summary, and payments", async () => {
    const { result } = renderHook(() => useCustomerSubscriptions(), {
      wrapper: AuthProvider,
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.items.length).toBe(1);
    expect(result.current.items[0].meal_type).toBe("Lunch");
    expect(result.current.summary).toBeDefined();
    expect(result.current.error).toBe("");
  });
});
