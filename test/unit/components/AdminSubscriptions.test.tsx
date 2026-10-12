import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AdminSubscriptionsTable } from "@/components/admin/AdminSubscriptionsTable";
import { DeleteSubscriptionModal } from "@/components/admin/DeleteSubscriptionModal";
import {
  deleteAdminSubscription,
  type Subscription,
} from "@/services/subscriptionService";

const mockSubscriptions: Subscription[] = [
  {
    subscription_id: "sub_1111222233334444",
    customer_email: "student@campus.edu",
    restaurant_email: "mess@campus.edu",
    meal_type: "lunch",
    subscription_type: "weekly",
    delivery_days: ["monday", "tuesday", "wednesday", "thursday", "friday"],
    auto_renew: false,
    skipped_dates: [],
    pause_from: null,
    pause_to: null,
    start_date: "2026-09-01",
    end_date: "2026-09-07",
    status: "active",
    payment_status: "paid",
    price: 700,
    created_at: "2026-09-01T08:00:00Z",
  },
  {
    subscription_id: "sub_5555666677778888",
    customer_email: "faculty@campus.edu",
    restaurant_email: "mess@campus.edu",
    meal_type: "dinner",
    subscription_type: "monthly",
    delivery_days: [
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
      "sunday",
    ],
    auto_renew: true,
    skipped_dates: [],
    pause_from: "2026-09-10",
    pause_to: "2026-09-15",
    start_date: "2026-09-01",
    end_date: "2026-09-30",
    status: "paused",
    payment_status: "paid",
    price: 2800,
    created_at: "2026-09-01T09:00:00Z",
  },
  {
    subscription_id: "sub_9999000011112222",
    customer_email: "pending_student@campus.edu",
    restaurant_email: "mess@campus.edu",
    meal_type: "breakfast",
    subscription_type: "weekly",
    delivery_days: ["monday", "tuesday"],
    auto_renew: false,
    skipped_dates: [],
    pause_from: null,
    pause_to: null,
    start_date: "2026-09-01",
    end_date: "2026-09-07",
    status: "active",
    payment_status: "pending",
    price: 350,
    created_at: "2026-09-01T10:00:00Z",
  },
];

