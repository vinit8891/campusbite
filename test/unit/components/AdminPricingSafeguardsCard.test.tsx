import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { AdminPricingSafeguardsCard } from "@/components/admin/AdminPricingSafeguardsCard";

describe("AdminPricingSafeguardsCard Component", () => {
  it("renders all active pricing safeguards and policies", () => {
    render(<AdminPricingSafeguardsCard />);

    // Header
    expect(
      screen.getByText("Active Platform Pricing Safeguards")
    ).toBeInTheDocument();
    expect(screen.getByText("Live Enforced")).toBeInTheDocument();

    // Minimum Delivery Subtotal: ₹35.00
    expect(screen.getByText("Minimum Delivery Subtotal")).toBeInTheDocument();
    expect(screen.getByText("₹35.00")).toBeInTheDocument();
    expect(screen.getByText(/Counter Takeaway exempt/i)).toBeInTheDocument();

    // Small Order Threshold: ₹50.00 & +₹5.00
    expect(screen.getByText("Small Order Threshold")).toBeInTheDocument();
    expect(screen.getByText("₹50.00")).toBeInTheDocument();
    expect(screen.getByText("(Surcharge: +₹5.00)")).toBeInTheDocument();

    // Canteen Commission Rate: 18.0%
    expect(screen.getByText("Canteen Commission Rate")).toBeInTheDocument();
    expect(screen.getByText("18.0%")).toBeInTheDocument();
    expect(screen.getByText(/Standard 18.0% platform take rate/i)).toBeInTheDocument();

    // Rider Base Payout & CIH Limit: ₹20.00 & ₹500.00
    expect(screen.getByText("Rider Base Payout & CIH Limit")).toBeInTheDocument();
    expect(screen.getByText("₹20.00")).toBeInTheDocument();
    expect(screen.getByText("(CIH Ceiling: ₹500.00)")).toBeInTheDocument();
    expect(screen.getByText(/Hard Lockout Active/i)).toBeInTheDocument();
  });
});
