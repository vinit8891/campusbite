import { describe, it, expect } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useAdminOrders } from "@/hooks/admin/useAdminOrders";

describe("useAdminOrders hook", () => {
  it("fetches admin orders with pagination metadata", async () => {
    const { result } = renderHook(() => useAdminOrders());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.orders.length).toBe(1);
    expect(result.current.orders[0]._id).toBe("admin-ord-1");
    expect(result.current.orders[0].total).toBe(500);
    expect(result.current.total).toBe(1);
  });
});
