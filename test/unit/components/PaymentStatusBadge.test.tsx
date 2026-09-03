import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { PaymentStatusBadge } from "@/components/common/PaymentStatusBadge";

describe("PaymentStatusBadge component", () => {
  it("renders paid status with green styling", () => {
    render(<PaymentStatusBadge status="paid" method="online" />);
    const badge = screen.getByText("Paid");
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass("bg-green-100");
  });

  it("renders COD pending label with appropriate blue styling", () => {
    render(<PaymentStatusBadge status="pending" method="cod" orderStatus="Out for Delivery" />);
    const badge = screen.getByText("Pending — pay on delivery");
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass("bg-blue-100");
  });

  it("renders COD paid status as Paid (Cash) with green styling", () => {
    render(<PaymentStatusBadge status="paid" method="cod" orderStatus="Delivered" />);
    const badge = screen.getByText("Paid (Cash)");
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass("bg-green-100");
  });

  it("falls back to Paid (Cash) for legacy delivered COD orders with pending status", () => {
    render(<PaymentStatusBadge status="pending" method="cod" orderStatus="delivered" />);
    const badge = screen.getByText("Paid (Cash)");
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass("bg-green-100");
  });
});
