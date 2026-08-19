import { describe, it, expect } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useRestaurantOrders } from "@/hooks/restaurant/useRestaurantOrders";

describe("useRestaurantOrders hook", () => {
  it("fetches restaurant orders list", async () => {
    const { result } = renderHook(() => useRestaurantOrders());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.orders.length).toBe(1);
    expect(result.current.orders[0].status).toBe("Accepted");
  });
});
