import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StudentMealPassCard } from "@/components/subscriptions/StudentMealPassCard";
import { MessCounterScanner } from "@/components/restaurant/MessCounterScanner";
import type { Subscription } from "@/types";
import * as subscriptionService from "@/services/subscriptionService";
import { AUTH_STORAGE_KEYS } from "@/lib/authTokens";

const mockSub: Subscription = {
  subscription_id: "sub-101",
  plan_id: "plan-north-veg",
  customer_email: "rahul.sharma@campus.edu",
  restaurant_email: "northmess@campus.edu",
  meal_type: "lunch",
  subscription_type: "monthly",
  status: "active",
  start_date: "2026-09-01",
  end_date: "2026-09-30",
  price: 2400,
  payment_status: "paid",
  auto_renew: true,
  skipped_dates: [],
  pause_from: null,
  pause_to: null,
  delivery_days: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday"],
};

describe("Mess Subscription Dining & Digital Meal Pass", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    localStorage.setItem(AUTH_STORAGE_KEYS.restaurantToken, "fake-restaurant-token");
    localStorage.setItem(
      AUTH_STORAGE_KEYS.restaurantOwner,
      JSON.stringify({ email: "northmess@campus.edu", name: "North Mess" })
    );
  });

  describe("StudentMealPassCard Component", () => {
    it("renders student credentials, eatery tier, token, and QR code", () => {
      render(
        <StudentMealPassCard
          subscription={mockSub}
          studentName="Rahul Sharma"
          studentRoll="22CS104"
          studentPhone="+91 98765 43210"
          canteenName="North Mess"
        />
      );

      expect(screen.getByText("Rahul Sharma")).toBeInTheDocument();
      expect(screen.getAllByText(/North Mess/i).length).toBeGreaterThan(0);
      expect(screen.getByText(/Roll: 22CS104/i)).toBeInTheDocument();
      expect(screen.getByText(/\+91 98765 43210/i)).toBeInTheDocument();
      expect(screen.getByText(/Daily Meal Pass/i)).toBeInTheDocument();
      expect(screen.getByText(/TOKEN #/i)).toBeInTheDocument();
      expect(screen.getByTestId("meal-pass-qr-code")).toBeInTheDocument();
    });

    it("displays dynamic service window badge", () => {
      render(
        <StudentMealPassCard
          subscription={mockSub}
          studentName="Rahul Sharma"
        />
      );

      // Service window badge should be rendered
      expect(screen.getByTestId("service-window-badge")).toBeInTheDocument();
    });

    it("opens skip confirmation dialog and triggers skip tomorrow action", async () => {
      const user = userEvent.setup();
      const skipSpy = vi.spyOn(subscriptionService, "skipSubscriptionDate").mockResolvedValue({
        message: "Tomorrow's lunch skipped! Validity extended +1 day 🎉",
        subscription: {
          ...mockSub,
          skipped_dates: ["2026-09-06"],
        },
        skipped_date: "2026-09-06",
        new_end_date: "2026-10-01",
      });

      const handleUpdated = vi.fn();

      render(
        <StudentMealPassCard
          subscription={mockSub}
          studentName="Rahul Sharma"
          onSubscriptionUpdated={handleUpdated}
        />
      );

      const skipBtn = screen.getByRole("button", { name: /skip tomorrow's lunch/i });
      expect(skipBtn).toBeInTheDocument();
      await user.click(skipBtn);

      // Confirmation dialog should be visible
      expect(screen.getByText(/Confirm Skipping Tomorrow's lunch/i)).toBeInTheDocument();
      expect(screen.getByText(/Validity will automatically be extended by \+1 day/i)).toBeInTheDocument();

      const confirmBtn = screen.getByRole("button", { name: /yes, skip lunch/i });
      await user.click(confirmBtn);

      await waitFor(() => {
        expect(skipSpy).toHaveBeenCalled();
        expect(handleUpdated).toHaveBeenCalled();
      });
    });

    it("renders skipped confirmation chip when tomorrow is already skipped", () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split("T")[0];

      const skippedSub: Subscription = {
        ...mockSub,
        skipped_dates: [tomorrowStr],
      };

      render(
        <StudentMealPassCard
          subscription={skippedSub}
          studentName="Rahul Sharma"
        />
      );

      expect(screen.getByTestId("skip-confirmation-chip")).toBeInTheDocument();
      expect(screen.getByText(/Tomorrow's lunch Skipped/i)).toBeInTheDocument();
      expect(screen.getByText(/\+1 Day Extended/i)).toBeInTheDocument();
    });
  });

  describe("MessCounterScanner Component", () => {
    it("renders counter metrics, keypad, and scanner controls", async () => {
      render(<MessCounterScanner restaurantEmail="northmess@campus.edu" />);

      expect(screen.getByText(/Meals Served Today/i)).toBeInTheDocument();
      expect(screen.getByText(/Current Window/i)).toBeInTheDocument();

      // Stats should load from MSW mock
      await waitFor(() => {
        expect(screen.getByText("142")).toBeInTheDocument();
        expect(screen.getByText(/210 active/i)).toBeInTheDocument();
      });

      // Keypad buttons 0-9, Clear, Backspace
      expect(screen.getByRole("button", { name: "1" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "9" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /clear/i })).toBeInTheDocument();
    });

    it("allows entering 4-digit token via keypad and clears input", async () => {
      const user = userEvent.setup();
      render(<MessCounterScanner restaurantEmail="northmess@campus.edu" />);

      await user.click(screen.getByRole("button", { name: "4" }));
      await user.click(screen.getByRole("button", { name: "8" }));
      await user.click(screen.getByRole("button", { name: "2" }));
      await user.click(screen.getByRole("button", { name: "1" }));

      const display = screen.getByTestId("keypad-display-input");
      expect(display).toHaveValue("4821");

      const clearBtn = screen.getByRole("button", { name: /clear/i });
      await user.click(clearBtn);
      expect(display).toHaveValue("");
    });

    it("verifies and redeems valid meal token with instant success feedback", async () => {
      const user = userEvent.setup();
      render(<MessCounterScanner restaurantEmail="northmess@campus.edu" />);

      const display = screen.getByTestId("keypad-display-input");
      await user.type(display, "4821");

      const verifyBtn = screen.getByRole("button", { name: /verify & serve meal/i });
      await user.click(verifyBtn);

      await waitFor(() => {
        expect(screen.getByTestId("redemption-success-banner")).toBeInTheDocument();
        expect(screen.getAllByText(/Rahul Sharma/i).length).toBeGreaterThan(0);
      });

      // Should appear in live redemption activity stream
      expect(screen.getByText(/Live Redemption Stream/i)).toBeInTheDocument();
    });

    it("handles invalid or expired token with warning alert", async () => {
      const user = userEvent.setup();
      render(<MessCounterScanner restaurantEmail="northmess@campus.edu" />);

      const display = screen.getByTestId("keypad-display-input");
      await user.type(display, "9999");

      const verifyBtn = screen.getByRole("button", { name: /verify & serve meal/i });
      await user.click(verifyBtn);

      await waitFor(() => {
        expect(screen.getByText(/Invalid meal token or no active subscription found/i)).toBeInTheDocument();
      });
    });

    it("switches to camera QR scanner mode and allows simulated scan", async () => {
      const user = userEvent.setup();
      render(<MessCounterScanner restaurantEmail="northmess@campus.edu" />);

      const qrTab = screen.getByRole("button", { name: /qr code scanner/i });
      await user.click(qrTab);

      expect(screen.getByText(/Align Student QR Here/i)).toBeInTheDocument();
      expect(screen.getByText(/Scanner Simulation \/ Quick Tokens:/i)).toBeInTheDocument();

      const simulateBtn = screen.getByRole("button", { name: /scan #4821/i });
      await user.click(simulateBtn);

      await waitFor(() => {
        expect(screen.getByTestId("redemption-success-banner")).toBeInTheDocument();
      });
    });
  });
});
