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
    expect(screen.getByText(/Takeaway/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Direct Room/i).length).toBeGreaterThan(0);

    // Campus hostel pills
    expect(screen.getByRole("button", { name: /Block A/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Block B/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Library \/ Main Gate/i })).toBeInTheDocument();

    // Room number input
    expect(screen.getByLabelText(/room number/i)).toBeInTheDocument();

    // Collapsible note toggle button
    expect(
      screen.getByRole("button", { name: /\+ Add delivery note \/ landmark/i })
    ).toBeInTheDocument();
  });

  it("allows selecting campus chip to populate hostel / building field", async () => {
    const user = userEvent.setup();
    renderAddressForm();

    const blockBChip = screen.getByRole("button", { name: /Block B/i });
    await user.click(blockBChip);

    expect(blockBChip).toHaveClass("bg-amber-600");
  });

  it("allows switching between Campus Hostel and Outside PG/Flat tabs", async () => {
    const user = userEvent.setup();
    renderAddressForm();

    const outsideTab = screen.getByRole("button", { name: /Outside \(PG \/ Flat\)/i });
    await user.click(outsideTab);

    expect(screen.getByText(/Select Area/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /College Road/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/Building \/ PG Name/i)).toBeInTheDocument();
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
