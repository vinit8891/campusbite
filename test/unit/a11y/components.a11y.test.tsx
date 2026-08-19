import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import { axe } from "vitest-axe";

import { EmptyState } from "@/components/common/EmptyState";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";
import MenuCard from "@/components/menu/MenuCard";
import { OrderCard } from "@/components/orders/OrderCard";
import { SubscriptionCard } from "@/components/subscriptions/SubscriptionCard";
import { CartProvider } from "@/context/CartContext";
import { AuthProvider } from "@/context/AuthContext";
import type { Order } from "@/types/orders";
import type { Subscription } from "@/types";

const mockOrder: Order = {
  _id: "order-123",
  customer_name: "Aman Gupta",
  customer_email: "aman@campus.edu",
  phone: "9876543210",
  address: "Hostel 4, Room 201",
  restaurant_id: "rest-1",
  restaurant_name: "Campus Grill",
  restaurant_email: "grill@campus.edu",
  restaurant_cuisine: "Fast Food",
  status: "Pending",
  payment_method: "Cash on Delivery",
  payment_status: "pending",
  items: [
    {
      id: "item-1",
      name: "Veg Burger",
      price: 99,
      quantity: 2,
    },
  ],
  total: 198,
  created_at: "2026-08-19T10:00:00Z",
};

const mockSubscription: Subscription = {
  subscription_id: "SUB-12345",
  customer_email: "aman@campus.edu",
  restaurant_email: "grill@campus.edu",
  plan_id: "plan-1",
  meal_type: "lunch",
  subscription_type: "monthly",
  delivery_days: ["monday", "tuesday", "wednesday", "thursday", "friday"],
  status: "active",
  price: 2500,
  start_date: "2026-08-01",
  end_date: "2026-08-31",
  payment_status: "paid",
  auto_renew: true,
  skipped_dates: [],
  pause_from: null,
  pause_to: null,
};

describe("Component Accessibility (WCAG 2.2 AA)", () => {
  it("EmptyState has no accessibility violations", async () => {
    const { container } = render(
      <EmptyState
        title="No Orders Found"
        description="You have not placed any orders yet."
        actionLabel="Browse Menu"
        actionHref="/restaurants"
      />
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("ErrorBoundary normal state has no accessibility violations", async () => {
    const { container } = render(
      <ErrorBoundary>
        <div>Content loaded successfully</div>
      </ErrorBoundary>
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("ErrorBoundary error fallback state has no accessibility violations", async () => {
    const ProblemChild = () => {
      throw new Error("Simulated component error");
    };

    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { container } = render(
      <ErrorBoundary>
        <ProblemChild />
      </ErrorBoundary>
    );
    spy.mockRestore();

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("MenuCard has no accessibility violations", async () => {
    const { container } = render(
      <AuthProvider>
        <CartProvider>
          <MenuCard
            item={{
              _id: "item-1",
              name: "Paneer Butter Masala",
              price: 220,
              description: "Rich and creamy curry",
              image: "/paneer.jpg",
              available: true,
            }}
            restaurant={{
              id: "rest-1",
              name: "Campus Bites",
              email: "bites@campus.edu",
            }}
          />
        </CartProvider>
      </AuthProvider>
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("OrderCard has no accessibility violations", async () => {
    const { container } = render(
      <AuthProvider>
        <OrderCard order={mockOrder} />
      </AuthProvider>
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("SubscriptionCard has no accessibility violations", async () => {
    const { container } = render(
      <SubscriptionCard
        subscription={mockSubscription}
        onPause={vi.fn()}
        onResume={vi.fn()}
        onCancel={vi.fn()}
        busy={null}
      />
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
