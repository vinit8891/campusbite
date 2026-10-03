import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import RestaurantSettlementsPage from "@/app/restaurant/dashboard/settlements/page";

describe("RestaurantSettlementsPage", () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem("restaurantToken", "test-token");
    localStorage.setItem(
      "restaurantOwner",
      JSON.stringify({ email: "taj@campusbite.in", name: "Taj Canteen" })
    );

    // Add mock delivered orders
    localStorage.setItem(
      "cb_orders",
      JSON.stringify([
        {
          _id: "ord-test-1",
          restaurant_email: "taj@campusbite.in",
          restaurant_name: "Taj Canteen",
          status: "Delivered",
          food_subtotal: 1000,
          commission_amount: 80,
          total: 1080,
          created_at: new Date().toISOString(),
        },
      ])
    );
  });

  it("renders live day metric cards with today net payable", async () => {
    render(<RestaurantSettlementsPage />);

    await waitFor(() => {
      expect(
        screen.getByText("Settlements & Daily Payouts")
      ).toBeInTheDocument();
    });

    expect(screen.getByText("Today's Net Payable")).toBeInTheDocument();
    expect(screen.getByText("Commission Retained")).toBeInTheDocument();
    expect(screen.getByText("Payout Destination")).toBeInTheDocument();
  });

  it("renders historical settlements table and opens print slip modal", async () => {
    render(<RestaurantSettlementsPage />);

    await waitFor(() => {
      expect(
        screen.getByText("Historical Settlements Ledger")
      ).toBeInTheDocument();
    });

    const printButtons = await screen.findAllByText("Print Slip");
    expect(printButtons.length).toBeGreaterThan(0);

    fireEvent.click(printButtons[0]);

    await waitFor(() => {
      expect(
        screen.getByText("Daily Settlement Voucher")
      ).toBeInTheDocument();
    });

    expect(
      screen.getByText("CampusBite Platform Commission:")
    ).toBeInTheDocument();
    expect(screen.getByText("Print / Download Slip")).toBeInTheDocument();
  });
});
