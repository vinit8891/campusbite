import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BatchOrderGroupCard, type BatchGroup } from "@/components/delivery/BatchOrderGroupCard";
import { AvailableOrderCard } from "@/components/delivery/AvailableOrderCard";
import { AvailableOrdersFilterBar } from "@/components/delivery/AvailableOrdersFilterBar";
import { DeliveryOrdersFilterBar } from "@/components/delivery/DeliveryOrdersFilterBar";
import { DeliveryHistoryFilterBar } from "@/components/delivery/DeliveryHistoryFilterBar";
import { DeliveryHistoryStatCards } from "@/components/delivery/DeliveryHistoryStatCards";
import { DeliveryPagination } from "@/components/delivery/DeliveryPagination";
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
  restaurant_email: "owner@test.com",
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

const mockDeliveredOrder: DeliveryOrder = {
  ...mockActiveOrder,
  _id: "order-202",
  status: "Delivered",
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
      expect(screen.getByText(/₹40/)).toBeInTheDocument(); // Payout ₹40
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
    it("renders formatted canteen name, item packing checklist, and hostel drop details for active orders", () => {
      render(
        <ActiveDeliveryManifest
          order={mockActiveOrder}
          onUpdateStatus={vi.fn()}
          onOpenOtp={vi.fn()}
        />
      );

      // Formatted canteen name from owner@test.com
      expect(screen.getByText("Owner Canteen")).toBeInTheDocument();
      expect(screen.getByText(/ITEM PACKING CHECKLIST/i)).toBeInTheDocument();
      expect(
        screen.getByText(/Verify and check off each food item at the counter before pickup/i)
      ).toBeInTheDocument();
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

    it("allows checking off packing checklist items interactively", async () => {
      const user = userEvent.setup();

      render(
        <ActiveDeliveryManifest
          order={mockActiveOrder}
          onUpdateStatus={vi.fn()}
          onOpenOtp={vi.fn()}
        />
      );

      expect(screen.getByText("0/2 Checked")).toBeInTheDocument();

      const thaliCheckbox = screen.getByLabelText(/Special Veg Thali × 1/i);
      await user.click(thaliCheckbox);

      expect(screen.getByText("1/2 Checked")).toBeInTheDocument();
    });

    it("renders clean completion card for delivered orders without interactive checkboxes", () => {
      render(
        <ActiveDeliveryManifest
          order={mockDeliveredOrder}
          onUpdateStatus={vi.fn()}
          onOpenOtp={vi.fn()}
        />
      );

      // Clean completion banner
      expect(
        screen.getByText(/✅ Delivery Completed • Verified via OTP 🎉/i)
      ).toBeInTheDocument();

      // Does not show active packing checklist header or checkboxes
      expect(screen.queryByText(/ITEM PACKING CHECKLIST/i)).not.toBeInTheDocument();
      expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();

      // Readonly items list is visible
      expect(screen.getByText(/Special Veg Thali × 1/i)).toBeInTheDocument();
      expect(screen.getByText(/Lassi × 2/i)).toBeInTheDocument();
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

  describe("AvailableOrderCard", () => {
    it("renders formatted canteen name fallback, unclipped payout pill, and 48px touch CTA", async () => {
      const user = userEvent.setup();
      const onAccept = vi.fn();
      const onNavigate = vi.fn();

      const rawEmailOrder: AvailableOrder = {
        ...mockBatchOrders[0],
        restaurant_email: "north.indian.dhaba@campus.edu",
      };

      render(
        <AvailableOrderCard
          order={rawEmailOrder}
          isAccepting={false}
          onAccept={onAccept}
          onNavigate={onNavigate}
        />
      );

      // Ensures raw email is converted to clean canteen name
      expect(screen.getByText(/North Indian Dhaba/i)).toBeInTheDocument();
      expect(screen.queryByText("north.indian.dhaba@campus.edu")).not.toBeInTheDocument();

      // Unclipped payout badge
      expect(screen.getByText(/💰 \+₹20 Payout/i)).toBeInTheDocument();

      // Customer & Room
      expect(screen.getByText("Rahul Sharma")).toBeInTheDocument();
      expect(screen.getByText(/Room 304, Tagore Hostel/i)).toBeInTheDocument();

      // 48px touch claim button
      const claimBtn = screen.getByRole("button", { name: /claim run • ₹20 payout/i });
      await user.click(claimBtn);
      expect(onAccept).toHaveBeenCalledWith("order-101");

      // Map Route button
      const mapBtn = screen.getByRole("button", { name: /map route/i });
      await user.click(mapBtn);
      expect(onNavigate).toHaveBeenCalledWith(rawEmailOrder);
    });
  });

  describe("AvailableOrdersFilterBar", () => {
    it("renders clean single-row search bar and expands filters on toggle", async () => {
      const user = userEvent.setup();
      const setQ = vi.fn();
      const onRestaurantChange = vi.fn();
      const onPaymentMethodChange = vi.fn();
      const onRefresh = vi.fn();

      render(
        <AvailableOrdersFilterBar
          q=""
          setQ={setQ}
          restaurant=""
          onRestaurantChange={onRestaurantChange}
          restaurantOptions={["south.canteen@campus.edu"]}
          paymentMethod=""
          onPaymentMethodChange={onPaymentMethodChange}
          onRefresh={onRefresh}
          onSubmit={vi.fn()}
        />
      );

      const searchInput = screen.getByPlaceholderText(/search hostel, room, or canteen/i);
      expect(searchInput).toBeInTheDocument();

      // Open collapsible filters
      const filterToggleBtn = screen.getByRole("button", { name: /filters/i });
      await user.click(filterToggleBtn);

      expect(screen.getByText("Filter by Canteen")).toBeInTheDocument();
      expect(screen.getByText("South Canteen")).toBeInTheDocument();

      // Refresh button
      const refreshBtn = screen.getByRole("button", { name: /refresh orders/i });
      await user.click(refreshBtn);
      expect(onRefresh).toHaveBeenCalled();
    });
  });

  describe("DeliveryOrdersFilterBar", () => {
    it("renders single-row search bar with embedded clear button and collapsible status dropdown", async () => {
      const user = userEvent.setup();
      const setQ = vi.fn();
      const onStatusChange = vi.fn();
      const onRefresh = vi.fn();
      const onSubmit = vi.fn();

      const { rerender } = render(
        <DeliveryOrdersFilterBar
          q=""
          setQ={setQ}
          status=""
          onStatusChange={onStatusChange}
          onRefresh={onRefresh}
          onSubmit={onSubmit}
        />
      );

      const input = screen.getByPlaceholderText(/search customer, room, or order ID/i);
      expect(input).toBeInTheDocument();

      // Clear button shows when q is present
      rerender(
        <DeliveryOrdersFilterBar
          q="Hostel B"
          setQ={setQ}
          status=""
          onStatusChange={onStatusChange}
          onRefresh={onRefresh}
          onSubmit={onSubmit}
        />
      );

      const clearBtn = screen.getByRole("button", { name: /clear search/i });
      await user.click(clearBtn);
      expect(setQ).toHaveBeenCalledWith("");

      // Open collapsible filters
      const filterToggleBtn = screen.getByRole("button", { name: /filters/i });
      await user.click(filterToggleBtn);

      expect(screen.getByText("Order Delivery Status")).toBeInTheDocument();
      expect(screen.getByRole("combobox")).toBeInTheDocument();

      // Refresh button
      const refreshBtn = screen.getByRole("button", { name: /refresh orders/i });
      await user.click(refreshBtn);
      expect(onRefresh).toHaveBeenCalled();
    });
  });

  describe("DeliveryHistoryFilterBar", () => {
    it("renders single-row search bar with embedded clear button and collapsible date pickers", async () => {
      const user = userEvent.setup();
      const setQ = vi.fn();
      const setFromDate = vi.fn();
      const setToDate = vi.fn();
      const onRefresh = vi.fn();
      const onSubmit = vi.fn();

      const { rerender } = render(
        <DeliveryHistoryFilterBar
          q=""
          setQ={setQ}
          fromDate=""
          setFromDate={setFromDate}
          toDate=""
          setToDate={setToDate}
          onRefresh={onRefresh}
          onSubmit={onSubmit}
        />
      );

      const input = screen.getByPlaceholderText(/search customer, room, or order ID/i);
      expect(input).toBeInTheDocument();

      // Clear button shows when q is present
      rerender(
        <DeliveryHistoryFilterBar
          q="Alice"
          setQ={setQ}
          fromDate=""
          setFromDate={setFromDate}
          toDate=""
          setToDate={setToDate}
          onRefresh={onRefresh}
          onSubmit={onSubmit}
        />
      );

      const clearBtn = screen.getByRole("button", { name: /clear search/i });
      await user.click(clearBtn);
      expect(setQ).toHaveBeenCalledWith("");

      // Open collapsible filters
      const filterToggleBtn = screen.getByRole("button", { name: /filters/i });
      await user.click(filterToggleBtn);

      expect(screen.getByLabelText(/from date/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/to date/i)).toBeInTheDocument();

      // Refresh button
      const refreshBtn = screen.getByRole("button", { name: /refresh deliveries/i });
      await user.click(refreshBtn);
      expect(onRefresh).toHaveBeenCalled();
    });
  });

  describe("DeliveryHistoryStatCards", () => {
    it("renders compact 3-column stats row for total, weekly, and monthly counts", () => {
      render(
        <DeliveryHistoryStatCards
          totalDeliveries={48}
          weekDeliveries={14}
          monthDeliveries={32}
        />
      );

      expect(screen.getByText("Total Deliveries")).toBeInTheDocument();
      expect(screen.getByText("48")).toBeInTheDocument();

      expect(screen.getByText("This Week")).toBeInTheDocument();
      expect(screen.getByText("14")).toBeInTheDocument();

      expect(screen.getByText("This Month")).toBeInTheDocument();
      expect(screen.getByText("32")).toBeInTheDocument();
    });
  });

  describe("DeliveryPagination", () => {
    it("auto-hides when only a single page of results exists (pages <= 1)", () => {
      const { container } = render(
        <DeliveryPagination
          page={1}
          pages={1}
          total={8}
          pageSize={20}
          onPageChange={vi.fn()}
        />
      );

      expect(container.firstChild).toBeNull();
      expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
    });

    it("auto-hides when total count is less than or equal to page size", () => {
      const { container } = render(
        <DeliveryPagination
          page={1}
          pages={1}
          total={15}
          pageSize={20}
          onPageChange={vi.fn()}
        />
      );

      expect(container.firstChild).toBeNull();
    });

    it("renders streamlined mobile pagination with lightweight arrows when multiple pages exist", async () => {
      const user = userEvent.setup();
      const onPageChange = vi.fn();

      render(
        <DeliveryPagination
          page={2}
          pages={5}
          total={95}
          pageSize={20}
          itemName="runs"
          onPageChange={onPageChange}
        />
      );

      expect(screen.getByRole("navigation", { name: /delivery pagination/i })).toBeInTheDocument();
      expect(screen.getByText(/showing page/i)).toBeInTheDocument();
      expect(screen.getByText(/95 runs/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/current page, page 2/i)).toBeInTheDocument();

      // Click previous page arrow
      const prevBtn = screen.getByRole("button", { name: /previous page/i });
      await user.click(prevBtn);
      expect(onPageChange).toHaveBeenCalledWith(1);

      // Click next page arrow
      const nextBtn = screen.getByRole("button", { name: /next page/i });
      await user.click(nextBtn);
      expect(onPageChange).toHaveBeenCalledWith(3);
    });

    it("disables previous button on first page and next button on last page", () => {
      const { rerender } = render(
        <DeliveryPagination
          page={1}
          pages={3}
          total={60}
          onPageChange={vi.fn()}
        />
      );

      expect(screen.getByRole("button", { name: /previous page/i })).toBeDisabled();
      expect(screen.getByRole("button", { name: /next page/i })).not.toBeDisabled();

      // Rerender on last page
      rerender(
        <DeliveryPagination
          page={3}
          pages={3}
          total={60}
          onPageChange={vi.fn()}
        />
      );

      expect(screen.getByRole("button", { name: /previous page/i })).not.toBeDisabled();
      expect(screen.getByRole("button", { name: /next page/i })).toBeDisabled();
    });
  });
});
