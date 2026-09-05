import { describe, it, expect, vi } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
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

  it("optimistically updates order status and dispatches delivery_state_changed event", async () => {
    const dispatchSpy = vi.spyOn(window, "dispatchEvent");
    const { result } = renderHook(() => useDeliveryOrders());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.orders[0].status).toBe("Out for Delivery");

    await act(async () => {
      await result.current.updateStatus("del-ord-1", "Picked Up");
    });

    expect(dispatchSpy).toHaveBeenCalledWith(
      expect.objectContaining({ type: "delivery_state_changed" })
    );

    dispatchSpy.mockRestore();
  });
});
