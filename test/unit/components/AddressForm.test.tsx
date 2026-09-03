import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

import AddressForm from "@/components/checkout/AddressForm";
import { CheckoutProvider } from "@/context/CheckoutContext";
import { AuthProvider } from "@/context/AuthContext";

describe("AddressForm Component", () => {
  it("renders campus delivery fields and instructions chips without city/pincode inputs", () => {
    render(
      <AuthProvider>
        <CheckoutProvider>
          <AddressForm />
        </CheckoutProvider>
      </AuthProvider>
    );

    // Header and delivery modes
    expect(screen.getByText("Delivery Details")).toBeInTheDocument();
    expect(screen.getByText("Hostel Batch Drop")).toBeInTheDocument();
    expect(screen.getByText("Standard Express")).toBeInTheDocument();

    // Campus specific fields
    expect(screen.getByLabelText(/select hostel \/ complex/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/recipient name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/recipient mobile number/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/room \/ floor \/ wing/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/nearby reference \/ landmark/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/delivery notes \/ instructions for courier/i)).toBeInTheDocument();

    // Redundant fields should NOT be present
    expect(screen.queryByLabelText(/city \/ campus/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/pin code/i)).not.toBeInTheDocument();

    // Quick chips
    expect(screen.getByRole("button", { name: /\+ Call when downstairs/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /\+ Leave at hostel security \/ reception/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /\+ Call from main gate/i })).toBeInTheDocument();
  });

  it("selects a quick instruction chip and updates delivery notes", () => {
    render(
      <AuthProvider>
        <CheckoutProvider>
          <AddressForm />
        </CheckoutProvider>
      </AuthProvider>
    );

    const chip = screen.getByRole("button", { name: /\+ Call when downstairs/i });
    fireEvent.click(chip);

    const input = screen.getByLabelText(/delivery notes \/ instructions for courier/i) as HTMLInputElement;
    expect(input.value).toBe("Call when downstairs");
  });
});
