import { describe, it, expect } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../../utils/render";
import MenuCard from "@/components/menu/MenuCard";

const mockItem = {
  _id: "item-1",
  name: "Paneer Butter Masala",
  description: "Delicious rich curry with cottage cheese.",
  price: 220,
  image: "https://images.unsplash.com/photo-1631452180519-c014fe946bc7",
  available: true,
};

const mockRestaurant = {
  id: "rest-1",
  name: "Campus Diner",
  email: "diner@campus.edu",
};

describe("MenuCard component", () => {
  it("renders menu item details, price, and Add button", () => {
    renderWithProviders(
      <MenuCard item={mockItem} restaurant={mockRestaurant} />
    );

    expect(screen.getByText("Paneer Butter Masala")).toBeInTheDocument();
    expect(screen.getByText("₹220")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /add/i })).toBeInTheDocument();
  });

  it("handles Add to Cart interaction and updates quantity control", async () => {
    const user = userEvent.setup();

    renderWithProviders(
      <MenuCard item={mockItem} restaurant={mockRestaurant} />
    );

    const addBtn = screen.getByRole("button", { name: /add/i });
    await user.click(addBtn);

    // After adding, + / - buttons appear
    expect(screen.getByRole("button", { name: /increase/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /decrease/i })).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();
  });

  it("increments item quantity when + is clicked", async () => {
    const user = userEvent.setup();

    renderWithProviders(
      <MenuCard item={mockItem} restaurant={mockRestaurant} />
    );

    await user.click(screen.getByRole("button", { name: /add/i }));
    expect(screen.getByText("1")).toBeInTheDocument();

    const increaseBtn = screen.getByRole("button", { name: /increase/i });
    await user.click(increaseBtn);

    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("decrements item quantity when - is clicked and quantity > 1", async () => {
    const user = userEvent.setup();

    renderWithProviders(
      <MenuCard item={mockItem} restaurant={mockRestaurant} />
    );

    await user.click(screen.getByRole("button", { name: /add/i }));
    const increaseBtn = screen.getByRole("button", { name: /increase/i });
    await user.click(increaseBtn);
    expect(screen.getByText("2")).toBeInTheDocument();

    const decreaseBtn = screen.getByRole("button", { name: /decrease/i });
    await user.click(decreaseBtn);
    expect(screen.getByText("1")).toBeInTheDocument();
  });

  it("removes item and restores Add button when - is clicked and quantity is 1", async () => {
    const user = userEvent.setup();

    renderWithProviders(
      <MenuCard item={mockItem} restaurant={mockRestaurant} />
    );

    await user.click(screen.getByRole("button", { name: /add/i }));
    expect(screen.getByText("1")).toBeInTheDocument();

    const decreaseBtn = screen.getByRole("button", { name: /decrease/i });
    await user.click(decreaseBtn);

    expect(screen.queryByText("1")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /add/i })).toBeInTheDocument();
  });
});
