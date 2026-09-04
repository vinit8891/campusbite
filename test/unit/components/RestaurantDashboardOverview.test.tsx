import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { DashboardMetricCards } from "@/components/restaurant/DashboardMetricCards";
import type { DashboardData, StatCard } from "@/hooks/restaurant/useRestaurantDashboard";
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
  restaurant_id: "rest-1",
  active_subscriptions: 14,
  monthly_subscription_revenue: 28000,
  pending_subscription_payments: 2,
};

describe("Restaurant Dashboard Metric Cards", () => {
  it("renders stat cards with emojis and values", () => {
    render(
      <DashboardMetricCards
        cards={mockCards}
        dashboard={mockDashboard}
        subscriptionRevenue={mockSubscriptionRevenue}
      />
    );

    expect(screen.getByText("Total Orders")).toBeInTheDocument();
    expect(screen.getByText("48")).toBeInTheDocument();
    expect(screen.getByText("Pending")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("₹14250.00")).toBeInTheDocument();
    expect(screen.getByText("⭐ 4.8")).toBeInTheDocument();

    // Today's mess meals
    expect(screen.getByText(/Today's Mess Meals/i)).toBeInTheDocument();
    expect(screen.getByText("18")).toBeInTheDocument();

    // Subscription Revenue card
    expect(screen.getByText("Active subscriptions")).toBeInTheDocument();
    expect(screen.getByText("14")).toBeInTheDocument();
    expect(screen.getByText("₹28000.00")).toBeInTheDocument();
  });
});
