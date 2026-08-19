import { describe, it, expect } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useDeliveryOrders } from "@/hooks/delivery/useDeliveryOrders";

describe("useDeliveryOrders hook", () => {
  it("fetches active delivery orders for logged-in delivery partner", async () => {
    const { result } = renderHook(() => useDeliveryOrders());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.orders.length).toBe(1);
    expect(result.current.orders[0].customer_name).toBe("Alice");
    expect(result.current.orders[0].status).toBe("Out for Delivery");
  });
});
