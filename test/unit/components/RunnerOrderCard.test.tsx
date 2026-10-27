import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RunnerOrderCard } from "@/components/delivery/RunnerOrderCard";
import type { DeliveryOrder } from "@/types";

describe("RunnerOrderCard Component", () => {
  const baseOrder: DeliveryOrder = {
    _id: "order_654321",
    id: "order_654321",
    status: "Assigned",
    customer_name: "Rahul Sharma",
    phone: "9876543210",
    restaurant_name: "Zeal Main Canteen",
    restaurant_address: "Central Lawn, Zeal Narhe Campus",
    delivery_location: {
      building: "Boys Hostel 1 Gate",
      room: "Room 304, Wing B",
    },
    address: "Boys Hostel 1 Gate",
    latitude: 18.4482,
    longitude: 73.8265,
    payment_method: "cod",
    total_amount: 180,
    total: 180,
    is_primary_batch_order: true,
    scheduled_wave: "Lunch Wave 1 (12:45 PM – 1:15 PM)",
    items: [
      { id: "1", name: "Veg Biryani", quantity: 1, price: 120 },
      { id: "2", name: "Cold Drink", quantity: 1, price: 60 },
    ],
  };

  it("renders Google Maps navigation link with correct coordinates", () => {
    render(<RunnerOrderCard order={baseOrder} index={0} />);

    const navLink = screen.getByRole("link", { name: /Navigate to Boys Hostel 1 Gate in Google Maps/i });
    expect(navLink).toBeInTheDocument();
    expect(navLink).toHaveAttribute(
      "href",
      "https://www.google.com/maps/dir/?api=1&destination=18.4482,73.8265"
    );
  });

  it("displays Base Guaranteed Run Fee (₹20.00) for primary batch drop", () => {
    render(<RunnerOrderCard order={baseOrder} index={0} />);

    expect(screen.getByText("₹20.00")).toBeInTheDocument();
    expect(screen.getByText("Base Guaranteed Run Fee")).toBeInTheDocument();
    expect(screen.getByText("Lunch Wave 1 (12:45 PM – 1:15 PM)")).toBeInTheDocument();
  });

  it("displays Batch Add-on Drop (+₹14.00) for secondary batch drop", () => {
    const addonOrder: DeliveryOrder = {
      ...baseOrder,
      _id: "order_654322",
      is_primary_batch_order: false,
      is_batch_addon: true,
      courier_earning: 14.0,
    };

    render(<RunnerOrderCard order={addonOrder} index={1} />);

    expect(screen.getByText("₹14.00")).toBeInTheDocument();
    expect(screen.getByText("Batch Add-on Drop (+₹14.00)")).toBeInTheDocument();
  });

  it("handles status transitions when actions are clicked", async () => {
    const user = userEvent.setup();
    const mockUpdateStatus = vi.fn();
    const mockConfirmPickup = vi.fn();

    render(
      <RunnerOrderCard
        order={baseOrder}
        onUpdateStatus={mockUpdateStatus}
        onConfirmPickup={mockConfirmPickup}
      />
    );

    const pickupBtn = screen.getByRole("button", { name: /Confirm Pickup from Canteen/i });
    await user.click(pickupBtn);

    expect(mockConfirmPickup).toHaveBeenCalledWith("order_654321");
  });
});
