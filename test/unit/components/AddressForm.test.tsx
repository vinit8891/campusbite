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

  it("renders commercial delivery fields and instructions chips without fixed dropdowns", () => {
    renderAddressForm();

    // Header and delivery modes
    expect(screen.getByText("Delivery Details")).toBeInTheDocument();
    expect(screen.getByText("Hostel Batch Drop")).toBeInTheDocument();
    expect(screen.getByText("Standard Express")).toBeInTheDocument();

    // Flexible inputs
    expect(
      screen.getByLabelText(/building \/ hostel \/ pg \/ society name/i)
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/recipient name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/recipient mobile number/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/room \/ flat \/ floor \/ wing/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/nearby reference \/ landmark/i)).toBeInTheDocument();
    expect(
      screen.getByLabelText(/delivery notes \/ instructions for courier/i)
    ).toBeInTheDocument();

    // Redundant dropdowns / rigid fields should NOT be present
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/city \/ campus/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/pin code/i)).not.toBeInTheDocument();

    // Quick chips
    expect(
      screen.getByRole("button", { name: /\+ Call when downstairs/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: /\+ Leave at hostel security \/ reception/i,
      })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /\+ Call from main gate/i })
    ).toBeInTheDocument();
  });

  it("allows selecting a saved address pill to fill building and address details", async () => {
    // Pre-populate saved addresses
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

    // Pill should be rendered
    const savedPill = screen.getByRole("button", { name: /shree ram pg/i });
    expect(savedPill).toBeInTheDocument();

    await user.click(savedPill);

    const buildingInput = screen.getByLabelText(
      /building \/ hostel \/ pg \/ society name/i
    ) as HTMLInputElement;
    expect(buildingInput.value).toBe("Shree Ram PG");
  });

  it("selects a quick instruction chip and updates delivery notes", () => {
    renderAddressForm();

    const chip = screen.getByRole("button", {
      name: /\+ Call when downstairs/i,
    });
    fireEvent.click(chip);

    const input = screen.getByLabelText(
      /delivery notes \/ instructions for courier/i
    ) as HTMLInputElement;
    expect(input.value).toBe("Call when downstairs");
  });
});
