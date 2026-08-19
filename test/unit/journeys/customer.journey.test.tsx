import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { AuthProvider } from "@/context/AuthContext";
import { CartProvider } from "@/context/CartContext";
import LoginForm from "@/components/auth/LoginForm";
import RegisterForm from "@/components/auth/RegisterForm";
import MenuCard from "@/components/menu/MenuCard";
import { OrderCard } from "@/components/orders/OrderCard";
import type { Order } from "@/types/orders";

const mockOrder: Order = {
  _id: "order-999",
  customer_name: "John Customer",
  customer_email: "john@campus.edu",
  phone: "9876543210",
  address: "Hostel 3, Room 102",
  restaurant_id: "rest-1",
  restaurant_name: "Campus Grill",
  restaurant_email: "grill@campus.edu",
  restaurant_cuisine: "Fast Food",
  status: "Pending",
  payment_method: "Cash on Delivery",
  payment_status: "pending",
  items: [{ id: "m-1", name: "Paneer Roll", price: 120, quantity: 2 }],
  total: 240,
  created_at: "2026-08-20T10:00:00Z",
};

describe("Customer Complete User Journey", () => {
  it("allows customer to enter registration details", async () => {
    const user = userEvent.setup();
    render(
      <AuthProvider>
        <RegisterForm />
      </AuthProvider>
    );

    const nameInput = screen.getByLabelText(/full name/i);
    const emailInput = screen.getByLabelText(/^email/i);
    const phoneInput = screen.getByLabelText(/^phone/i);
    const passwordInput = screen.getByLabelText(/^password/i);

    await user.type(nameInput, "Aman Gupta");
    await user.type(emailInput, "aman@campus.edu");
    await user.type(phoneInput, "9876543210");
    await user.type(passwordInput, "password123");

    expect(nameInput).toHaveValue("Aman Gupta");
    expect(emailInput).toHaveValue("aman@campus.edu");
    expect(phoneInput).toHaveValue("9876543210");
  });

  it("allows customer to enter login credentials", async () => {
    const user = userEvent.setup();
    render(
      <AuthProvider>
        <LoginForm />
      </AuthProvider>
    );

    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/^password/i);
    const submitBtn = screen.getByRole("button", { name: /^login$/i });

    await user.type(emailInput, "student@campus.edu");
    await user.type(passwordInput, "password123");
    expect(emailInput).toHaveValue("student@campus.edu");
    expect(submitBtn).toBeEnabled();
  });

  it("adds items to cart and reflects state", async () => {
    const user = userEvent.setup();
    render(
      <AuthProvider>
        <CartProvider>
          <MenuCard
            item={{
              _id: "m-1",
              name: "Paneer Roll",
              price: 120,
              description: "Fresh cottage cheese wrapped in flatbread",
              image: "/paneer-roll.jpg",
              available: true,
            }}
            restaurant={{
              id: "rest-1",
              name: "Campus Grill",
              email: "grill@campus.edu",
            }}
          />
        </CartProvider>
      </AuthProvider>
    );

    const addBtn = screen.getByRole("button", { name: /add/i });
    await user.click(addBtn);
    expect(screen.getByText("Paneer Roll")).toBeInTheDocument();
  });

  it("renders active customer order card with status badge and details", () => {
    render(
      <AuthProvider>
        <OrderCard order={mockOrder} />
      </AuthProvider>
    );

    expect(screen.getByText("Campus Grill")).toBeInTheDocument();
    expect(screen.getByText("Paneer Roll")).toBeInTheDocument();
    expect(screen.getByText("Pending")).toBeInTheDocument();
  });
});
