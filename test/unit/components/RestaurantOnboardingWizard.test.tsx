import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import RestaurantOnboardingWizard from "@/components/restaurant/RestaurantOnboardingWizard";
import * as partnerService from "@/services/partnerOnboardingService";
import { IFSC_REGEX, UPI_REGEX } from "@/types/partnerOnboarding";

vi.mock("@/services/partnerOnboardingService", () => ({
  onboardRestaurant: vi.fn(),
  uploadKycDocument: vi.fn(),
}));

describe("RestaurantOnboardingWizard Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("validates IFSC and UPI regular expressions correctly", () => {
    // Valid IFSC: 4 uppercase letters, 0, 6 alphanumeric chars
    expect(IFSC_REGEX.test("SBIN0001234")).toBe(true);
    expect(IFSC_REGEX.test("HDFC0000128")).toBe(true);
    expect(IFSC_REGEX.test("sbin0001234")).toBe(false); // lower case
    expect(IFSC_REGEX.test("SBIN1234")).toBe(false); // too short
    expect(IFSC_REGEX.test("SBIN1001234")).toBe(false); // 5th char not '0'

    // Valid UPI
    expect(UPI_REGEX.test("sharma.tiffin@okhdfcbank")).toBe(true);
    expect(UPI_REGEX.test("9876543210@paytm")).toBe(true);
    expect(UPI_REGEX.test("invalid_upi")).toBe(false);
    expect(UPI_REGEX.test("@paytm")).toBe(false);
  });

  it("renders Step 1 with vendor tier selection cards and default Canteen selection", () => {
    render(<RestaurantOnboardingWizard />);

    expect(screen.getByText(/Partner with CampusBite/i)).toBeInTheDocument();
    expect(screen.getByText(/Campus Canteen \/ Mess/i)).toBeInTheDocument();
    expect(screen.getByText(/Home Tiffin & Dabba/i)).toBeInTheDocument();
    expect(screen.getByText(/Food Stall \/ Maggi Point/i)).toBeInTheDocument();
    expect(screen.getByText(/Continue to Eatery Info/i)).toBeInTheDocument();
  });

  it("switches to Home Tiffin tier and adapts compliance document label", async () => {
    const user = userEvent.setup();
    render(<RestaurantOnboardingWizard />);

    const tiffinCard = screen.getByText(/Home Tiffin & Dabba/i);
    await user.click(tiffinCard);

    // Continue to Step 2
    const nextBtn = screen.getByText(/Continue to Eatery Info/i);
    await user.click(nextBtn);

    expect(screen.getByText(/Step 2: Business & Contact Details/i)).toBeInTheDocument();
  });

  it("validates required fields on Step 2 before allowing progression", async () => {
    const user = userEvent.setup();
    render(<RestaurantOnboardingWizard />);

    // Move to Step 2
    await user.click(screen.getByText(/Continue to Eatery Info/i));

    // Try moving to Step 3 with empty fields
    const toDocsBtn = screen.getByText(/Continue to Documents/i);
    await user.click(toDocsBtn);

    expect(screen.getByText(/Business name is required/i)).toBeInTheDocument();
    expect(screen.getByText(/Owner name is required/i)).toBeInTheDocument();
    expect(screen.getByText(/Enter a valid 10-digit mobile number/i)).toBeInTheDocument();
  });

  it("allows complete multi-step filling and calls onboardRestaurant API", async () => {
    const user = userEvent.setup();
    vi.mocked(partnerService.onboardRestaurant).mockResolvedValueOnce({
      success: true,
      restaurant_id: "rest-mock-123",
      verification_status: "PENDING_VERIFICATION",
      message: "Restaurant onboarded",
    });

    render(<RestaurantOnboardingWizard />);

    // Step 1: Select Home Tiffin
    await user.click(screen.getByText(/Home Tiffin & Dabba/i));
    await user.click(screen.getByText(/Continue to Eatery Info/i));

    // Step 2: Fill contact info
    await user.type(screen.getByPlaceholderText(/e.g. Sharma Aunty Home Kitchen/i), "Sharma Aunty Tiffins");
    await user.type(screen.getByPlaceholderText(/e.g. Sunita Sharma/i), "Sunita Sharma");
    await user.type(screen.getByPlaceholderText(/9876543210/i), "9876543210");
    await user.type(screen.getByPlaceholderText(/partner@campusbite.com/i), "sunita@sharmatiffins.com");
    await user.type(screen.getByPlaceholderText(/Minimum 6 characters/i), "password123");
    await user.type(screen.getByPlaceholderText(/Ground Floor/i), "SAC Room 102");

    await user.click(screen.getByText(/Continue to Documents/i));

    // Step 3: Identity & Compliance Verification
    expect(screen.getByText(/Step 3: Identity & Compliance Verification/i)).toBeInTheDocument();
    expect(screen.getByText(/Owner Aadhaar Card \(KYC Front & Back\)/i)).toBeInTheDocument();
  });
});
