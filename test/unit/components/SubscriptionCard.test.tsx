import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SubscriptionCard } from "@/components/subscriptions/SubscriptionCard";
import type { Subscription } from "@/types";

const mockSub: Subscription = {
  subscription_id: "sub-1",
  plan_id: "plan-1",
  customer_email: "student@campus.edu",
  restaurant_email: "diner@campus.edu",
  meal_type: "lunch",
  subscription_type: "monthly",
  status: "active",
  start_date: "2026-08-01",
  end_date: "2026-08-31",
  price: 2400,
  payment_status: "paid",
  auto_renew: true,
  skipped_dates: [],
  pause_from: null,
  pause_to: null,
  delivery_days: ["monday", "tuesday", "wednesday", "thursday", "friday"],
};

describe("SubscriptionCard component", () => {
  it("renders subscription details and status", () => {
    render(
      <SubscriptionCard
        subscription={mockSub}
        onPause={vi.fn()}
        onResume={vi.fn()}
        onCancel={vi.fn()}
        busy={null}
      />
    );

    expect(screen.getByText("lunch · monthly")).toBeInTheDocument();
    expect(screen.getByText("diner@campus.edu")).toBeInTheDocument();
    expect(screen.getByText("₹2400.00")).toBeInTheDocument();
  });

  it("handles pause action callback", async () => {
    const handlePause = vi.fn();
    const user = userEvent.setup();

    render(
      <SubscriptionCard
        subscription={mockSub}
        onPause={handlePause}
        onResume={vi.fn()}
        onCancel={vi.fn()}
        busy={null}
      />
    );

    const pauseBtn = screen.getByRole("button", { name: /pause/i });
    await user.click(pauseBtn);
    expect(handlePause).toHaveBeenCalledWith("sub-1");
  });
});
