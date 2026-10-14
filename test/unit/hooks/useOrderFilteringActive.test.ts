import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useOrderFiltering } from "@/hooks/orders/useOrderFiltering";
import type { Order } from "@/types/orders";

describe("useOrderFiltering active orders filtering", () => {
  const mockOrders: Order[] = [
    {
      _id: "ord-active-cod",
      restaurant_name: "Campus Diner",
      status: "Accepted",
      payment_method: "cod",
      payment_status: "pending",
      total: 180,
      items: [{ id: "1", name: "Veg Roll", price: 90, quantity: 2 }],
      created_at: new Date().toISOString(),
    },
    {
      _id: "ord-active-online-paid",
      restaurant_name: "Zeal Canteen",
      status: "Preparing",
      payment_method: "online",
      payment_status: "paid",
      total: 220,
      items: [{ id: "2", name: "Dosa", price: 110, quantity: 2 }],
      created_at: new Date().toISOString(),
    },
    {
      _id: "ord-unpaid-online-processing",
      restaurant_name: "Campus Diner",
      status: "Pending",
      payment_method: "online",
      payment_status: "processing",
      total: 150,
      items: [{ id: "3", name: "Fried Rice", price: 150, quantity: 1 }],
      created_at: new Date().toISOString(),
    },
    {
      _id: "ord-cancelled",
      restaurant_name: "Campus Grill",
      status: "Cancelled",
      payment_method: "cod",
      payment_status: "pending",
      total: 100,
      items: [{ id: "4", name: "Cold Drink", price: 50, quantity: 2 }],
      created_at: new Date().toISOString(),
    },
    {
      _id: "ord-delivered",
      restaurant_name: "Campus Diner",
      status: "Delivered",
      payment_method: "online",
      payment_status: "paid",
      total: 300,
      items: [{ id: "5", name: "Pizza", price: 300, quantity: 1 }],
      created_at: new Date(Date.now() - 3600000).toISOString(),
    },
  ];

  it("calculates activeOrdersCount excluding unpaid processing online orders and cancelled orders", () => {
    const { result } = renderHook(() => useOrderFiltering(mockOrders));

    // Only 2 active orders: ord-active-cod and ord-active-online-paid
    // (ord-unpaid-online-processing is excluded, ord-cancelled is excluded, ord-delivered is delivered)
    expect(result.current.activeOrdersCount).toBe(2);
    expect(result.current.hasActiveOrders).toBe(true);
    expect(result.current.deliveredOrdersCount).toBe(1);
    expect(result.current.cancelledOrdersCount).toBe(1);
  });

  it("filters out unpaid processing online orders and cancelled orders when Active filter is selected", () => {
    const { result } = renderHook(() => useOrderFiltering(mockOrders));

    act(() => {
      result.current.setFilter("Active");
    });

    expect(result.current.filteredOrders.length).toBe(2);
    const orderIds = result.current.filteredOrders.map((o) => o._id);
    expect(orderIds).toContain("ord-active-cod");
    expect(orderIds).toContain("ord-active-online-paid");
    expect(orderIds).not.toContain("ord-unpaid-online-processing");
    expect(orderIds).not.toContain("ord-cancelled");
    expect(orderIds).not.toContain("ord-delivered");
  });

  it("displays cancelled orders when Cancelled filter is selected", () => {
    const { result } = renderHook(() => useOrderFiltering(mockOrders));

    act(() => {
      result.current.setFilter("Cancelled");
    });

    expect(result.current.filteredOrders.length).toBe(1);
    expect(result.current.filteredOrders[0]._id).toBe("ord-cancelled");
  });
});
