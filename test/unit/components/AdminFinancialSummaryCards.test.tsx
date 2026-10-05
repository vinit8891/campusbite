import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

import { AdminFinancialSummaryCards } from "@/components/admin/AdminFinancialSummaryCards";
import type { AdminFinancialAnalytics } from "@/types";

describe("AdminFinancialSummaryCards component", () => {
  const mockAnalytics: AdminFinancialAnalytics = {
    total_revenue: 12540.5,
    platform_earnings: 1420.0,
    total_orders: 85,
    restaurant_settlements: 9320.5,
    courier_payouts: 1275.0,
    gst_pool: 525.0,
    average_order_value: 147.54,
  };

  it("renders loading skeletons when loading is true", () => {
    const { container } = render(
      <AdminFinancialSummaryCards analytics={null} loading={true} />
    );
    expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0);
  });

  it("renders prominent summary metric cards with formatted figures and subtitles", () => {
    render(<AdminFinancialSummaryCards analytics={mockAnalytics} />);

    // Net App Earnings
    expect(screen.getByText("Net App Earnings")).toBeInTheDocument();
    expect(screen.getByText("₹1,420.00")).toBeInTheDocument();
    expect(
      screen.getByText(/18% Canteen Commission \+ Tech Fees \(₹3\/₹5\) \+ Small Order Fees \(₹5\) \+ Delivery Differential/i)
    ).toBeInTheDocument();

    // Total Revenue (GMV)
    expect(screen.getByText("Total Revenue (GMV)")).toBeInTheDocument();
    expect(screen.getByText("₹12,540.50")).toBeInTheDocument();
    expect(screen.getByText(/gross merchandise/i)).toBeInTheDocument();

    // Completed Orders
    expect(screen.getByText("Completed Orders")).toBeInTheDocument();
    expect(screen.getByText("85")).toBeInTheDocument();
    expect(screen.getByText(/delivered customer orders/i)).toBeInTheDocument();

    // Avg. Order Value (AOV)
    expect(screen.getByText("Avg. Order Value (AOV)")).toBeInTheDocument();
    expect(screen.getByText("₹147.54")).toBeInTheDocument();
  });

  it("renders small order surcharge breakdown line when small order fees exist", () => {
    const analyticsWithSmallOrders: AdminFinancialAnalytics = {
      ...mockAnalytics,
      platform_earnings: 1475.0,
      total_small_order_fees: 55.0,
      small_order_fees_total: 55.0,
      small_order_count: 11,
    };

    render(<AdminFinancialSummaryCards analytics={analyticsWithSmallOrders} />);

    const pill = screen.getByTestId("small-order-surcharge-pill");
    expect(pill).toBeInTheDocument();
    expect(
      screen.getByText(/Small Order Surcharges \(<₹50\): \+₹55.00 \(11 orders\)/i)
    ).toBeInTheDocument();
    expect(screen.getByText("₹1,475.00")).toBeInTheDocument();
  });

  it("renders fund distribution breakdown with restaurant net, delivery pool, and GST", () => {
    render(<AdminFinancialSummaryCards analytics={mockAnalytics} />);

    expect(screen.getByText("Restaurant Subtotal Net")).toBeInTheDocument();
    expect(screen.getByText("₹9,320.50")).toBeInTheDocument();

    expect(screen.getByText(/Delivery Pool/i)).toBeInTheDocument();
    expect(screen.getByText("₹1,275.00")).toBeInTheDocument();

    expect(screen.getByText("Statutory GST (5%)")).toBeInTheDocument();
    expect(screen.getByText("₹525.00")).toBeInTheDocument();
  });

  it("allows toggling the fund distribution breakdown collapsible", () => {
    render(<AdminFinancialSummaryCards analytics={mockAnalytics} />);

    const toggleButton = screen.getByRole("button", { name: /fund distribution/i });
    expect(screen.getByText("Hide Breakdown")).toBeInTheDocument();
    expect(screen.getByText("Restaurant Subtotal Net")).toBeInTheDocument();

    // Click to collapse
    fireEvent.click(toggleButton);
    expect(screen.getByText("View Breakdown")).toBeInTheDocument();
    expect(screen.queryByText("Restaurant Subtotal Net")).not.toBeInTheDocument();

    // Click to expand again
    fireEvent.click(toggleButton);
    expect(screen.getByText("Hide Breakdown")).toBeInTheDocument();
    expect(screen.getByText("Restaurant Subtotal Net")).toBeInTheDocument();
  });

  it("handles null/zero analytics data gracefully", () => {
    render(<AdminFinancialSummaryCards analytics={null} />);

    expect(screen.getByText("Net App Earnings")).toBeInTheDocument();
    expect(screen.getAllByText("₹0.00").length).toBeGreaterThan(0);
    expect(screen.getByText("0")).toBeInTheDocument();
  });

  it("renders Total Physical Cash on Campus and Hard Lockout Warning when riders are locked", () => {
    render(
      <AdminFinancialSummaryCards
        analytics={mockAnalytics}
        totalCampusCih={1250.0}
        lockedRidersCount={2}
      />
    );

    expect(screen.getByText("Total Physical Cash on Campus:")).toBeInTheDocument();
    expect(screen.getByText("₹1250.00")).toBeInTheDocument();

    const warningBadge = screen.getByTestId("locked-riders-warning");
    expect(warningBadge).toBeInTheDocument();
    expect(
      screen.getByText(/⚠️ 2 Rider\(s\) Locked Out \(Holdings ≥ ₹500\)/i)
    ).toBeInTheDocument();
  });

  it("renders All Couriers Active badge when no riders are locked out", () => {
    render(
      <AdminFinancialSummaryCards
        analytics={mockAnalytics}
        totalCampusCih={350.0}
        lockedRidersCount={0}
      />
    );

    expect(screen.getByText("Total Physical Cash on Campus:")).toBeInTheDocument();
    expect(screen.getByText("₹350.00")).toBeInTheDocument();

    const activeBadge = screen.getByTestId("all-riders-active-badge");
    expect(activeBadge).toBeInTheDocument();
    expect(screen.getByText(/All Couriers Active \(< ₹500 CIH\)/i)).toBeInTheDocument();
  });
});

