import React from "react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import PaymentMethods from "@/components/checkout/PaymentMethods";
import { CheckoutProvider } from "@/context/CheckoutContext";
import { AuthProvider } from "@/context/AuthContext";

vi.mock("@/services/paymentService", () => ({
  getRazorpayConfig: vi.fn().mockResolvedValue({
    enabled: true,
    key_id: "rzp_test_mock123",
  }),
}));

function renderPaymentMethods() {
  return render(
    <AuthProvider>
      <CheckoutProvider>
        <PaymentMethods />
      </CheckoutProvider>
    </AuthProvider>
  );
}

describe("PaymentMethods Component", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("renders Online Payment method unlocked and selectable", async () => {
    renderPaymentMethods();

    await waitFor(() => {
      expect(screen.getByText("Payment Method")).toBeInTheDocument();
    });

    // Check heading and options
    expect(screen.getByText("Payment Method")).toBeInTheDocument();
    expect(screen.getByText(/Cash on Delivery \(COD\)/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Online Payment \(UPI \/ Cards \/ Net Banking\)/i)
    ).toBeInTheDocument();

    // Check helper description
    expect(
      screen.getByText("UPI (GPay, PhonePe, Paytm), Cards & Net Banking")
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/Online payment setup in progress/i)
    ).not.toBeInTheDocument();

    // Check radio buttons
    const radioInputs = screen.getAllByRole("radio");
    expect(radioInputs).toHaveLength(2);

    const onlineRadio = radioInputs[1];
    expect(onlineRadio).not.toBeDisabled();
  });

  it("properly sets state and renders Razorpay confirmation checkbox when Online Payment is clicked", async () => {
    const user = userEvent.setup();
    renderPaymentMethods();

    await waitFor(() => {
      expect(screen.getByText("Payment Method")).toBeInTheDocument();
    });

    const radioInputs = screen.getAllByRole("radio");
    const onlineRadio = radioInputs[1];

    await user.click(onlineRadio);
    expect(onlineRadio).toBeChecked();

    expect(
      screen.getByText(/I confirm I will complete payment securely via Razorpay/i)
    ).toBeInTheDocument();
  });
});
