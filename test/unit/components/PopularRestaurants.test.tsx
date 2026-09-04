import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PopularRestaurants } from "@/components/home/PopularRestaurants";
import * as restaurantService from "@/services/restaurantService";
import type { BackendRestaurant } from "@/types";

const mockRestaurants: BackendRestaurant[] = [
  {
    _id: "rest-1",
    slug: "shree-thali",
    name: "Shree Pure Veg Mess",
    email: "shree@campus.edu",
    cuisine: "North Indian, Pure Veg, Mess Thali",
    description: "Authentic student thali and mess plans",
    image: "/images/rest1.jpg",
    rating: 4.8,
  },
  {
    _id: "rest-2",
    slug: "night-burger",
    name: "Midnight Burger & Rolls",
    email: "midnight@campus.edu",
    cuisine: "Burger, Fast Food, Late Night",
    description: "Open until 3 AM for late night hunger",
    image: "/images/rest2.jpg",
    rating: 4.6,
  },
  {
    _id: "rest-3",
    slug: "campus-canteen",
    name: "Campus Budget Canteen",
    email: "canteen@campus.edu",
    cuisine: "Snacks, Street Food, Budget",
    description: "Affordable budget bites under 99",
    image: "/images/rest3.jpg",
    rating: 4.5,
  },
];

describe("PopularRestaurants Component with Filter Chips", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(restaurantService, "getRestaurants").mockResolvedValue(mockRestaurants);
  });

  it("renders all eateries by default and displays all category chips", async () => {
    render(<PopularRestaurants />);

    await waitFor(() => {
      expect(screen.getByText("Shree Pure Veg Mess")).toBeInTheDocument();
    });

    expect(screen.getByText("Midnight Burger & Rolls")).toBeInTheDocument();
    expect(screen.getByText("Campus Budget Canteen")).toBeInTheDocument();

    expect(screen.getByText("All Eateries")).toBeInTheDocument();
    expect(screen.getByText("⚡ Under ₹99")).toBeInTheDocument();
    expect(screen.getByText("🌙 Late Night Cravings")).toBeInTheDocument();
    expect(screen.getByText("🍲 Mess Specials")).toBeInTheDocument();
    expect(screen.getByText("🌱 Pure Veg")).toBeInTheDocument();
  });

  it("filters eateries dynamically when clicking category chips", async () => {
    const user = userEvent.setup();
    render(<PopularRestaurants />);

    await waitFor(() => {
      expect(screen.getByText("Shree Pure Veg Mess")).toBeInTheDocument();
    });

    // Click "🌙 Late Night Cravings"
    const lateNightChip = screen.getByRole("button", { name: /🌙 late night cravings/i });
    await user.click(lateNightChip);

    expect(screen.getByText("Midnight Burger & Rolls")).toBeInTheDocument();
    expect(screen.queryByText("Shree Pure Veg Mess")).not.toBeInTheDocument();

    // Click "🌱 Pure Veg"
    const pureVegChip = screen.getByRole("button", { name: /🌱 pure veg/i });
    await user.click(pureVegChip);

    expect(screen.getByText("Shree Pure Veg Mess")).toBeInTheDocument();
    expect(screen.queryByText("Midnight Burger & Rolls")).not.toBeInTheDocument();

    // Click "All Eateries" to restore
    const allChip = screen.getByRole("button", { name: /all eateries/i });
    await user.click(allChip);

    expect(screen.getByText("Shree Pure Veg Mess")).toBeInTheDocument();
    expect(screen.getByText("Midnight Burger & Rolls")).toBeInTheDocument();
    expect(screen.getByText("Campus Budget Canteen")).toBeInTheDocument();
  });
});
