import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import DeliveryLoginForm from "@/components/delivery/DeliveryLoginForm";
import DeliveryStats from "@/components/delivery/DeliveryStats";
import { CustomerOtpCard } from "@/components/common/CustomerOtpCard";

describe("Delivery Partner User Journey", () => {
  it("allows delivery partner to enter phone and password", async () => {
    const user = userEvent.setup();
    render(<DeliveryLoginForm />);

    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/^password/i);

    await user.type(emailInput, "partner@campus.edu");
    await user.type(passwordInput, "delivery123");

    expect(emailInput).toHaveValue("partner@campus.edu");
    expect(passwordInput).toHaveValue("delivery123");
  });

  it("renders delivery partner daily stats and earnings", () => {
    render(<DeliveryStats jobs={8} earnings={480} />);

    expect(screen.getByText("8")).toBeInTheDocument();
    expect(screen.getByText("₹480")).toBeInTheDocument();
  });

  it("displays OTP verification card for handover confirmation", () => {
    render(<CustomerOtpCard otp="54321" variant="detailed" />);

    expect(screen.getByText("54321")).toBeInTheDocument();
    expect(screen.getByText(/give the delivery partner your otp/i)).toBeInTheDocument();
  });
});
