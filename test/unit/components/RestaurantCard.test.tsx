import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { RestaurantCard } from "@/components/order-details/RestaurantCard";
import type { Order } from "@/types/orders";

describe("RestaurantCard", () => {
  it("renders with default values when order has no restaurant snapshot", () => {
    render(<RestaurantCard order={null} />);

    expect(screen.getByText("Campus Canteen")).toBeInTheDocument();
    expect(screen.getByText("Zeal College Campus, Narhe")).toBeInTheDocument();
    expect(screen.getByText("📍 Open Location in Maps")).toBeInTheDocument();

    const mapLink = screen.getByRole("link", { name: /open location in maps/i });
    expect(mapLink).toHaveAttribute(
      "href",
      "https://www.google.com/maps/search/?api=1&query=18.4485,73.8242"
    );
  });

  it("renders restaurant details from restaurant_info snapshot with phone link", () => {
    const mockOrder: Partial<Order> = {
      restaurant_name: "Central Cafeteria",
      restaurant_info: {
        name: "Central Cafeteria",
        address: "Zeal Campus Food Court, Narhe",
        phone: "+919876543210",
        latitude: 18.449,
        longitude: 73.825,
      },
    };

    render(<RestaurantCard order={mockOrder} />);

    expect(screen.getByText("Central Cafeteria")).toBeInTheDocument();
    expect(screen.getByText("Zeal Campus Food Court, Narhe")).toBeInTheDocument();

    const mapLink = screen.getByRole("link", { name: /open location in maps/i });
    expect(mapLink).toHaveAttribute(
      "href",
      "https://www.google.com/maps/search/?api=1&query=18.449,73.825"
    );

    const phoneLink = screen.getByRole("link", { name: /call kitchen/i });
    expect(phoneLink).toHaveAttribute("href", "tel:+919876543210");
  });

  it("prefers stall_location when address is not provided", () => {
    const mockOrder: Partial<Order> = {
      restaurant: {
        name: "Zeal Maggi Point",
        stall_location: "Engineering Building Ground Floor",
        latitude: 18.4488,
        longitude: 73.8245,
      },
    };

    render(<RestaurantCard order={mockOrder} />);

    expect(screen.getByText("Zeal Maggi Point")).toBeInTheDocument();
    expect(screen.getByText("Engineering Building Ground Floor")).toBeInTheDocument();

    const mapLink = screen.getByRole("link", { name: /open location in maps/i });
    expect(mapLink).toHaveAttribute(
      "href",
      "https://www.google.com/maps/search/?api=1&query=18.4488,73.8245"
    );
  });
});