describe("Admin Mess Subscriptions Management & Deletion Control", () => {
  describe("AdminSubscriptionsTable Component", () => {
    it("renders table headers including Actions column", () => {
      render(<AdminSubscriptionsTable items={mockSubscriptions} />);

      expect(screen.getByText("ID")).toBeInTheDocument();
      expect(screen.getByText("Customer")).toBeInTheDocument();
      expect(screen.getByText("Restaurant")).toBeInTheDocument();
      expect(screen.getByText("Plan")).toBeInTheDocument();
      expect(screen.getByText("Period")).toBeInTheDocument();
      expect(screen.getByText("Status")).toBeInTheDocument();
      expect(screen.getByText("Payment")).toBeInTheDocument();
      expect(screen.getByText("Price")).toBeInTheDocument();
      expect(screen.getByText("Actions")).toBeInTheDocument();
    });

    it("renders subscription details and status tags", () => {
      render(<AdminSubscriptionsTable items={mockSubscriptions} />);

      expect(screen.getByText("student@campus.edu")).toBeInTheDocument();
      expect(screen.getByText("lunch · weekly")).toBeInTheDocument();
      expect(screen.getByText("₹700.00")).toBeInTheDocument();
      expect(screen.getAllByText("active").length).toBeGreaterThanOrEqual(1);

      expect(screen.getByText("faculty@campus.edu")).toBeInTheDocument();
      expect(screen.getByText("dinner · monthly")).toBeInTheDocument();
      expect(screen.getByText("₹2800.00")).toBeInTheDocument();
      expect(screen.getByText("paused")).toBeInTheDocument();
    });

    it("triggers onDeleteSubscription when delete button is clicked", () => {
      const handleDelete = vi.fn();
      render(
        <AdminSubscriptionsTable
          items={mockSubscriptions}
          onDeleteSubscription={handleDelete}
        />
      );

      const deleteButtons = screen.getAllByRole("button", {
        name: /delete subscription/i,
      });
      expect(deleteButtons.length).toBe(3);

      fireEvent.click(deleteButtons[0]);
      expect(handleDelete).toHaveBeenCalledTimes(1);
      expect(handleDelete).toHaveBeenCalledWith(mockSubscriptions[0]);
    });

    it("renders Mark Paid button for pending payment and triggers callback", () => {
      const handleMarkPaid = vi.fn();
      render(
        <AdminSubscriptionsTable
          items={mockSubscriptions}
          onMarkPaymentPaid={handleMarkPaid}
        />
      );

      const markPaidBtn = screen.getByRole("button", {
        name: /mark paid/i,
      });
      expect(markPaidBtn).toBeInTheDocument();
      fireEvent.click(markPaidBtn);
      expect(handleMarkPaid).toHaveBeenCalledWith("sub_9999000011112222");
    });

    it("renders Cancel button for active subscription and Activate button for paused/cancelled", () => {
      const handleUpdateStatus = vi.fn();
      render(
        <AdminSubscriptionsTable
          items={mockSubscriptions}
          onUpdateStatus={handleUpdateStatus}
        />
      );

      const cancelButtons = screen.getAllByRole("button", { name: /cancel subscription/i });
      expect(cancelButtons.length).toBeGreaterThanOrEqual(1);
      fireEvent.click(cancelButtons[0]);
      expect(handleUpdateStatus).toHaveBeenCalledWith("sub_1111222233334444", "cancelled");

      const activateButtons = screen.getAllByRole("button", { name: /activate subscription/i });
      expect(activateButtons.length).toBeGreaterThanOrEqual(1);
      fireEvent.click(activateButtons[0]);
      expect(handleUpdateStatus).toHaveBeenCalledWith("sub_5555666677778888", "active");
    });
  });

  describe("DeleteSubscriptionModal Component", () => {
    it("renders subscription plan summary, warning, and confirmation actions", () => {
      const handleConfirm = vi.fn();
      const handleCancel = vi.fn();

      render(
        <DeleteSubscriptionModal
          isOpen={true}
          subscription={mockSubscriptions[0]}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />
      );

      expect(
        screen.getByRole("heading", { name: /confirm subscription deletion/i })
      ).toBeInTheDocument();
      expect(screen.getByText("student@campus.edu")).toBeInTheDocument();
      expect(screen.getByText("lunch · weekly")).toBeInTheDocument();
      expect(screen.getByText("active")).toBeInTheDocument();
      expect(
        screen.getByText(/permanently delete this subscription and cancel any unserved meal tokens/i)
      ).toBeInTheDocument();

      const cancelBtn = screen.getByRole("button", { name: /cancel/i });
      fireEvent.click(cancelBtn);
      expect(handleCancel).toHaveBeenCalledTimes(1);

      const confirmBtn = screen.getByRole("button", {
        name: /confirm delete/i,
      });
      fireEvent.click(confirmBtn);
      expect(handleConfirm).toHaveBeenCalledTimes(1);
    });

    it("returns null when isOpen is false", () => {
      const { container } = render(
        <DeleteSubscriptionModal
          isOpen={false}
          subscription={mockSubscriptions[0]}
          onConfirm={vi.fn()}
          onCancel={vi.fn()}
        />
      );

      expect(container.firstChild).toBeNull();
    });
  });

  describe("deleteAdminSubscription Service", () => {
    it("calls DELETE /api/admin/subscriptions/:subscription_id successfully", async () => {
      const response = await deleteAdminSubscription("sub_1111222233334444");
      expect(response.success).toBe(true);
      expect(response.message).toBe("Subscription deleted successfully");
    });
  });
});
