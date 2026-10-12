import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import AdminSubscriptionsPage from "@/app/admin/subscriptions/page";
import * as subscriptionService from "@/services/subscriptionService";

vi.mock("next/navigation", () => ({
  usePathname: () => "/admin/subscriptions",
  useRouter: () => ({ push: vi.fn() }),
}));

const mockSubsResponse: subscriptionService.AdminSubscriptionsResponse = {
  subscriptions: [
    {
      subscription_id: "sub-101",
      customer_email: "student1@campus.edu",
      restaurant_name: "Zeal Mess",
      restaurant_email: "zeal@campus.edu",
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
      price: 700.0,
      created_at: "2026-09-01T08:00:00Z",
    },
    {
      subscription_id: "sub-102",
      customer_email: "student2@campus.edu",
      restaurant_name: "Campus Eatery",
      restaurant_email: "eatery@campus.edu",
      meal_type: "dinner",
      subscription_type: "monthly",
      delivery_days: ["monday", "tuesday", "wednesday"],
      auto_renew: false,
      skipped_dates: [],
      pause_from: null,
      pause_to: null,
      start_date: "2026-09-01",
      end_date: "2026-09-30",
      status: "active",
      payment_status: "pending",
      price: 2500.0,
      created_at: "2026-09-01T09:00:00Z",
    },
  ],
  stats: {
    total_revenue: 700.0,
    paid_count: 1,
    pending_count: 1,
    active_count: 2,
    total_count: 5,
  },
};

describe("AdminSubscriptionsPage Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(subscriptionService, "fetchAdminSubscriptions").mockResolvedValue(mockSubsResponse);
    vi.spyOn(subscriptionService, "updateAdminSubscriptionPaymentStatus").mockResolvedValue({
      success: true,
      message: "Payment marked as Paid",
    });
    vi.spyOn(subscriptionService, "updateAdminSubscriptionStatus").mockResolvedValue({
      success: true,
      message: "Subscription marked as cancelled",
    });
  });

  it("renders 4 authoritative KPI cards with correct metric values", async () => {
    render(<AdminSubscriptionsPage />);

    await waitFor(() => {
      expect(screen.getByText("student1@campus.edu")).toBeInTheDocument();
    });

    // 1. Total Revenue Collected
    expect(screen.getByText(/Total Revenue Collected/i)).toBeInTheDocument();
    expect(screen.getAllByText("₹700.00").length).toBeGreaterThanOrEqual(2);

    // 2. Active Meal Plans
    expect(screen.getByText(/Active Meal Plans/i)).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();

    // 3. Pending Cash Payments
    expect(screen.getByText(/Pending Cash Payments/i)).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();

    // 4. Total Subscribers
    expect(screen.getByText(/Total Subscribers/i)).toBeInTheDocument();
    expect(screen.getByText("All enrolled student accounts")).toBeInTheDocument();
  });

  it("renders unified search and status filter pill buttons", async () => {
    render(<AdminSubscriptionsPage />);

    await waitFor(() => {
      expect(screen.getByText("student1@campus.edu")).toBeInTheDocument();
    });

    // Universal search bar
    expect(
      screen.getByPlaceholderText(/search student email, mess name, or plan/i)
    ).toBeInTheDocument();

    // Filter pill buttons
    expect(screen.getByRole("button", { name: /^All$/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Active$/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Pending Payment$/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Cancelled$/i })).toBeInTheDocument();
  });

  it("does not render redundant Subscription Payments table placeholder", async () => {
    render(<AdminSubscriptionsPage />);

    await waitFor(() => {
      expect(screen.getByText("student1@campus.edu")).toBeInTheDocument();
    });

    // Verify absence of old redundant box
    expect(screen.queryByText(/Subscription Payments/i)).not.toBeInTheDocument();
  });

  it("handles Mark Paid button click for pending payment", async () => {
    render(<AdminSubscriptionsPage />);

    await waitFor(() => {
      expect(screen.getByText("student2@campus.edu")).toBeInTheDocument();
    });

    const markPaidBtn = screen.getByRole("button", { name: /mark paid/i });
    expect(markPaidBtn).toBeInTheDocument();
    fireEvent.click(markPaidBtn);

    expect(subscriptionService.updateAdminSubscriptionPaymentStatus).toHaveBeenCalledWith(
      "sub-102",
      "paid"
    );
  });
});
