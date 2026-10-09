import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { WeeklyMessSelector, CAMPUS_HOSTEL_BLOCKS } from "@/components/subscription/WeeklyMessSelector";
import * as subscriptionService from "@/services/subscriptionService";
import type { Subscription } from "@/types";

vi.mock("@/services/subscriptionService", () => ({
  createSubscription: vi.fn(),
}));

describe("WeeklyMessSelector Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders Weekly 7-Day Pass by default with Walk-in fulfillment", () => {
    render(
      <WeeklyMessSelector
        restaurantEmail="northmess@campus.edu"
        restaurantName="North Campus Mess"
        isLoggedIn={true}
      />
    );

    expect(screen.getByText(/Weekly 7-Day Pass/i)).toBeInTheDocument();
    expect(screen.getByText(/Monthly 30-Day Pass/i)).toBeInTheDocument();
    expect(screen.getByText(/North Campus Mess/i)).toBeInTheDocument();
    expect(screen.getByTestId("pref-dine-in")).toBeInTheDocument();
    expect(screen.getByTestId("pref-hostel-delivery")).toBeInTheDocument();

    // Base food: ₹560, Platform fee: ₹25, Delivery: ₹0 -> Total ₹585
    expect(screen.getAllByText(/₹585/i).length).toBeGreaterThan(0);
  });

  it("updates price and shows hostel dropdown when Hostel Lobby Drop is selected", async () => {
    const user = userEvent.setup();
    render(
      <WeeklyMessSelector
        restaurantEmail="northmess@campus.edu"
        restaurantName="North Campus Mess"
        isLoggedIn={true}
      />
    );

    const hostelDropButton = screen.getByTestId("pref-hostel-delivery");
    await user.click(hostelDropButton);

    // Delivery add-on: 7 * ₹15 = ₹105. Total: ₹560 + ₹105 + ₹25 = ₹690
    expect(screen.getAllByText(/690/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Select Hostel Drop Location/i)).toBeInTheDocument();
    expect(screen.getByDisplayValue(CAMPUS_HOSTEL_BLOCKS[0])).toBeInTheDocument();
  });

  it("updates pricing when switching to Monthly 30-Day Pass", async () => {
    const user = userEvent.setup();
    render(
      <WeeklyMessSelector
        restaurantEmail="northmess@campus.edu"
        restaurantName="North Campus Mess"
        isLoggedIn={true}
      />
    );

    const monthlyTab = screen.getByTestId("tab-monthly");
    await user.click(monthlyTab);

    // Monthly 30 days lunch dine-in: 30 * 80 = 2400 + 75 platform fee = ₹2475
    expect(screen.getAllByText(/2475/i).length).toBeGreaterThan(0);
  });

  it("submits subscription purchase with structured weekly pricing and delivery preference", async () => {
    const user = userEvent.setup();
    const onCreatedMock = vi.fn();
    const mockCreatedSub: Partial<Subscription> = {
      subscription_id: "sub-weekly-99",
      plan_type: "WEEKLY",
      delivery_preference: "HOSTEL_LOBBY_DELIVERY",
      price: 690,
      base_meal_price: 80,
      delivery_addon: 105,
      platform_fee: 25,
      status: "active",
    };

    vi.mocked(subscriptionService.createSubscription).mockResolvedValueOnce(
      mockCreatedSub as Subscription
    );

    render(
      <WeeklyMessSelector
        restaurantEmail="northmess@campus.edu"
        restaurantName="North Campus Mess"
        isLoggedIn={true}
        onSubscriptionCreated={onCreatedMock}
      />
    );

    // Switch to hostel lobby delivery
    const hostelDropButton = screen.getByTestId("pref-hostel-delivery");
    await user.click(hostelDropButton);

    const purchaseButton = screen.getByTestId("btn-activate-pass");
    await user.click(purchaseButton);

    await waitFor(() => {
      expect(subscriptionService.createSubscription).toHaveBeenCalledTimes(1);
    });

    expect(subscriptionService.createSubscription).toHaveBeenCalledWith(
      expect.objectContaining({
        restaurant_email: "northmess@campus.edu",
        plan_type: "WEEKLY",
        delivery_preference: "HOSTEL_LOBBY_DELIVERY",
        price: 690,
        base_meal_price: 80,
        meals_count: 7,
        delivery_addon: 105,
        platform_fee: 25,
      })
    );

    expect(onCreatedMock).toHaveBeenCalledWith(mockCreatedSub);
  });
});
