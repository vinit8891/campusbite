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

  it("renders clean header, segmented mode switcher, and standard manual address entry form", () => {
    renderAddressForm();

    // Clean header
    expect(screen.getByText("Delivery Details")).toBeInTheDocument();
    expect(screen.queryByText(/Zeal Narhe Campus • 1-tap spot selection/i)).not.toBeInTheDocument();

    // Segmented mode switcher
    expect(screen.getByRole("button", { name: /Campus Delivery/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Takeaway/i })).toBeInTheDocument();

    // Standard manual address entry fields
    expect(screen.getByLabelText(/Hostel \/ Building \/ Department/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Room \/ Flat \/ Floor No\. \(Optional\)/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Landmark \/ Campus Area \(Optional\)/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Delivery Instructions \(Optional\)/i)).toBeInTheDocument();
  });

  it("allows entering manual address fields cleanly", async () => {
    const user = userEvent.setup();
    renderAddressForm();

    const buildingInput = screen.getByLabelText(/Hostel \/ Building \/ Department/i);
    await user.clear(buildingInput);
    await user.type(buildingInput, "Hostel Block C");
    expect(buildingInput).toHaveValue("Hostel Block C");

    const roomInput = screen.getByLabelText(/Room \/ Flat \/ Floor No\. \(Optional\)/i);
    await user.type(roomInput, "Room 402");
    expect(roomInput).toHaveValue("Room 402");

    const landmarkInput = screen.getByLabelText(/Landmark \/ Campus Area \(Optional\)/i);
    await user.type(landmarkInput, "Near Reading Hall");
    expect(landmarkInput).toHaveValue("Near Reading Hall");
  });

  it("allows switching to Takeaway mode with zero delivery fee counter pickup card", async () => {
    const user = userEvent.setup();
    renderAddressForm();

    const takeawayBtn = screen.getByRole("button", { name: /Takeaway/i });
    await user.click(takeawayBtn);

    expect(screen.getByText(/Canteen Counter Pickup \(Takeaway\)/i)).toBeInTheDocument();
    expect(screen.getByText(/No delivery fee/i)).toBeInTheDocument();
  });

  it("supports toggling between Myself and Someone Else recipient modes", async () => {
    const user = userEvent.setup();
    renderAddressForm();

    const someoneElseBtn = screen.getByRole("button", { name: /👤 Someone Else/i });
    await user.click(someoneElseBtn);

    expect(screen.getByLabelText(/recipient name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/recipient mobile number/i)).toBeInTheDocument();
  });

  it("exports backwards compatible ZEAL_CAMPUS_SPOTS array", () => {
    expect(Array.isArray(ZEAL_CAMPUS_SPOTS)).toBe(true);
    expect(ZEAL_CAMPUS_SPOTS.length).toBeGreaterThan(0);
  });
});
