import React from "react";
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import AddressForm from "@/components/checkout/AddressForm";
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

  it("renders streamlined delivery mode toggles, campus quick-chips, and address inputs", () => {
    renderAddressForm();

    // Header and delivery modes
    expect(screen.getByText("Delivery Details")).toBeInTheDocument();
    expect(screen.getByText(/Hostel Batch/i)).toBeInTheDocument();
    expect(screen.getByText(/Express Door/i)).toBeInTheDocument();
    expect(screen.getByText("Save ₹25")).toBeInTheDocument();

    // 2 Intuitive Campus fields
    expect(
      screen.getByLabelText(/hostel \/ pg \/ building name/i)
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText(/room \/ flat \/ floor/i)
    ).toBeInTheDocument();

    // Campus Quick Chips
    expect(screen.getByRole("button", { name: /Hostel Block A/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Central Library/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Main Canteen/i })).toBeInTheDocument();

    // Collapsible note toggle button
    expect(
      screen.getByRole("button", { name: /\+ Add delivery note \/ landmark/i })
    ).toBeInTheDocument();
  });

  it("allows selecting campus chip to populate hostel / building field", async () => {
    const user = userEvent.setup();
    renderAddressForm();

    const libraryChip = screen.getByRole("button", { name: /Central Library/i });
    await user.click(libraryChip);

    const buildingInput = screen.getByLabelText(
      /hostel \/ pg \/ building name/i
    ) as HTMLInputElement;
    expect(buildingInput.value).toBe("Central Library");
  });

  it("allows selecting a saved address pill to fill building details", async () => {
    const testSaved = [
      {
        id: "addr-home-1",
        tag: "home",
        roomOrFlat: "Flat 302",
        buildingOrSociety: "Shree Ram PG",
        areaOrLandmark: "Near North Gate",
        city: "Pune",
      },
    ];
    localStorage.setItem("cb_saved_addresses", JSON.stringify(testSaved));

    const user = userEvent.setup();
    renderAddressForm();

    const savedPill = screen.getByRole("button", { name: /shree ram pg/i });
    expect(savedPill).toBeInTheDocument();

    await user.click(savedPill);

    const buildingInput = screen.getByLabelText(
      /hostel \/ pg \/ building name/i
    ) as HTMLInputElement;
    expect(buildingInput.value).toBe("Shree Ram PG");
  });

  it("expands delivery note / landmark inputs and selects quick instruction chip", async () => {
    const user = userEvent.setup();
    renderAddressForm();

    const expandBtn = screen.getByRole("button", {
      name: /\+ Add delivery note \/ landmark/i,
    });
    await user.click(expandBtn);

    expect(
      screen.getByLabelText(/nearby landmark/i)
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText(/courier instructions/i)
    ).toBeInTheDocument();

    const chip = screen.getByRole("button", {
      name: /\+ Call when downstairs/i,
    });
    fireEvent.click(chip);

    const instructionsInput = screen.getByLabelText(
      /courier instructions/i
    ) as HTMLInputElement;
    expect(instructionsInput.value).toBe("Call when downstairs");
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
