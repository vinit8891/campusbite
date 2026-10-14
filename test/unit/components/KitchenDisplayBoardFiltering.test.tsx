import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { KitchenDisplayBoard } from "@/components/restaurant/KitchenDisplayBoard";
import type { Order } from "@/types";

describe("KitchenDisplayBoard order filtering", () => {
  const mockOrders: Order[] = [
    // 1. Valid COD Pending -> Should be in New Orders
    {
      _id: "order-cod-new",
      customer_name: "Rahul Student",
      status: "Pending",
      payment_method: "cod",
      payment_status: "pending",
      total: 150,
      items: [{ id: "1", name: "Veg Pulao", price: 150, quantity: 1 }],
      created_at: new Date().toISOString(),
    },
    // 2. Valid Online Paid Pending -> Should be in New Orders
    {
      _id: "order-online-paid-new",
      customer_name: "Pooja Online",
      status: "Pending",
      payment_method: "online",
      payment_status: "paid",
      total: 200,
      items: [{ id: "2", name: "Paneer Butter Masala", price: 200, quantity: 1 }],
      created_at: new Date().toISOString(),
    },
    // 3. Unpaid Online Processing -> MUST NOT BE SHOWN
    {
      _id: "order-online-processing",
      customer_name: "Sneha Processing",
      status: "Pending",
      payment_method: "online",
      payment_status: "processing",
      total: 250,
      items: [{ id: "3", name: "Thali", price: 250, quantity: 1 }],
      created_at: new Date().toISOString(),
    },
    // 4. Online Waiting for Confirmation -> MUST NOT BE SHOWN
    {
      _id: "order-online-waiting",
      customer_name: "Vikram Waiting",
      status: "Pending",
      payment_method: "online",
      payment_status: "waiting for online payment confirmation",
      total: 180,
      items: [{ id: "4", name: "Chole Bhature", price: 180, quantity: 1 }],
      created_at: new Date().toISOString(),
    },
    // 5. Completely Excluded Cancelled Order -> MUST NOT BE SHOWN
    {
      _id: "order-cancelled",
      customer_name: "Karan Cancelled",
      status: "Cancelled",
      payment_method: "cod",
      payment_status: "pending",
      total: 120,
      items: [{ id: "5", name: "Samosa", price: 120, quantity: 1 }],
      created_at: new Date().toISOString(),
    },
    // 6. Valid Cooking Paid Order -> Should be in In Kitchen
    {
      _id: "order-cooking-paid",
      customer_name: "Aman Cooking",
      status: "Preparing",
      payment_method: "online",
      payment_status: "paid",
      total: 300,
      items: [{ id: "6", name: "Chicken Biryani", price: 300, quantity: 1 }],
      created_at: new Date().toISOString(),
    },
    // 7. Cooking Order with Unpaid Processing -> MUST NOT BE SHOWN
    {
      _id: "order-cooking-unpaid",
      customer_name: "Rohan Unpaid Cooking",
      status: "Preparing",
      payment_method: "online",
      payment_status: "processing",
      total: 220,
      items: [{ id: "7", name: "Fish Curry", price: 220, quantity: 1 }],
      created_at: new Date().toISOString(),
    },
    // 8. Ready Order with Completed Online Payment -> Should be in Ready
    {
      _id: "order-ready-paid",
      customer_name: "Divya Ready",
      status: "Ready for Pickup",
      payment_method: "online",
      payment_status: "completed",
      total: 90,
      items: [{ id: "8", name: "Cold Coffee", price: 90, quantity: 1 }],
      created_at: new Date().toISOString(),
    },
  ];

  it("only displays confirmed paid online orders and COD orders, completely excluding processing and cancelled orders", () => {
    const onUpdateStatus = vi.fn();
    render(
      <KitchenDisplayBoard
        orders={mockOrders}
        onUpdateStatus={onUpdateStatus}
      />
    );

    // Visible: Valid COD Pending & Valid Paid Online Pending
    expect(screen.getByText("Rahul Student")).toBeInTheDocument();
    expect(screen.getByText("Pooja Online")).toBeInTheDocument();

    // Visible: Valid Cooking (Preparing) Paid Order
    expect(screen.getByText("Aman Cooking")).toBeInTheDocument();

    // Visible: Valid Ready Paid Order
    expect(screen.getByText("Divya Ready")).toBeInTheDocument();

    // EXCLUDED: Unpaid online processing order
    expect(screen.queryByText("Sneha Processing")).not.toBeInTheDocument();

    // EXCLUDED: Waiting for online payment confirmation order
    expect(screen.queryByText("Vikram Waiting")).not.toBeInTheDocument();

    // EXCLUDED: Cancelled order
    expect(screen.queryByText("Karan Cancelled")).not.toBeInTheDocument();

    // EXCLUDED: Cooking order with processing payment
    expect(screen.queryByText("Rohan Unpaid Cooking")).not.toBeInTheDocument();
  });
});
