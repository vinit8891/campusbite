import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AdminOrderDetailsModal } from "@/components/admin/AdminOrderDetailsModal";
import type { AdminOrder } from "@/services/adminService";

describe("AdminOrderDetailsModal Component", () => {
  const mockDeliveryOrder: AdminOrder = {
    _id: "660c11111111111111111111",
    customer_name: "Sneha Reddy",
    customer_email: "sneha@campus.edu",
    phone: "9876543210",
    restaurant_name: "Hostel 4 Canteen",
    restaurant_email: "h4canteen@campusbite.in",
    status: "Delivered",
    payment_method: "online",
    payment_status: "paid",
    food_subtotal: 45.0,
    small_order_fee: 5.0,
    restaurant_gst: 2.25,
    delivery_fee: 15.0,
    platform_fee: 3.0,
    total: 70.25,
    delivery_type: "DELIVERY",
    created_at: "2026-09-05T12:00:00Z",
    items: [
      { id: "item-1", name: "Maggi Noodles", price: 45.0, quantity: 1 },
    ],
  };

  const mockTakeawayOrder: AdminOrder = {
    _id: "660c22222222222222222222",
    customer_name: "Karan Johar",
    customer_email: "karan@campus.edu",
    phone: "9876500000",
    restaurant_name: "Night Mess",
    restaurant_email: "nightmess@campusbite.in",
    status: "Ready for Pickup",
    payment_method: "cod",
    payment_status: "pending",
    food_subtotal: 25.0,
    small_order_fee: 0.0,
    restaurant_gst: 1.25,
    delivery_fee: 0.0,
    platform_fee: 3.0,
    total: 29.25,
    order_type: "TAKEAWAY",
    created_at: "2026-09-05T12:30:00Z",
    items: [
      { id: "item-2", name: "Cutting Chai", price: 25.0, quantity: 1 },
    ],
  };

  it("renders order manifest, fulfillment badge, and small order surcharge line item", () => {
    const handleClose = vi.fn();
    render(
      <AdminOrderDetailsModal
        isOpen={true}
        order={mockDeliveryOrder}
        onClose={handleClose}
      />
    );

    expect(screen.getByText("Sneha Reddy")).toBeInTheDocument();
    expect(screen.getByText("Hostel 4 Canteen")).toBeInTheDocument();
    expect(screen.getByTestId("fulfillment-badge")).toHaveTextContent("DELIVERY");

    // Items
    expect(screen.getByText("Maggi Noodles")).toBeInTheDocument();
    expect(screen.getAllByText("₹45.00").length).toBeGreaterThan(0);

    // Surcharge Breakdown row
    expect(screen.getByTestId("small-order-breakdown-row")).toBeInTheDocument();
    expect(
      screen.getByText("⚡ Small Order Surcharge (under ₹50)")
    ).toBeInTheDocument();
    expect(screen.getByText("+₹5.00")).toBeInTheDocument();
    expect(screen.getByText("₹70.25")).toBeInTheDocument();
  });

  it("renders Takeaway Exemption badge for takeaway orders with subtotal < ₹35", () => {
    render(
      <AdminOrderDetailsModal
        isOpen={true}
        order={mockTakeawayOrder}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByTestId("fulfillment-badge")).toHaveTextContent("TAKEAWAY");
    const exemptionBadge = screen.getByTestId("takeaway-exemption-badge");
    expect(exemptionBadge).toBeInTheDocument();
    expect(
      screen.getByText("Takeaway Exemption (<₹35 Subtotal Allowed)")
    ).toBeInTheDocument();
    expect(screen.queryByTestId("small-order-breakdown-row")).not.toBeInTheDocument();
  });

  it("calls onClose when close button or escape key is pressed", () => {
    const handleClose = vi.fn();
    render(
      <AdminOrderDetailsModal
        isOpen={true}
        order={mockDeliveryOrder}
        onClose={handleClose}
      />
    );

    const closeBtn = screen.getByRole("button", { name: "Close modal" });
    fireEvent.click(closeBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(window, { key: "Escape" });
    expect(handleClose).toHaveBeenCalledTimes(2);
  });

  it("returns null when isOpen is false", () => {
    const { container } = render(
      <AdminOrderDetailsModal
        isOpen={false}
        order={mockDeliveryOrder}
        onClose={vi.fn()}
      />
    );
    expect(container.firstChild).toBeNull();
  });
});
