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

    expect(screen.getAllByText("Special Paneer Thali").length).toBeGreaterThan(0);
    expect(screen.getAllByText("₹180.00").length).toBeGreaterThan(0);
    expect(screen.getAllByText(/in stock/i).length).toBeGreaterThan(0);

    const inStockToggleButtons = screen.getAllByRole("button", {
      name: /in stock \(tap to pause\)/i,
    });
    expect(inStockToggleButtons.length).toBeGreaterThan(0);
    await user.click(inStockToggleButtons[0]);
    expect(handleToggle).toHaveBeenCalledWith(mockMenuItems[0]);

    // Out of stock item
    expect(screen.getAllByText("Masala Chai").length).toBeGreaterThan(0);
    expect(screen.getAllByText(/sold out/i).length).toBeGreaterThan(0);
  });

  it("triggers delete item callback when mobile delete button is clicked", async () => {
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

    const deleteBtn = screen.getByRole("button", {
      name: /delete special paneer thali/i,
    });
    await user.click(deleteBtn);
    expect(handleDelete).toHaveBeenCalledWith("m-1", "Special Paneer Thali");
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

  it("renders 1-tap stock filter chips and triggers availability filtering", async () => {
    const handleAvailabilityChange = vi.fn();
    const user = userEvent.setup();

    render(
      <MenuFilterBar
        q=""
        setQ={vi.fn()}
        category=""
        setCategory={vi.fn()}
        availability=""
        setAvailability={vi.fn()}
        categories={["Meals"]}
        loading={false}
        onSearchSubmit={vi.fn()}
        onCategoryChange={vi.fn()}
        onAvailabilityChange={handleAvailabilityChange}
        inStockCount={5}
        soldOutCount={2}
        totalCount={7}
      />
    );

    expect(screen.getByRole("button", { name: /🟢 in stock/i })).toBeInTheDocument();
    expect(screen.getByText("(5)")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /🔴 sold out/i })).toBeInTheDocument();
    expect(screen.getByText("(2)")).toBeInTheDocument();

    const inStockChip = screen.getByRole("button", { name: /🟢 in stock/i });
    await user.click(inStockChip);
    expect(handleAvailabilityChange).toHaveBeenCalledWith("true");
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
