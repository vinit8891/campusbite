import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { RestaurantOrderCardList } from "@/components/restaurant/RestaurantOrderCardList";
import { RestaurantOrderTableView } from "@/components/restaurant/RestaurantOrderTableView";
import type { Order } from "@/types";

const mockHistoryOrders: Order[] = [
  {
    _id: "order-del-101",
    customer_name: "Aarav Sharma",
    phone: "9876543210",
    address: "Hostel Block B, Room 204",
    restaurant_id: "rest-1",
    restaurant_name: "Campus Diner",
    restaurant_email: "diner@campus.edu",
    status: "Delivered",
    hostel_block: "Hostel Block B",
    payment_method: "cod",
    payment_status: "paid",
    items: [
      { id: "item-1", name: "Veg Thali", price: 120, quantity: 1 },
      { id: "item-2", name: "Butter Naan", price: 30, quantity: 2 },
    ],
    total: 180,
    created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
  },
  {
    _id: "order-can-102",
    customer_name: "Priya Patel",
    phone: "9123456780",
    address: "Girls Hostel 1, Room 101",
    restaurant_id: "rest-1",
    restaurant_name: "Campus Diner",
    restaurant_email: "diner@campus.edu",
    status: "Cancelled",
    hostel_block: "GH-1",
    payment_method: "online",
    payment_status: "failed",
    items: [{ id: "item-3", name: "Cold Coffee", price: 70, quantity: 1 }],
    total: 70,
    created_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(), // 3 hours ago
  },
  {
    _id: "order-arch-103",
    customer_name: "Vikram Mehta",
    phone: "9988776655",
    address: "Faculty Quarters, Flat 4A",
    restaurant_id: "rest-1",
    restaurant_name: "Campus Diner",
    restaurant_email: "diner@campus.edu",
    status: "Preparing", // Older than 24h -> Stale/Archived
    payment_method: "online",
    payment_status: "paid",
    items: [{ id: "item-4", name: "Paneer Roll", price: 90, quantity: 1 }],
    total: 90,
    created_at: new Date(Date.now() - 30 * 60 * 60 * 1000).toISOString(), // 30 hours ago
  },
];

describe("RestaurantOrderCardList in History Mode", () => {
  it("renders high-contrast mobile order cards with prominent status pills", () => {
    const handleUpdate = vi.fn();
    render(
      <RestaurantOrderCardList
        isHistoryView={true}
        orders={mockHistoryOrders}
        onUpdateStatus={handleUpdate}
      />
    );

    // Order 1: Delivered
    const deliveredPill = screen.getByText("Delivered");
    expect(deliveredPill).toBeInTheDocument();
    expect(deliveredPill.className).toContain("bg-emerald-50 text-emerald-800 border-emerald-200");

    expect(screen.getByText("Aarav Sharma")).toBeInTheDocument();
    const phoneLink1 = screen.getByRole("link", { name: /9876543210/i });
    expect(phoneLink1).toHaveAttribute("href", "tel:9876543210");
    expect(screen.getByText(/Room 204/i)).toBeInTheDocument();
    expect(screen.getAllByText("1×").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Veg Thali")).toBeInTheDocument();
    expect(screen.getByText("2×")).toBeInTheDocument();
    expect(screen.getByText("Butter Naan")).toBeInTheDocument();
    expect(screen.getByText("₹180.00")).toBeInTheDocument();

    // Order 2: Cancelled
    const cancelledPill = screen.getByText("Cancelled");
    expect(cancelledPill).toBeInTheDocument();
    expect(cancelledPill.className).toContain("bg-rose-50 text-rose-800 border-rose-200");
    expect(screen.getByText("Priya Patel")).toBeInTheDocument();
    const phoneLink2 = screen.getByRole("link", { name: /9123456780/i });
    expect(phoneLink2).toHaveAttribute("href", "tel:9123456780");
    expect(screen.getByText("₹70.00")).toBeInTheDocument();

    // Order 3: Archived (>24h stale)
    const archivedPill = screen.getByText("Archived");
    expect(archivedPill).toBeInTheDocument();
    expect(archivedPill.className).toContain("bg-stone-100 text-stone-700 border-stone-200");
    expect(screen.getByText("Vikram Mehta")).toBeInTheDocument();
    expect(screen.getByText("₹90.00")).toBeInTheDocument();

    // No active kitchen prep action buttons on completed/archived orders in history view
    expect(screen.queryByRole("button", { name: /accept order/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /mark ready for pickup/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /cooking/i })).not.toBeInTheDocument();
  });

  it("renders RestaurantOrderTableView with table rows for desktop view", () => {
    const handleUpdate = vi.fn();
    render(
      <RestaurantOrderTableView
        orders={mockHistoryOrders}
        onUpdateStatus={handleUpdate}
      />
    );

    expect(screen.getByText("Aarav Sharma")).toBeInTheDocument();
    expect(screen.getByText("Priya Patel")).toBeInTheDocument();
    expect(screen.getByText("Vikram Mehta")).toBeInTheDocument();
    expect(screen.getByText("₹180.00")).toBeInTheDocument();
  });
});
