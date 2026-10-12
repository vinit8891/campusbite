import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ActiveRunCard } from "@/components/delivery/ActiveRunCard";
import { MyDeliveryCard } from "@/components/delivery/MyDeliveryCard";
import type { DeliveryOrder } from "@/types";

describe("Courier Delivery Earning Logic: ₹20 1st Order & +₹14 Batch Add-on", () => {
  const primaryOrder: DeliveryOrder = {
    _id: "order-primary-123456",
    restaurant_name: "Hostel Night Canteen",
    customer_name: "Rahul Student",
    phone: "9876543210",
    address: "Room 101, Hostel A",
    status: "Assigned",
    payment_method: "online",
    total: 120,
    items: [{ id: "1", name: "Maggi", price: 60, quantity: 2 }],
  };

  const addonOrder: DeliveryOrder = {
    _id: "order-addon-789012",
    restaurant_name: "Hostel Night Canteen",
    customer_name: "Sameer Student",
    phone: "9876543211",
    address: "Room 102, Hostel A",
    status: "Assigned",
    payment_method: "cod",
    total: 80,
    is_primary_batch_order: false,
    is_batch_addon: true,
    courier_earning: 14.0,
    items: [{ id: "2", name: "Tea", price: 20, quantity: 4 }],
  };

  describe("ActiveRunCard Earning Component", () => {
    it("renders ₹20.00 and 'Base guaranteed run fee' for 1st order of batch (index 0)", () => {
      render(<ActiveRunCard order={primaryOrder} index={0} />);
      expect(screen.getByText(/Your Earning/i)).toBeInTheDocument();
      expect(screen.getByText("₹20.00")).toBeInTheDocument();
      expect(screen.getByText("Base guaranteed run fee")).toBeInTheDocument();
    });

    it("renders ₹14.00 and 'Batch add-on drop (+₹14)' for bundled secondary order (index 1)", () => {
      render(<ActiveRunCard order={addonOrder} index={1} />);
      expect(screen.getByText(/Your Earning/i)).toBeInTheDocument();
      expect(screen.getByText("₹14.00")).toBeInTheDocument();
      expect(screen.getByText("Batch add-on drop (+₹14)")).toBeInTheDocument();
    });
  });

  describe("MyDeliveryCard Earning Component", () => {
    it("renders ₹20.00 and 'Base guaranteed run fee' on primary run card", () => {
      render(
        <MyDeliveryCard
          order={primaryOrder}
          index={0}
          onUpdateStatus={vi.fn()}
          onOpenOtp={vi.fn()}
        />
      );
      expect(screen.getByText(/Your Earning/i)).toBeInTheDocument();
      expect(screen.getByText("₹20.00")).toBeInTheDocument();
      expect(screen.getByText("Base guaranteed run fee")).toBeInTheDocument();
    });

    it("renders ₹14.00 and 'Batch add-on drop (+₹14)' on secondary batch order card", () => {
      render(
        <MyDeliveryCard
          order={addonOrder}
          index={1}
          onUpdateStatus={vi.fn()}
          onOpenOtp={vi.fn()}
        />
      );
      expect(screen.getByText(/Your Earning/i)).toBeInTheDocument();
      expect(screen.getByText("₹14.00")).toBeInTheDocument();
      expect(screen.getByText("Batch add-on drop (+₹14)")).toBeInTheDocument();
    });
  });
});
