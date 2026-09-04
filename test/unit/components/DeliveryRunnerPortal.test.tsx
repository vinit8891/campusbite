import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BatchOrderGroupCard, type BatchGroup } from "@/components/delivery/BatchOrderGroupCard";
import { ActiveDeliveryManifest } from "@/components/delivery/ActiveDeliveryManifest";
import { DeliveryOtpModal } from "@/components/delivery/DeliveryOtpModal";
import type { DeliveryOrder } from "@/types";
import type { AvailableOrder } from "@/hooks/delivery/useAvailableOrders";

const mockBatchOrders: AvailableOrder[] = [
  {
    _id: "order-101",
    restaurant_email: "Campus Corner Grill",
    customer_name: "Rahul Sharma",
    phone: "9876543210",
    address: "Room 304, Tagore Hostel, North Campus",
    created_at: "2026-09-04T12:00:00Z",
    total: 240,
    payment_method: "online",
    payment_status: "paid",
    status: "Ready for Pickup",
    items: [
      { id: "item-1", name: "Paneer Butter Masala", price: 180, quantity: 1 },
      { id: "item-2", name: "Butter Roti", price: 30, quantity: 2 },
    ],
  },
  {
    _id: "order-102",
    restaurant_email: "Chai & Snacks Point",
    customer_name: "Pooja Verma",
    phone: "9876543211",
    address: "Room 108, Tagore Hostel, North Campus",
    created_at: "2026-09-04T12:05:00Z",
    total: 120,
    payment_method: "cod",
    payment_status: "pending",
    status: "Ready for Pickup",
    items: [{ id: "item-3", name: "Cold Coffee", price: 60, quantity: 2 }],
  },
];

const mockBatchGroup: BatchGroup = {
  building: "Tagore Hostel",
  orders: mockBatchOrders,
  estimatedPayout: 40,
  restaurants: ["Campus Corner Grill", "Chai & Snacks Point"],
};

const mockActiveOrder: DeliveryOrder = {
  _id: "order-201",
  restaurant_email: "Central Canteen",
  customer_name: "Amit Patel",
  customer_email: "amit@campus.edu",
  phone: "9123456780",
  address: "Room 402, Block B Hostel",
  created_at: "2026-09-04T12:30:00Z",
  total: 350,
  payment_method: "online",
  payment_status: "paid",
  status: "Assigned",
  items: [
    { id: "dish-1", name: "Special Veg Thali", price: 250, quantity: 1 },
    { id: "dish-2", name: "Lassi", price: 50, quantity: 2 },
  ],
};

