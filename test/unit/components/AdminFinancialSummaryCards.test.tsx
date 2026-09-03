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
    expect(screen.getByText(/₹3 tech fees \+ commissions/i)).toBeInTheDocument();

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

  it("renders fund distribution breakdown with restaurant net, delivery pool, and GST", () => {
    render(<AdminFinancialSummaryCards analytics={mockAnalytics} />);

    expect(screen.getByText("Restaurant Subtotal Net")).toBeInTheDocument();
    expect(screen.getByText("₹9,320.50")).toBeInTheDocument();

    expect(screen.getByText("Delivery Pool")).toBeInTheDocument();
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
});
