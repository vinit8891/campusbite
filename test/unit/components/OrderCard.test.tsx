import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { OrderCard } from "@/components/orders/OrderCard";
import type { Order } from "@/types";

const mockOrder: Order = {
  _id: "order-1",
  customer_name: "John Doe",
  restaurant_name: "Campus Diner",
  restaurant_cuisine: "North Indian",
  restaurant_email: "diner@campus.edu",
  phone: "9876543210",
  address: "Hostel 4, Room 201",
  status: "Accepted",
  payment_method: "cod",
  payment_status: "pending",
  total: 250,
  items: [
    {
      id: "1",
      name: "Paneer Butter Masala",
      price: 250,
      quantity: 1,
    },
  ],
};

describe("OrderCard component", () => {
  it("renders order summary, restaurant name, and items", () => {
    render(<OrderCard order={mockOrder} />);

    expect(screen.getByText("Campus Diner")).toBeInTheDocument();
    expect(screen.getByText("Paneer Butter Masala")).toBeInTheDocument();
    expect(screen.getByText("Accepted")).toBeInTheDocument();
  });

  it("renders live tracking action for active orders", () => {
    render(<OrderCard order={mockOrder} />);

    const trackLink = screen.getByRole("link", { name: /track order/i });
    expect(trackLink).toHaveAttribute("href", "/track-order/order-1");
  });
});
