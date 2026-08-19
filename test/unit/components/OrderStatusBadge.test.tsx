import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { OrderStatusBadge } from "@/components/common/OrderStatusBadge";

describe("OrderStatusBadge component", () => {
  it("renders status pill with appropriate label and colors", () => {
    render(<OrderStatusBadge status="Accepted" />);
    const badge = screen.getByText("Accepted");
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass("bg-blue-100");
  });

  it("renders dot variant with indicator circle", () => {
    const { container } = render(<OrderStatusBadge status="Delivered" variant="dot" />);
    expect(screen.getByText("Delivered")).toBeInTheDocument();
    expect(container.querySelector(".bg-green-500")).toBeInTheDocument();
  });

  it("handles empty or null status gracefully", () => {
    render(<OrderStatusBadge status={null} />);
    expect(screen.getByText("—")).toBeInTheDocument();
  });
});
