import React from "react";
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { axe } from "vitest-axe";

import LoginForm from "@/components/auth/LoginForm";
import RegisterForm from "@/components/auth/RegisterForm";
import DeliveryLoginForm from "@/components/delivery/DeliveryLoginForm";
import RestaurantLoginForm from "@/components/restaurant/RestaurantLoginForm";
import AddressForm from "@/components/checkout/AddressForm";
import { AuthProvider } from "@/context/AuthContext";
import { CheckoutProvider } from "@/context/CheckoutContext";

describe("Forms Accessibility (WCAG 2.2 AA)", () => {
  it("Customer LoginForm has no accessibility violations", async () => {
    const { container } = render(
      <AuthProvider>
        <LoginForm />
      </AuthProvider>
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("Customer RegisterForm has no accessibility violations", async () => {
    const { container } = render(
      <AuthProvider>
        <RegisterForm />
      </AuthProvider>
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("DeliveryLoginForm has no accessibility violations", async () => {
    const { container } = render(<DeliveryLoginForm />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("RestaurantLoginForm has no accessibility violations", async () => {
    const { container } = render(<RestaurantLoginForm />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("Checkout AddressForm has no accessibility violations", async () => {
    const { container } = render(
      <AuthProvider>
        <CheckoutProvider>
          <AddressForm />
        </CheckoutProvider>
      </AuthProvider>
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
