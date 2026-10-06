import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import RestaurantSettlementsPage from "@/components/restaurant/RestaurantSettlementsPage";

describe("RestaurantSettlementsPage", () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem("restaurantToken", "test-token");
    localStorage.setItem(
      "restaurantOwner",
      JSON.stringify({ email: "taj@campusbite.in", name: "Taj Canteen" })
    );

    // Add mock delivered orders
    // Food subtotal = ₹1000
    // Statutory GST (5%) = ₹50
    // Commission (18%) = ₹180
    // Net Payable = 1000 + 50 - 180 = ₹870.00
    localStorage.setItem(
      "cb_orders",
      JSON.stringify([
        {
          _id: "ord-test-1",
          restaurant_email: "taj@campusbite.in",
          restaurant_name: "Taj Canteen",
          status: "Delivered",
          food_subtotal: 1000,
          commission_amount: 180,
          restaurant_gst: 50,
          delivery_fee: 15,
          platform_fee: 3,
          tip_amount: 10,
          total: 1078,
          created_at: new Date().toISOString(),
          items: [{ name: "Special Thali Combo", price: 500, quantity: 2 }],
        },
      ])
    );
  });

  it("renders live day metric cards and asserts net payable calculates as Gross + 5% GST - 18% Commission", async () => {
    render(<RestaurantSettlementsPage />);

    await waitFor(() => {
      expect(
        screen.getByText("Settlements & Daily Payouts")
      ).toBeInTheDocument();
    });

    // Metric 1: Today's Gross Food Sales
    expect(screen.getByText("Today's Gross Food Sales")).toBeInTheDocument();
    expect(screen.getAllByText("1000.00").length).toBeGreaterThan(0);

    // Metric 2: Commission Retained (-18%)
    expect(screen.getByText("Commission Retained")).toBeInTheDocument();
    expect(screen.getAllByText("-₹180.00").length).toBeGreaterThan(0);

    // Metric 3: Statutory GST (+5%)
    expect(screen.getByText("Statutory GST (+5%)")).toBeInTheDocument();
    expect(screen.getAllByText("+₹50.00").length).toBeGreaterThan(0);

    // Metric 4: Today's Net Payable (₹870.00)
    expect(screen.getByText("Today's Net Payable")).toBeInTheDocument();
    expect(screen.getAllByText("₹870.00").length).toBeGreaterThan(0);

    // Scheduled badge
    expect(
      screen.getByText("⏰ Scheduled for 9:00 PM Batch Transfer")
    ).toBeInTheDocument();
  });

  it("renders historical settlements ledger and opens print slip modal with complete line-item breakdown", async () => {
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

    // Complete line-item assertions in printable slip
    expect(screen.getAllByText("Taj Canteen").length).toBeGreaterThan(0);
    expect(screen.getAllByText("taj@campusbite.in").length).toBeGreaterThan(0);
    expect(screen.getByText("Gross Food Sales Subtotal:")).toBeInTheDocument();
    expect(screen.getAllByText("₹1000.00").length).toBeGreaterThan(0);

    expect(screen.getByText("Food GST Added (5%):")).toBeInTheDocument();
    expect(screen.getAllByText("+₹50.00").length).toBeGreaterThan(0);

    expect(
      screen.getByText("CampusBite Platform Commission (18%):")
    ).toBeInTheDocument();
    expect(screen.getAllByText("-₹180.00").length).toBeGreaterThan(0);

    expect(screen.getByText("Net Disbursed to Canteen:")).toBeInTheDocument();
    expect(screen.getAllByText("₹870.00").length).toBeGreaterThan(0);

    expect(screen.getByText("Print / Download Slip")).toBeInTheDocument();
  });
});
