import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { PartnerAgreementModal } from "@/components/partner/PartnerAgreementModal";
import * as authFetch from "@/services/authFetch";

vi.mock("@/services/authFetch", () => ({
  authJson: vi.fn(),
  publicJson: vi.fn(),
}));

describe("PartnerAgreementModal", () => {
  const defaultProps = {
    isOpen: true,
    canteenId: "test-canteen-123",
    canteenName: "Zeal Central Canteen",
    initialFssai: "",
    initialPhone: "",
    initialSignatory: "",
    onSuccess: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not render when isOpen is false", () => {
    render(<PartnerAgreementModal {...defaultProps} isOpen={false} />);
    expect(screen.queryByText(/CampusBite Canteen Merchant Agreement/i)).not.toBeInTheDocument();
  });

  it("renders branded header with Section 10A legal notice and establishment name", () => {
    render(<PartnerAgreementModal {...defaultProps} />);
    expect(screen.getByText(/CampusBite Canteen Merchant Agreement/i)).toBeInTheDocument();
    expect(screen.getByText(/Electronic Agreement pursuant to Section 10A, IT Act 2000/i)).toBeInTheDocument();
    expect(screen.getByText(/Establishment: Zeal Central Canteen/i)).toBeInTheDocument();
  });

  it("renders structured legal clauses (18% take-rate, Tue/Fri payouts, FSSAI compliance, IT Act Sec 79)", () => {
    render(<PartnerAgreementModal {...defaultProps} />);
    expect(screen.getByText(/1. Commercial Terms & Platform Take-Rate/i)).toBeInTheDocument();
    expect(screen.getByText(/18% \(eighteen percent\)/i)).toBeInTheDocument();
    expect(screen.getByText(/2. Settlement Cycle & Payout Schedule/i)).toBeInTheDocument();
    expect(screen.getByText(/Tuesday and Friday/i)).toBeInTheDocument();
    expect(screen.getByText(/3. Food Safety, Quality & FSSAI Sole Liability/i)).toBeInTheDocument();
    expect(screen.getByText(/4. Intermediary Safe Harbour under IT Act Section 79/i)).toBeInTheDocument();
  });

  it("disables submit button by default until all inputs and checkbox are valid", () => {
    render(<PartnerAgreementModal {...defaultProps} />);
    const submitBtn = screen.getByRole("button", { name: /Execute & Accept Master Agreement/i });
    expect(submitBtn).toBeDisabled();

    const checkbox = screen.getByRole("checkbox");
    expect(checkbox).not.toBeChecked();
  });

  it("enables submit button only when name, 14-digit FSSAI, 10-digit phone, and checkbox are valid", () => {
    render(<PartnerAgreementModal {...defaultProps} />);
    const submitBtn = screen.getByRole("button", { name: /Execute & Accept Master Agreement/i });
    const nameInput = screen.getByLabelText(/Authorized Signatory Full Name/i);
    const fssaiInput = screen.getByLabelText(/Canteen FSSAI Number/i);
    const phoneInput = screen.getByLabelText(/Registered Mobile Number/i);
    const checkbox = screen.getByRole("checkbox");

    // Fill valid name
    fireEvent.change(nameInput, { target: { value: "Rajesh Kumar" } });
    expect(submitBtn).toBeDisabled();

    // Fill invalid FSSAI (only 10 digits)
    fireEvent.change(fssaiInput, { target: { value: "1234567890" } });
    expect(submitBtn).toBeDisabled();

    // Fill valid FSSAI (14 digits)
    fireEvent.change(fssaiInput, { target: { value: "12345678901234" } });
    expect(submitBtn).toBeDisabled();

    // Fill valid 10-digit mobile
    fireEvent.change(phoneInput, { target: { value: "9876543210" } });
    expect(submitBtn).toBeDisabled();

    // Tick affirmative consent checkbox
    fireEvent.click(checkbox);
    expect(checkbox).toBeChecked();

    // Submit button should now be enabled!
    expect(submitBtn).not.toBeDisabled();
  });

  it("submits agreement payload and invokes onSuccess callback", async () => {
    const onSuccess = vi.fn();
    vi.mocked(authFetch.authJson).mockResolvedValueOnce({
      status: "success",
      message: "Agreement recorded successfully",
    });

    render(<PartnerAgreementModal {...defaultProps} onSuccess={onSuccess} />);

    fireEvent.change(screen.getByLabelText(/Authorized Signatory Full Name/i), {
      target: { value: "Ramesh Pawar" },
    });
    fireEvent.change(screen.getByLabelText(/Canteen FSSAI Number/i), {
      target: { value: "10020030040050" },
    });
    fireEvent.change(screen.getByLabelText(/Registered Mobile Number/i), {
      target: { value: "9822001122" },
    });
    fireEvent.click(screen.getByRole("checkbox"));

    const submitBtn = screen.getByRole("button", { name: /Execute & Accept Master Agreement/i });
    expect(submitBtn).not.toBeDisabled();
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(authFetch.authJson).toHaveBeenCalledWith(
        "/api/partner/accept-agreement",
        expect.objectContaining({
          role: "restaurant_owner",
          method: "POST",
          body: JSON.stringify({
            canteen_id: "test-canteen-123",
            signatory_name: "Ramesh Pawar",
            signatory_designation: "Proprietor",
            signatory_phone: "9822001122",
            canteen_fssai_number: "10020030040050",
            terms_version: "v1.0_2026_OCT",
          }),
        })
      );
      expect(onSuccess).toHaveBeenCalledTimes(1);
    });
  });

  it("does not dismiss on Escape key press", () => {
    const { container } = render(<PartnerAgreementModal {...defaultProps} />);
    fireEvent.keyDown(window, { key: "Escape", code: "Escape" });
    expect(screen.getByText(/CampusBite Canteen Merchant Agreement/i)).toBeInTheDocument();
  });
});
