import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { KitchenDisplayBoard } from "@/components/restaurant/KitchenDisplayBoard";
import { OrderPrepTimer } from "@/components/restaurant/OrderPrepTimer";
import { KitchenAudioAlert } from "@/components/restaurant/KitchenAudioAlert";
import { RestaurantOrderFilterBar } from "@/components/restaurant/RestaurantOrderFilterBar";
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
  it("renders 3 KDS Kanban columns with correct order distribution and tap-to-call links", () => {
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
    expect(
      screen.getByRole("button", { name: /accept & start cooking/i })
    ).toBeInTheDocument();

    // Tap-to-call phone link
    const phoneLink = screen.getByRole("link", { name: /9876543210/i });
    expect(phoneLink).toHaveAttribute("href", "tel:9876543210");

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

  it("supports activeMobileTab filtering for 1-thumb mobile view", () => {
    const handleUpdate = vi.fn();
    const { rerender } = render(
      <KitchenDisplayBoard
        orders={mockOrders}
        onUpdateStatus={handleUpdate}
        activeMobileTab="new"
      />
    );

    // When tab is 'new', pending order is visible
    expect(screen.getByText("Rahul Sharma")).toBeInTheDocument();

    // Switch to 'cooking' tab
    rerender(
      <KitchenDisplayBoard
        orders={mockOrders}
        onUpdateStatus={handleUpdate}
        activeMobileTab="cooking"
      />
    );
    expect(screen.getByText("Ananya Desai")).toBeInTheDocument();

    // Switch to 'ready' tab
    rerender(
      <KitchenDisplayBoard
        orders={mockOrders}
        onUpdateStatus={handleUpdate}
        activeMobileTab="ready"
      />
    );
    expect(screen.getByText("Om Roy")).toBeInTheDocument();
  });

  it("triggers status update callbacks when kitchen action buttons are clicked", async () => {
    const handleUpdate = vi.fn();
    const user = userEvent.setup();

    render(
      <KitchenDisplayBoard orders={mockOrders} onUpdateStatus={handleUpdate} />
    );

    // Accept pending order -> advances directly to Preparing
    const acceptBtn = screen.getByRole("button", {
      name: /accept & start cooking/i,
    });
    await user.click(acceptBtn);
    expect(handleUpdate).toHaveBeenCalledWith("order-pending-1", "preparing");

    // Mark ready for pickup
    const readyBtn = screen.getByRole("button", {
      name: /mark ready for pickup/i,
    });
    await user.click(readyBtn);
    expect(handleUpdate).toHaveBeenCalledWith("order-prep-2", "ready");
  });

  it("renders OrderPrepTimer color-coded states and handles flexible SLA rules and naive UTC dates", () => {
    // 1. Pending: Placed 2m ago (no delay warning)
    const { rerender } = render(
      <OrderPrepTimer
        createdAt={new Date(Date.now() - 2 * 60 * 1000).toISOString()}
        status="Pending"
      />
    );
    expect(screen.getByText(/placed 2m ago/i)).toBeInTheDocument();

    // 2. Pending: >10m elapsed shows amber warning
    rerender(
      <OrderPrepTimer
        createdAt={new Date(Date.now() - 15 * 60 * 1000).toISOString()}
        status="Pending"
      />
    );
    expect(screen.getByText(/waiting >10m/i)).toBeInTheDocument();

    // 3. Preparing: 0-25m elapsed (25m left of 30m SLA - Green)
    rerender(
      <OrderPrepTimer
        createdAt={new Date(Date.now() - 5 * 60 * 1000).toISOString()}
        status="Preparing"
      />
    );
    expect(screen.getByText(/min left/i)).toBeInTheDocument();

    // 4. Preparing: 25-30m elapsed (2m left of 30m SLA - Urgent / Amber)
    rerender(
      <OrderPrepTimer
        createdAt={new Date(Date.now() - 28 * 60 * 1000).toISOString()}
        status="Preparing"
      />
    );
    expect(screen.getByText(/min left \(urgent\)/i)).toBeInTheDocument();

    // 5. Preparing: Overdue (> 30m) shows delayed
    rerender(
      <OrderPrepTimer
        createdAt={new Date(Date.now() - 35 * 60 * 1000).toISOString()}
        status="Preparing"
      />
    );
    expect(screen.getByText(/delayed by/i)).toBeInTheDocument();

    // 6. Preparing: Old or mock date (> 60m delay)
    rerender(
      <OrderPrepTimer
        createdAt={new Date(Date.now() - 120 * 60 * 1000).toISOString()}
        status="Preparing"
      />
    );
    expect(screen.getByText(/delayed \(>60m\)/i)).toBeInTheDocument();

    // 7. Naive ISO date without 'Z' parsed safely as UTC without throwing
    rerender(
      <OrderPrepTimer
        createdAt="2026-09-05T12:00:00"
        status="Ready for Pickup"
      />
    );
    expect(screen.getByText(/ready/i)).toBeInTheDocument();
  });

  it("toggles sound alert button in standard and compact modes", async () => {
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

    // Test compact mode for mobile
    rerender(
      <KitchenAudioAlert
        soundEnabled={true}
        onToggleSound={handleToggle}
        pendingCount={3}
        compact={true}
      />
    );
    expect(screen.getByText("ON")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("renders RestaurantOrderFilterBar and expands filters on mobile toggle", async () => {
    const setQ = vi.fn();
    const onStatusChange = vi.fn();
    const onPaymentStatusChange = vi.fn();
    const onPaymentMethodChange = vi.fn();
    const onSearchSubmit = vi.fn();
    const user = userEvent.setup();

    render(
      <RestaurantOrderFilterBar
        q=""
        setQ={setQ}
        status=""
        onStatusChange={onStatusChange}
        paymentStatus=""
        onPaymentStatusChange={onPaymentStatusChange}
        paymentMethod=""
        onPaymentMethodChange={onPaymentMethodChange}
        loading={false}
        onSearchSubmit={onSearchSubmit}
      />
    );

    expect(
      screen.getByPlaceholderText(/search order id or phone/i)
    ).toBeInTheDocument();

    const filterToggleBtn = screen.getByRole("button", {
      name: /toggle advanced filters/i,
    });
    expect(filterToggleBtn).toHaveAttribute("aria-expanded", "false");

    await user.click(filterToggleBtn);
    expect(filterToggleBtn).toHaveAttribute("aria-expanded", "true");
  });

  it("strictly excludes delivered, out-for-delivery, picked-up, and cancelled orders from Cooking and Ready queues", () => {
    const handleUpdate = vi.fn();
    const mixedOrders: Order[] = [
      {
        _id: "order-del-1",
        customer_name: "Delivered Student",
        phone: "9111111111",
        address: "Hostel 1, Rm 101",
        restaurant_id: "rest-1",
        restaurant_name: "Campus Grill",
        restaurant_email: "grill@campus.edu",
        status: "Delivered",
        payment_method: "online",
        payment_status: "paid",
        items: [{ id: "i-1", name: "Thali", price: 120, quantity: 1 }],
        total: 120,
        created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      },
      {
        _id: "order-del-2",
        customer_name: "Delivered Lowercase",
        phone: "9111111112",
        address: "Hostel 1, Rm 102",
        restaurant_id: "rest-1",
        restaurant_name: "Campus Grill",
        restaurant_email: "grill@campus.edu",
        status: "delivered",
        payment_method: "online",
        payment_status: "paid",
        items: [{ id: "i-2", name: "Dosa", price: 80, quantity: 1 }],
        total: 80,
        created_at: new Date(Date.now() - 40 * 60 * 1000).toISOString(),
      },
      {
        _id: "order-ofd-1",
        customer_name: "Out For Delivery Student",
        phone: "9222222222",
        address: "Hostel 2, Rm 201",
        restaurant_id: "rest-1",
        restaurant_name: "Campus Grill",
        restaurant_email: "grill@campus.edu",
        status: "Out for Delivery",
        payment_method: "online",
        payment_status: "paid",
        items: [{ id: "i-3", name: "Burger", price: 90, quantity: 1 }],
        total: 90,
        created_at: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
      },
      {
        _id: "order-ofd-2",
        customer_name: "OFD Snake Case",
        phone: "9222222223",
        address: "Hostel 2, Rm 202",
        restaurant_id: "rest-1",
        restaurant_name: "Campus Grill",
        restaurant_email: "grill@campus.edu",
        status: "out_for_delivery",
        payment_method: "online",
        payment_status: "paid",
        items: [{ id: "i-4", name: "Pizza", price: 200, quantity: 1 }],
        total: 200,
        created_at: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
      },
      {
        _id: "order-pup-1",
        customer_name: "Picked Up Student",
        phone: "9333333333",
        address: "Hostel 3, Rm 301",
        restaurant_id: "rest-1",
        restaurant_name: "Campus Grill",
        restaurant_email: "grill@campus.edu",
        status: "Picked Up",
        payment_method: "online",
        payment_status: "paid",
        items: [{ id: "i-5", name: "Roll", price: 70, quantity: 1 }],
        total: 70,
        created_at: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
      },
      {
        _id: "order-pup-2",
        customer_name: "Picked Up Snake",
        phone: "9333333334",
        address: "Hostel 3, Rm 302",
        restaurant_id: "rest-1",
        restaurant_name: "Campus Grill",
        restaurant_email: "grill@campus.edu",
        status: "picked_up",
        payment_method: "online",
        payment_status: "paid",
        items: [{ id: "i-6", name: "Noodles", price: 110, quantity: 1 }],
        total: 110,
        created_at: new Date(Date.now() - 18 * 60 * 1000).toISOString(),
      },
      {
        _id: "order-can-1",
        customer_name: "Cancelled Student",
        phone: "9444444444",
        address: "Hostel 4, Rm 401",
        restaurant_id: "rest-1",
        restaurant_name: "Campus Grill",
        restaurant_email: "grill@campus.edu",
        status: "Cancelled",
        payment_method: "online",
        payment_status: "failed",
        items: [{ id: "i-7", name: "Shake", price: 60, quantity: 1 }],
        total: 60,
        created_at: new Date(Date.now() - 50 * 60 * 1000).toISOString(),
      },
      {
        _id: "order-act-prep",
        customer_name: "Active Cooking Chef",
        phone: "9555555555",
        address: "Hostel 5, Rm 501",
        restaurant_id: "rest-1",
        restaurant_name: "Campus Grill",
        restaurant_email: "grill@campus.edu",
        status: "cooking",
        payment_method: "online",
        payment_status: "paid",
        items: [{ id: "i-8", name: "Fried Rice", price: 130, quantity: 1 }],
        total: 130,
        created_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
      },
      {
        _id: "order-act-ready",
        customer_name: "Active Ready Eater",
        phone: "9666666666",
        address: "Hostel 6, Rm 601",
        restaurant_id: "rest-1",
        restaurant_name: "Campus Grill",
        restaurant_email: "grill@campus.edu",
        status: "ready_for_pickup",
        payment_method: "online",
        payment_status: "paid",
        items: [{ id: "i-9", name: "Sandwich", price: 75, quantity: 1 }],
        total: 75,
        created_at: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
      },
    ];

    render(
      <KitchenDisplayBoard orders={mixedOrders} onUpdateStatus={handleUpdate} />
    );

    // Active Cooking and Ready orders MUST be visible
    expect(screen.getByText("Active Cooking Chef")).toBeInTheDocument();
    expect(screen.getByText("Active Ready Eater")).toBeInTheDocument();

    // Delivered, Out for Delivery, Picked Up, and Cancelled orders must NOT be rendered in any column
    expect(screen.queryByText("Delivered Student")).not.toBeInTheDocument();
    expect(screen.queryByText("Delivered Lowercase")).not.toBeInTheDocument();
    expect(screen.queryByText("Out For Delivery Student")).not.toBeInTheDocument();
    expect(screen.queryByText("OFD Snake Case")).not.toBeInTheDocument();
    expect(screen.queryByText("Picked Up Student")).not.toBeInTheDocument();
    expect(screen.queryByText("Picked Up Snake")).not.toBeInTheDocument();
    expect(screen.queryByText("Cancelled Student")).not.toBeInTheDocument();
  });

  it("excludes stale orders (>24h) from active columns", () => {
    const handleUpdate = vi.fn();
    const staleOrders: Order[] = [
      {
        _id: "order-stale-prep",
        customer_name: "Yesterday Chef",
        phone: "9777777777",
        address: "Hostel 7, Rm 701",
        restaurant_id: "rest-1",
        restaurant_name: "Campus Grill",
        restaurant_email: "grill@campus.edu",
        status: "Preparing",
        payment_method: "online",
        payment_status: "paid",
        items: [{ id: "i-10", name: "Pasta", price: 150, quantity: 1 }],
        total: 150,
        created_at: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(), // 25 hours ago
      },
      {
        _id: "order-fresh-prep",
        customer_name: "Today Chef",
        phone: "9888888888",
        address: "Hostel 8, Rm 801",
        restaurant_id: "rest-1",
        restaurant_name: "Campus Grill",
        restaurant_email: "grill@campus.edu",
        status: "Preparing",
        payment_method: "online",
        payment_status: "paid",
        items: [{ id: "i-11", name: "Pasta Fresh", price: 150, quantity: 1 }],
        total: 150,
        created_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(), // 5 mins ago
      },
    ];

    render(
      <KitchenDisplayBoard orders={staleOrders} onUpdateStatus={handleUpdate} />
    );

    // Stale order should NOT be in the active In Kitchen column
    expect(screen.queryByText("Yesterday Chef")).not.toBeInTheDocument();
    // Fresh order MUST be in the active In Kitchen column
    expect(screen.getByText("Today Chef")).toBeInTheDocument();
  });

  it("renders a single clean status card when 0 active orders exist and allows switching to history", async () => {
    const handleUpdate = vi.fn();
    const handleSwitchToHistory = vi.fn();
    const user = userEvent.setup();

    const deliveredOnlyOrders: Order[] = [
      {
        _id: "order-past-1",
        customer_name: "Delivered Student",
        phone: "9111111111",
        address: "Hostel 1, Rm 101",
        restaurant_id: "rest-1",
        restaurant_name: "Campus Grill",
        restaurant_email: "grill@campus.edu",
        status: "Delivered",
        payment_method: "online",
        payment_status: "paid",
        items: [{ id: "i-1", name: "Thali", price: 120, quantity: 1 }],
        total: 120,
        created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      },
    ];

    render(
      <KitchenDisplayBoard
        orders={deliveredOnlyOrders}
        onUpdateStatus={handleUpdate}
        onSwitchToHistory={handleSwitchToHistory}
      />
    );

    // Should render single clean card, NOT 3 separate empty columns
    expect(screen.getByText("Kitchen is all caught up!")).toBeInTheDocument();
    expect(
      screen.getByText(/New student orders will alert you here as soon as they are placed/i)
    ).toBeInTheDocument();

    const viewHistoryBtn = screen.getByRole("button", {
      name: /view all past orders/i,
    });
    expect(viewHistoryBtn).toBeInTheDocument();
    expect(viewHistoryBtn).toHaveTextContent("1");

    await user.click(viewHistoryBtn);
    expect(handleSwitchToHistory).toHaveBeenCalledTimes(1);
  });
});
