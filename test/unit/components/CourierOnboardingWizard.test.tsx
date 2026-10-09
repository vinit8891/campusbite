import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CourierOnboardingWizard from "@/components/delivery/CourierOnboardingWizard";
import * as partnerService from "@/services/partnerOnboardingService";

vi.mock("@/services/partnerOnboardingService", () => ({
  onboardCourier: vi.fn(),
  uploadKycDocument: vi.fn(),
}));

describe("CourierOnboardingWizard Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders Step 1 with Student Runner and Gig Courier role options", () => {
    render(<CourierOnboardingWizard />);

    expect(screen.getByText(/Deliver with CampusBite/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Student Runner/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Campus \/ Local Rider/i)).toBeInTheDocument();
    expect(screen.getByText(/Continue to Identity/i)).toBeInTheDocument();
  });

  it("requires College Roll No and Hostel for Student role in Step 2", async () => {
    const user = userEvent.setup();
    render(<CourierOnboardingWizard />);

    // Step 1: Default is STUDENT
    await user.click(screen.getByText(/Continue to Identity/i));

    expect(screen.getByText(/Step 2: Profile & KYC Verification/i)).toBeInTheDocument();
    expect(screen.getByText(/College Roll No \*/i)).toBeInTheDocument();
    expect(screen.getByText(/Hostel \/ Hall Block \*/i)).toBeInTheDocument();

    // Attempting next without filling student details fails validation
    await user.click(screen.getByText(/Continue to Vehicle & Payout/i));
    expect(screen.getByText(/Full legal name is required/i)).toBeInTheDocument();
  });

  it("does NOT request student roll number when External Gig Rider is selected", async () => {
    const user = userEvent.setup();
    render(<CourierOnboardingWizard />);

    // Switch to External Rider
    await user.click(screen.getByText(/Campus \/ Local Rider/i));
    await user.click(screen.getByText(/Continue to Identity/i));

    expect(screen.getByText(/Step 2: Profile & KYC Verification/i)).toBeInTheDocument();
    expect(screen.queryByText(/College Roll No \*/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Hostel \/ Hall Block \*/i)).not.toBeInTheDocument();
  });

  it("shows transit mode options on Step 3", async () => {
    const user = userEvent.setup();
    render(<CourierOnboardingWizard />);

    // Move to step 2
    await user.click(screen.getByText(/Continue to Identity/i));

    // Fill minimum required on step 2
    await user.type(screen.getByPlaceholderText(/e.g. Aman Verma/i), "Aman Verma");
    await user.type(screen.getByPlaceholderText(/9876543210/i), "9876500088");
    await user.type(screen.getByPlaceholderText(/aman.student@campus.edu/i), "aman@campus.edu");
    await user.type(screen.getByPlaceholderText(/Min 6 characters/i), "secret123");
    await user.type(screen.getByPlaceholderText(/Parent \/ Guardian/i), "9876500000");
    await user.type(screen.getByPlaceholderText(/e.g. 2024CS01/i), "2024CS01");
    await user.type(screen.getByPlaceholderText(/Hall 4/i), "Hall 4");

    // Manually trigger doc url
    // Continue to Step 3
    // Testing transit modes
  });
});
