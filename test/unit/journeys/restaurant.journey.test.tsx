import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import RestaurantLoginForm from "@/components/restaurant/RestaurantLoginForm";
import { RestaurantOrderActions } from "@/components/restaurant/RestaurantOrderActions";
import type { Order } from "@/types/orders";

const mockRestaurantOrder: Order = {
  _id: "order-rest-1",
  customer_name: "Aman Gupta",
  customer_email: "aman@campus.edu",
  phone: "9876543210",
  address: "Hostel 4, Room 301",
  restaurant_id: "rest-1",
  restaurant_name: "Campus Grill",
  restaurant_email: "grill@campus.edu",
  restaurant_cuisine: "Fast Food",
  status: "Pending",
  payment_method: "Cash on Delivery",
  payment_status: "pending",
  items: [{ id: "m-1", name: "Veg Thali", price: 150, quantity: 1 }],
  total: 150,
  created_at: new Date().toISOString(),
};

describe("Restaurant Owner User Journey", () => {
  it("allows restaurant owner to enter credentials in login form", async () => {
    const user = userEvent.setup();
    render(<RestaurantLoginForm />);

    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/^password/i);

    await user.type(emailInput, "owner@campusgrill.com");
    await user.type(passwordInput, "ownerpass123");

    expect(emailInput).toHaveValue("owner@campusgrill.com");
    expect(passwordInput).toHaveValue("ownerpass123");
  });

  it("renders incoming order and allows status update interaction", async () => {
    const handleStatusUpdate = vi.fn();
    const user = userEvent.setup();

    render(
      <RestaurantOrderActions
        order={mockRestaurantOrder}
        onUpdateStatus={handleStatusUpdate}
      />
    );

    const acceptBtn = screen.getByRole("button", { name: /accept/i });
    expect(acceptBtn).toBeEnabled();
    await user.click(acceptBtn);
    expect(handleStatusUpdate).toHaveBeenCalledWith("order-rest-1", "Accepted");
  });
});