describe("Campus Courier & Delivery Runner Portal Components", () => {
  describe("BatchOrderGroupCard", () => {
    it("renders bundled batch drops with combined payout and canteen list", () => {
      render(
        <BatchOrderGroupCard
          batch={mockBatchGroup}
          claimingIds={[]}
          onClaimBatch={vi.fn()}
          onClaimSingle={vi.fn()}
        />
      );

      expect(screen.getByText("Tagore Hostel")).toBeInTheDocument();
      expect(screen.getByText("2 Orders")).toBeInTheDocument();
      expect(screen.getByText("40")).toBeInTheDocument(); // Payout ₹40
      expect(screen.getByText(/Campus Corner Grill • Chai & Snacks Point/i)).toBeInTheDocument();

      // Individual orders inside the batch
      expect(screen.getByText("Rahul Sharma")).toBeInTheDocument();
      expect(screen.getByText("Pooja Verma")).toBeInTheDocument();
    });

    it("triggers onClaimBatch when Claim Batch Run is clicked", async () => {
      const user = userEvent.setup();
      const onClaimBatch = vi.fn();

      render(
        <BatchOrderGroupCard
          batch={mockBatchGroup}
          claimingIds={[]}
          onClaimBatch={onClaimBatch}
          onClaimSingle={vi.fn()}
        />
      );

      const batchClaimBtn = screen.getByRole("button", {
        name: /claim batch run \(2 orders\)/i,
      });
      await user.click(batchClaimBtn);

      expect(onClaimBatch).toHaveBeenCalledWith(["order-101", "order-102"]);
    });

    it("triggers onClaimSingle when individual order claim button is clicked", async () => {
      const user = userEvent.setup();
      const onClaimSingle = vi.fn();

      render(
        <BatchOrderGroupCard
          batch={mockBatchGroup}
          claimingIds={[]}
          onClaimBatch={vi.fn()}
          onClaimSingle={onClaimSingle}
        />
      );

      const singleClaimBtns = screen.getAllByRole("button", {
        name: /claim single/i,
      });
      await user.click(singleClaimBtns[0]);

      expect(onClaimSingle).toHaveBeenCalledWith("order-101");
    });
  });

  describe("ActiveDeliveryManifest", () => {
    it("renders canteen pickup checklist and hostel drop details", () => {
      render(
        <ActiveDeliveryManifest
          order={mockActiveOrder}
          onUpdateStatus={vi.fn()}
          onOpenOtp={vi.fn()}
        />
      );

      expect(screen.getByText("Central Canteen")).toBeInTheDocument();
      expect(screen.getByText(/Special Veg Thali/i)).toBeInTheDocument();
      expect(screen.getByText(/Lassi/i)).toBeInTheDocument();
      expect(screen.getByText(/Room 402, Block B Hostel/i)).toBeInTheDocument();

      // Tap-to-call link
      const callLink = screen.getByRole("link", { name: /call 9123456780/i });
      expect(callLink).toHaveAttribute("href", "tel:9123456780");

      // Pickup button for Assigned status
      expect(
        screen.getByRole("button", {
          name: /confirm all items & mark picked up/i,
        })
      ).toBeInTheDocument();
    });

    it("allows checking off canteen items interactively", async () => {
      const user = userEvent.setup();

      render(
        <ActiveDeliveryManifest
          order={mockActiveOrder}
          onUpdateStatus={vi.fn()}
          onOpenOtp={vi.fn()}
        />
      );

      expect(screen.getByText("0/2 verified")).toBeInTheDocument();

      const thaliCheckbox = screen.getByLabelText(/Special Veg Thali × 1/i);
      await user.click(thaliCheckbox);

      expect(screen.getByText("1/2 verified")).toBeInTheDocument();
    });

    it("renders Complete Delivery button and opens OTP modal when Out for Delivery", async () => {
      const user = userEvent.setup();
      const onOpenOtp = vi.fn();

      const outForDeliveryOrder: DeliveryOrder = {
        ...mockActiveOrder,
        status: "Out for Delivery",
      };

      render(
        <ActiveDeliveryManifest
          order={outForDeliveryOrder}
          onUpdateStatus={vi.fn()}
          onOpenOtp={onOpenOtp}
        />
      );

      const completeBtn = screen.getByRole("button", {
        name: /complete delivery & verify otp/i,
      });
      await user.click(completeBtn);

      expect(onOpenOtp).toHaveBeenCalledWith("order-201");
    });
  });

  describe("DeliveryOtpModal", () => {
    it("renders 4-digit numeric input boxes and verifies complete OTP", async () => {
      const user = userEvent.setup();
      const setOtp = vi.fn();
      const onVerify = vi.fn();
      const onClose = vi.fn();

      const { rerender } = render(
        <DeliveryOtpModal
          isOpen={true}
          otp=""
          setOtp={setOtp}
          verifying={false}
          otpError=""
          onVerify={onVerify}
          onClose={onClose}
        />
      );

      expect(screen.getByText("Handover Verification OTP")).toBeInTheDocument();
      const digit1 = screen.getByLabelText("Digit 1");
      await user.type(digit1, "5");

      expect(setOtp).toHaveBeenCalled();

      // Test with full 4-digit OTP
      rerender(
        <DeliveryOtpModal
          isOpen={true}
          otp="5821"
          setOtp={setOtp}
          verifying={false}
          otpError=""
          onVerify={onVerify}
          onClose={onClose}
        />
      );

      const verifyBtn = screen.getByRole("button", { name: /verify & complete/i });
      expect(verifyBtn).not.toBeDisabled();
      await user.click(verifyBtn);

      expect(onVerify).toHaveBeenCalled();
    });

    it("displays error message when OTP validation fails", () => {
      render(
        <DeliveryOtpModal
          isOpen={true}
          otp="9999"
          setOtp={vi.fn()}
          verifying={false}
          otpError="Incorrect 4-digit OTP provided"
          onVerify={vi.fn()}
          onClose={vi.fn()}
        />
      );

      expect(
        screen.getByText("Incorrect 4-digit OTP provided")
      ).toBeInTheDocument();
    });
  });
});
