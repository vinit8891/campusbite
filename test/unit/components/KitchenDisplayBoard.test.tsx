import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { KitchenDisplayBoard } from "@/components/restaurant/KitchenDisplayBoard";
import { OrderPrepTimer } from "@/components/restaurant/OrderPrepTimer";
import { KitchenAudioAlert } from "@/components/restaurant/KitchenAudioAlert";
import type { Order } from "@/types";

const mockOrders: Order[] = [
  {
    _id: "order-pending-1",
    customer_name: "Rahul Sharma",
    phone: "9876543210",
    address: "Hostel Block A, Rm 304",
    restaurant_id: "rest-1",
    restaurant_name: "Campus Grill",
    restaurant_email: "grill@campus.edu",
    restaurant_cuisine: "North Indian",
    status: "Pending",
    delivery_type: "HOSTEL_BATCH",
    hostel_block: "Hostel Block A",
    payment_method: "cod",
    payment_status: "pending",
    items: [
      { id: "item-1", name: "Paneer Butter Masala", price: 180, quantity: 1 },
      { id: "item-2", name: "Butter Naan", price: 40, quantity: 2 },
    ],
    total: 260,
    created_at: new Date(Date.now() - 60 * 1000).toISOString(), // 1 minute ago
  },
  {
    _id: "order-prep-2",
    customer_name: "Ananya Desai",
    phone: "9123456780",
    address: "Hostel Block C, Rm 102",
    restaurant_id: "rest-1",
    restaurant_name: "Campus Grill",
    restaurant_email: "grill@campus.edu",
    restaurant_cuisine: "North Indian",
    status: "Preparing",
    delivery_type: "STANDARD",
    hostel_block: "Hostel Block C",
    payment_method: "online",
    payment_status: "paid",
    items: [{ id: "item-3", name: "Veg Biryani", price: 160, quantity: 2 }],
    total: 320,
    created_at: new Date(Date.now() - 6 * 60 * 1000).toISOString(), // 6 minutes ago
  },
  {
    _id: "order-ready-3",
    customer_name: "Om Roy",
    phone: "9988776655",
    address: "Central Library Desk 14",
    restaurant_id: "rest-1",
    restaurant_name: "Campus Grill",
    restaurant_email: "grill@campus.edu",
    restaurant_cuisine: "North Indian",
    status: "Ready for Pickup",
    delivery_type: "HOSTEL_BATCH",
    hostel_block: "Central Library",
    payment_method: "online",
    payment_status: "paid",
    items: [{ id: "item-4", name: "Cold Coffee", price: 70, quantity: 1 }],
    total: 70,
    created_at: new Date(Date.now() - 14 * 60 * 1000).toISOString(), // 14 minutes ago
  },
];

describe("KitchenDisplayBoard & Kitchen Audio System", () => {
  it("renders 3 KDS Kanban columns with correct order distribution", () => {
    const handleUpdate = vi.fn();
    render(
      <KitchenDisplayBoard orders={mockOrders} onUpdateStatus={handleUpdate} />
    );

    // Column headers
    expect(screen.getByText("New Orders")).toBeInTheDocument();
    expect(screen.getByText("In Kitchen")).toBeInTheDocument();
    expect(screen.getByText("Ready for Pickup")).toBeInTheDocument();

    // Pending Order in Column 1
    expect(screen.getByText("Rahul Sharma")).toBeInTheDocument();
    expect(screen.getByText("Paneer Butter Masala")).toBeInTheDocument();
    expect(screen.getByText("Butter Naan")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /accept order/i })).toBeInTheDocument();

    // Preparing Order in Column 2
    expect(screen.getByText("Ananya Desai")).toBeInTheDocument();
    expect(screen.getByText("Veg Biryani")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /mark ready for pickup/i })
    ).toBeInTheDocument();

    // Ready Order in Column 3
    expect(screen.getByText("Om Roy")).toBeInTheDocument();
    expect(screen.getByText("Cold Coffee × 1")).toBeInTheDocument();
  });

  it("triggers status update callbacks when kitchen action buttons are clicked", async () => {
    const handleUpdate = vi.fn();
    const user = userEvent.setup();

    render(
      <KitchenDisplayBoard orders={mockOrders} onUpdateStatus={handleUpdate} />
    );

    // Accept pending order
    const acceptBtn = screen.getByRole("button", { name: /accept order/i });
    await user.click(acceptBtn);
    expect(handleUpdate).toHaveBeenCalledWith("order-pending-1", "Accepted");

    // Mark ready for pickup
    const readyBtn = screen.getByRole("button", {
      name: /mark ready for pickup/i,
    });
    await user.click(readyBtn);
    expect(handleUpdate).toHaveBeenCalledWith("order-prep-2", "Ready for Pickup");
  });

  it("renders OrderPrepTimer color-coded states dynamically", () => {
    const { rerender } = render(
      <OrderPrepTimer
        createdAt={new Date(Date.now() - 2 * 60 * 1000).toISOString()}
        status="Pending"
      />
    );
    expect(screen.getByText(/accept in/i)).toBeInTheDocument();

    // 0-10m elapsed preparing (Green)
    rerender(
      <OrderPrepTimer
        createdAt={new Date(Date.now() - 5 * 60 * 1000).toISOString()}
        status="Preparing"
      />
    );
    expect(screen.getByText(/min left/i)).toBeInTheDocument();

    // Overdue (> 15m)
    rerender(
      <OrderPrepTimer
        createdAt={new Date(Date.now() - 20 * 60 * 1000).toISOString()}
        status="Preparing"
      />
    );
    expect(screen.getByText(/delayed by/i)).toBeInTheDocument();
  });

  it("toggles sound alert button state in KitchenAudioAlert", async () => {
    const handleToggle = vi.fn();
    const handleTest = vi.fn();
    const user = userEvent.setup();

    const { rerender } = render(
      <KitchenAudioAlert
        soundEnabled={true}
        onToggleSound={handleToggle}
        pendingCount={2}
        onTestSound={handleTest}
      />
    );

    expect(screen.getByText("Sound Alerts: ON")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();

    const toggleBtn = screen.getByRole("button", { name: /mute kitchen buzzer/i });
    await user.click(toggleBtn);
    expect(handleToggle).toHaveBeenCalled();

    rerender(
      <KitchenAudioAlert
        soundEnabled={false}
        onToggleSound={handleToggle}
        pendingCount={0}
      />
    );
    expect(screen.getByText("Sound Alerts: OFF")).toBeInTheDocument();
  });
});
