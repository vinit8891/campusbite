import React from "react";
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import AddressForm, { ZEAL_CAMPUS_SPOTS } from "@/components/checkout/AddressForm";
import { CheckoutProvider } from "@/context/CheckoutContext";
import { LocationProvider } from "@/context/LocationContext";
import { AuthProvider } from "@/context/AuthContext";

function renderAddressForm() {
  return render(
    <AuthProvider>
      <CheckoutProvider>
        <LocationProvider>
          <AddressForm />
        </LocationProvider>
      </CheckoutProvider>
    </AuthProvider>
  );
}

describe("AddressForm Component", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("renders streamlined delivery mode toggles, Zeal campus spots, dropdown, and optional room input", () => {
    renderAddressForm();

    // Header and delivery modes
    expect(screen.getByText("Campus Delivery Details")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Campus Delivery/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Takeaway/i })).toBeInTheDocument();

    // Zeal campus delivery spot pills
    expect(screen.getByRole("button", { name: /Boys Hostel 1 Gate/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Boys Hostel 2 Gate/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Girls Hostel Reception/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Zeal Polytechnic Lawn/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Central Library Porch/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Engineering Building Front/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Zeal Main Canteen Pickup/i })).toBeInTheDocument();

    // Dropdown selector
    expect(screen.getByLabelText(/Or choose spot from list/i)).toBeInTheDocument();

    // Optional room number input
    expect(screen.getByLabelText(/Hostel Room No\. \/ Dept & Floor \(Optional\)/i)).toBeInTheDocument();
  });

  it("allows selecting campus spot pill to update delivery spot", async () => {
    const user = userEvent.setup();
    renderAddressForm();

    const spotBtn = screen.getByRole("button", { name: /Girls Hostel Reception/i });
    await user.click(spotBtn);

    expect(spotBtn).toHaveClass("bg-amber-600");
  });

  it("allows selecting Zeal Main Canteen Pickup to switch to takeaway", async () => {
    const user = userEvent.setup();
    renderAddressForm();

    const canteenBtn = screen.getByRole("button", { name: /Zeal Main Canteen Pickup/i });
    await user.click(canteenBtn);

    expect(canteenBtn).toHaveClass("bg-amber-600");
  });

  it("supports toggling between Myself and Someone Else recipient modes", async () => {
    const user = userEvent.setup();
    renderAddressForm();

    const someoneElseBtn = screen.getByRole("button", { name: /👤 Someone Else/i });
    await user.click(someoneElseBtn);

    expect(screen.getByLabelText(/recipient name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/recipient mobile number/i)).toBeInTheDocument();
  });
});
