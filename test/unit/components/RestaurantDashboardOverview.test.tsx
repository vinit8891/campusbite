import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DashboardMetricCards } from "@/components/restaurant/DashboardMetricCards";
import { DashboardAnalyticsCharts } from "@/components/restaurant/DashboardAnalyticsCharts";
import type { DashboardData, StatCard, AnalyticsOverview } from "@/hooks/restaurant/useRestaurantDashboard";
import type { RestaurantSubscriptionRevenueSummary } from "@/types";

const mockDashboard: DashboardData = {
  orders: 48,
  revenue: 14250,
  menu_items: 24,
  rating: 4.8,
  pending_orders: 3,
  active_orders: 5,
  delivered_orders: 40,
  cancelled_orders: 0,
  today_orders: 12,
  today_revenue: 3600,
  today_subscription_meals: 18,
  review_count: 32,
};

const mockCards: StatCard[] = [
  { label: "Total Orders", value: "48", valueClass: "text-blue-800" },
  { label: "Today's Orders", value: "12", valueClass: "text-blue-800" },
  { label: "Pending", value: "3", valueClass: "text-amber-800", hint: "Awaiting acceptance" },
  { label: "In Progress", value: "5", valueClass: "text-indigo-800", hint: "Preparing" },
  { label: "Revenue", value: "₹14250.00", valueClass: "text-emerald-800" },
  { label: "Rating", value: "⭐ 4.8", valueClass: "text-orange-800", hint: "32 reviews" },
];

const mockSubscriptionRevenue: RestaurantSubscriptionRevenueSummary = {
  active_subscriptions: 14,
  monthly_subscription_revenue: 28000,
  pending_subscription_payments: 2,
};

const mockAnalytics: AnalyticsOverview = {
  orders_by_status: [
    { key: "Delivered", count: 40 },
    { key: "In Progress", count: 5 },
    { key: "Pending", count: 3 },
  ],
  orders_by_payment_method: [
    { key: "online", count: 35 },
    { key: "cod", count: 13 },
  ],
  orders_by_payment_status: [
    { key: "paid", count: 35 },
    { key: "pending", count: 13 },
  ],
  revenue_last_7_days: 14250,
  revenue_last_30_days: 52000,
  revenue_trend_7d: [
    { date: "2026-09-01", revenue: 2000, orders: 8 },
    { date: "2026-09-02", revenue: 3500, orders: 12 },
    { date: "2026-09-03", revenue: 4100, orders: 15 },
    { date: "2026-09-04", revenue: 4650, orders: 13 },
  ],
  top_selling_items: [
    { name: "Special Paneer Thali", orders: 25 },
    { name: "Butter Naan", orders: 42 },
  ],
  recent_reviews: [],
  reviews_summary: {
    average_rating: 4.8,
    count: 32,
  },
  average_order_value: 296.87,
};

describe("Restaurant Dashboard Metric Cards & Analytics", () => {
  it("renders 4 operational tiles and toggles all-time store performance collapsible", async () => {
    const user = userEvent.setup();
    render(
      <DashboardMetricCards
        cards={mockCards}
        dashboard={mockDashboard}
        subscriptionRevenue={mockSubscriptionRevenue}
      />
    );

    // Operational tiles
    expect(screen.getByText("Today's Earnings")).toBeInTheDocument();
    expect(screen.getByText("₹3600.00")).toBeInTheDocument();
    expect(screen.getByText("Today's Orders")).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByText("Pending")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("In Progress")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();

    // Today's mess meals
    expect(screen.getByText(/Today's Mess Meals/i)).toBeInTheDocument();
    expect(screen.getByText("18")).toBeInTheDocument();

    // Subscription Revenue card
    expect(screen.getByText("Active subs")).toBeInTheDocument();
    expect(screen.getByText("14")).toBeInTheDocument();
    expect(screen.getByText("₹28000.00")).toBeInTheDocument();
    expect(screen.getByText("Pending dues")).toBeInTheDocument();

    // Toggle All-Time Store Performance collapsible
    const collapsibleTrigger = screen.getByRole("button", {
      name: /All-Time Store Performance/i,
    });
    expect(collapsibleTrigger).toBeInTheDocument();

    await user.click(collapsibleTrigger);

    // Lifetime metrics now visible
    expect(screen.getByText("Total Orders")).toBeInTheDocument();
    expect(screen.getByText("48")).toBeInTheDocument();
    expect(screen.getByText("₹14250.00")).toBeInTheDocument();
    expect(screen.getByText("⭐ 4.8")).toBeInTheDocument();
  });

  it("renders dashboard analytics charts with revenue trend and top selling items", () => {
    render(
      <DashboardAnalyticsCharts
        analytics={mockAnalytics}
        trend={mockAnalytics.revenue_trend_7d}
        maxTrendRevenue={5000}
        topItems={mockAnalytics.top_selling_items}
        maxTop={45}
      />
    );

    expect(screen.getByText("Revenue Trend (7 days)")).toBeInTheDocument();
    expect(screen.getByText("Orders by Status")).toBeInTheDocument();
    expect(screen.getByText("Payment Breakdown")).toBeInTheDocument();
    expect(screen.getByText("Top Selling Items")).toBeInTheDocument();

    // Check top selling items rendered
    expect(screen.getByText(/Special Paneer Thali/i)).toBeInTheDocument();
    expect(screen.getByText("25 sold")).toBeInTheDocument();
    expect(screen.getByText(/Butter Naan/i)).toBeInTheDocument();
    expect(screen.getByText("42 sold")).toBeInTheDocument();
  });
});
