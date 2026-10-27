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

  it("renders clean header without redundant subtitles, segmented mode switcher, and GPS detector with auto-batching", () => {
    renderAddressForm();

    // Clean header
    expect(screen.getByText("Delivery Details")).toBeInTheDocument();
    expect(screen.queryByText(/Zeal Narhe Campus • 1-tap spot selection/i)).not.toBeInTheDocument();

    // Segmented mode switcher
    expect(screen.getByRole("button", { name: /Campus Delivery/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Takeaway/i })).toBeInTheDocument();

    // GPS Location Detector & Auto-Batching indicator
    expect(screen.getAllByText(/Hostel Block A/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Auto-Batched Delivery Active/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Re-detect GPS location/i })).toBeInTheDocument();

    // Optional room number input
    expect(screen.getByLabelText(/Hostel Room No\. \/ Dept & Floor \(Optional\)/i)).toBeInTheDocument();
  });

  it("allows switching campus building via Change selector to update batch location", async () => {
    const user = userEvent.setup();
    renderAddressForm();

    const changeBtn = screen.getByRole("button", { name: /Change delivery location/i });
    await user.click(changeBtn);

    const selector = screen.getByLabelText(/Select Campus Building \/ Drop Point/i);
    expect(selector).toBeInTheDocument();

    await user.selectOptions(selector, "Hostel Block B");
    expect(screen.getAllByText(/Hostel Block B/i).length).toBeGreaterThan(0);
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
