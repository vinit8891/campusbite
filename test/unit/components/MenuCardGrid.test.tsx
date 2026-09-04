import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MenuCardGrid } from "@/components/restaurant/MenuCardGrid";
import { MenuFilterBar, getCategoryEmoji } from "@/components/restaurant/MenuFilterBar";
import type { MenuItem } from "@/types";

const mockMenuItems: MenuItem[] = [
  {
    _id: "m-1",
    name: "Special Paneer Thali",
    description: "Served with 3 butter rotis, dal makhani, and rice",
    price: 180,
    category: "Meals",
    available: true,
    image: "/images/food/thali.jpg",
  },
  {
    _id: "m-2",
    name: "Masala Chai",
    description: "Hot spiced campus tea",
    price: 20,
    category: "Beverages",
    available: false,
    image: "/images/food/chai.jpg",
  },
];

describe("MenuCardGrid & MenuFilterBar", () => {
  it("renders menu items with 1-tap stock toggle buttons and triggers availability change", async () => {
    const handleToggle = vi.fn();
    const handleDelete = vi.fn();
    const user = userEvent.setup();

    render(
      <MenuCardGrid
        menu={mockMenuItems}
        updatingId={null}
        onToggleAvailability={handleToggle}
        onDeleteItem={handleDelete}
      />
    );

    expect(screen.getByText("Special Paneer Thali")).toBeInTheDocument();
    expect(screen.getByText("₹180.00")).toBeInTheDocument();
    expect(screen.getByText("✅ In Stock")).toBeInTheDocument();

    const inStockToggle = screen.getByRole("button", {
      name: /in stock \(tap to pause\)/i,
    });
    await user.click(inStockToggle);
    expect(handleToggle).toHaveBeenCalledWith(mockMenuItems[0]);

    // Out of stock item
    expect(screen.getByText("Masala Chai")).toBeInTheDocument();
    expect(screen.getByText("❌ Sold Out")).toBeInTheDocument();
  });

  it("renders category chips with emojis and triggers category selection", async () => {
    const handleCategoryChange = vi.fn();
    const handleSearch = vi.fn((e) => e.preventDefault());
    const user = userEvent.setup();

    render(
      <MenuFilterBar
        q=""
        setQ={vi.fn()}
        category=""
        setCategory={vi.fn()}
        availability=""
        setAvailability={vi.fn()}
        categories={["Meals", "Beverages", "Snacks"]}
        loading={false}
        onSearchSubmit={handleSearch}
        onCategoryChange={handleCategoryChange}
        onAvailabilityChange={vi.fn()}
      />
    );

    expect(screen.getByRole("button", { name: /all items/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /meals/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /beverages/i })).toBeInTheDocument();

    const mealsBtn = screen.getByRole("button", { name: /meals/i });
    await user.click(mealsBtn);
    expect(handleCategoryChange).toHaveBeenCalledWith("Meals");
  });

  it("maps categories to appropriate emojis", () => {
    expect(getCategoryEmoji("Meals")).toBe("🍛");
    expect(getCategoryEmoji("Snacks")).toBe("🥪");
    expect(getCategoryEmoji("Beverages")).toBe("🥤");
    expect(getCategoryEmoji("Dessert")).toBe("🍨");
    expect(getCategoryEmoji("Pizza")).toBe("🍕");
    expect(getCategoryEmoji("Unknown")).toBe("🍽️");
  });
});
