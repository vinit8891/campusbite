import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { RunnerAgreementModal } from "@/components/delivery/RunnerAgreementModal";
import * as authFetch from "@/services/authFetch";

vi.mock("@/services/authFetch", () => ({
  authJson: vi.fn(),
  publicJson: vi.fn(),
}));

describe("RunnerAgreementModal", () => {
  const defaultProps = {
    isOpen: true,
    runnerId: "test-runner-123",
    initialFullName: "",
    initialPhone: "",
    initialCollegeId: "",
    initialUpiId: "",
    initialHostelBlock: "",
    initialEmergencyContact: "",
    onSuccess: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not render when isOpen is false", () => {
    render(<RunnerAgreementModal {...defaultProps} isOpen={false} />);
    expect(
      screen.queryByText(/Campus Runner & Operations Associate Agreement/i)
    ).not.toBeInTheDocument();
  });

  it("renders branded header with Section 10A legal notice and work-study badge", () => {
    render(<RunnerAgreementModal {...defaultProps} />);
    expect(
      screen.getByText(/Campus Runner & Operations Associate Agreement/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Work-Study Logistics Engagement/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Section 10A, Information Technology Act, 2000/i)
    ).toBeInTheDocument();
  });

  it("renders structured legal clauses (work-study, bi-weekly disbursal, gate drop, ₹500 COD limit, internship milestone)", () => {
    render(<RunnerAgreementModal {...defaultProps} />);
    expect(
      screen.getByText(/1. Independent Associate & Flexible Work-Study Engagement/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/2. Dynamic Payout Model & Bi-Weekly UPI Disbursals/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/3. Mandatory Gate \/ Lobby Drop Safety Mandate \(Zero Room Entry\)/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/4. Cash-on-Delivery \(COD\) & ₹500 Remittance Ceiling/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/5. Code of Conduct, Tamper Seals & Campus Pedestrian Safety/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/6. Logistics Internship Certificate Milestone \(50 Deliveries\)/i)
    ).toBeInTheDocument();
  });

  it("disables submit button by default until all inputs and checkbox are valid", () => {
    render(<RunnerAgreementModal {...defaultProps} />);
    const submitBtn = screen.getByRole("button", {
      name: /Execute & Accept Associate Agreement/i,
    });
    expect(submitBtn).toBeDisabled();

    const checkbox = screen.getByRole("checkbox");
    expect(checkbox).not.toBeChecked();
  });

  it("enables submit button only when all 6 fields and consent checkbox are valid", () => {
    render(<RunnerAgreementModal {...defaultProps} />);
    const submitBtn = screen.getByRole("button", {
      name: /Execute & Accept Associate Agreement/i,
    });
    const nameInput = screen.getByLabelText(/Full Name/i);
    const collegeIdInput = screen.getByLabelText(/College ID \/ Roll Number/i);
    const phoneInput = screen.getByLabelText(/Registered Mobile Number/i);
    const emergencyInput = screen.getByLabelText(/Emergency Contact \(SOS\)/i);
    const upiInput = screen.getByLabelText(/Payout UPI Handle/i);
    const hostelInput = screen.getByLabelText(/Hostel Block \/ Campus Address/i);
    const checkbox = screen.getByRole("checkbox");

    // 1. Fill Name
    fireEvent.change(nameInput, { target: { value: "Aman Runner" } });
    expect(submitBtn).toBeDisabled();

    // 2. Fill College ID
    fireEvent.change(collegeIdInput, { target: { value: "2024CS012" } });
    expect(submitBtn).toBeDisabled();

    // 3. Fill Phone
    fireEvent.change(phoneInput, { target: { value: "9876543210" } });
    expect(submitBtn).toBeDisabled();

    // 4. Fill Emergency Contact
    fireEvent.change(emergencyInput, { target: { value: "9876500000" } });
    expect(submitBtn).toBeDisabled();

    // 5. Fill invalid UPI handle
    fireEvent.change(upiInput, { target: { value: "invalid-upi" } });
    expect(submitBtn).toBeDisabled();

    // Fill valid UPI handle
    fireEvent.change(upiInput, { target: { value: "aman@okaxis" } });
    expect(submitBtn).toBeDisabled();

    // 6. Fill Hostel Block
    fireEvent.change(hostelInput, { target: { value: "Aryabhatta Hall B-204" } });
    expect(submitBtn).toBeDisabled();

    // 7. Tick Affirmative Consent Checkbox
    fireEvent.click(checkbox);
    expect(checkbox).toBeChecked();

    // Submit button should now be enabled!
    expect(submitBtn).not.toBeDisabled();
  });

  it("submits agreement payload and invokes onSuccess callback", async () => {
    const onSuccess = vi.fn();
    vi.mocked(authFetch.authJson).mockResolvedValueOnce({
      status: "success",
      message: "Runner agreement recorded successfully",
      agreement_hash: "mockhash123",
    });

    render(<RunnerAgreementModal {...defaultProps} onSuccess={onSuccess} />);

    fireEvent.change(screen.getByLabelText(/Full Name/i), {
      target: { value: "Aman Runner" },
    });
    fireEvent.change(screen.getByLabelText(/College ID \/ Roll Number/i), {
      target: { value: "2024CS012" },
    });
    fireEvent.change(screen.getByLabelText(/Registered Mobile Number/i), {
      target: { value: "9876543210" },
    });
    fireEvent.change(screen.getByLabelText(/Emergency Contact \(SOS\)/i), {
      target: { value: "9876500000" },
    });
    fireEvent.change(screen.getByLabelText(/Payout UPI Handle/i), {
      target: { value: "aman@okaxis" },
    });
    fireEvent.change(screen.getByLabelText(/Hostel Block \/ Campus Address/i), {
      target: { value: "Aryabhatta Hall B-204" },
    });
    fireEvent.click(screen.getByRole("checkbox"));

    const submitBtn = screen.getByRole("button", {
      name: /Execute & Accept Associate Agreement/i,
    });
    expect(submitBtn).not.toBeDisabled();
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(authFetch.authJson).toHaveBeenCalledWith(
        "/api/delivery/accept-agreement",
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining("test-runner-123"),
        })
      );
      expect(onSuccess).toHaveBeenCalledTimes(1);
    });
  });

  it("is non-dismissible when Escape key is pressed", () => {
    render(<RunnerAgreementModal {...defaultProps} />);
    expect(
      screen.getByText(/Campus Runner & Operations Associate Agreement/i)
    ).toBeInTheDocument();

    const escapeEvent = new KeyboardEvent("keydown", {
      key: "Escape",
      bubbles: true,
      cancelable: true,
    });
    window.dispatchEvent(escapeEvent);

    // Modal remains rendered
    expect(
      screen.getByText(/Campus Runner & Operations Associate Agreement/i)
    ).toBeInTheDocument();
  });
});
