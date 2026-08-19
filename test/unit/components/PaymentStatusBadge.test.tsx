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
    render(<PaymentStatusBadge status="pending" method="cod" />);
    const badge = screen.getByText("Pending — pay on delivery");
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass("bg-blue-100");
  });
});
