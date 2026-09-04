import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LocationPickerModal } from "@/components/location/LocationPickerModal";
import { LocationProvider, useLocation } from "@/context/LocationContext";
import { CheckoutProvider, useCheckout } from "@/context/CheckoutContext";
import { toast } from "sonner";

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    loading: vi.fn().mockReturnValue("toast-1"),
    dismiss: vi.fn(),
  },
}));

function TestWrapperComponent() {
  const { fullAddressLabel, openLocationModal } = useLocation();
  const { checkout } = useCheckout();

  return (
    <div>
      <button type="button" onClick={openLocationModal} aria-label="Open location modal">
        {fullAddressLabel}
      </button>
      <div data-testid="checkout-hostel">{checkout.hostel_block}</div>
      <div data-testid="checkout-address">{checkout.address}</div>
      <LocationPickerModal />
    </div>
  );
}

function renderWithProviders() {
  return render(
    <CheckoutProvider>
      <LocationProvider>
        <TestWrapperComponent />
      </LocationProvider>
    </CheckoutProvider>
  );
}

describe("LocationPickerModal & LocationContext", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("opens modal on trigger and closes on X or backdrop click", async () => {
    const user = userEvent.setup();
    renderWithProviders();

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /open location modal/i }));

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Select Delivery Location")).toBeInTheDocument();

    // Close via close button
    const closeBtn = screen.getByRole("button", { name: /close location picker/i });
    await user.click(closeBtn);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    // Open again and close via backdrop
    await user.click(screen.getByRole("button", { name: /open location modal/i }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    const backdrop = screen.getByTestId("location-modal-backdrop");
    await user.click(backdrop);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("allows selecting a campus preset and updates checkout synchronization", async () => {
    const user = userEvent.setup();
    renderWithProviders();

    await user.click(screen.getByRole("button", { name: /open location modal/i }));

    // Select Hostel Block B
    const hostelBBtn = screen.getByRole("button", { name: /hostel block b/i });
    await user.click(hostelBBtn);

    // Enter room number
    const roomInput = screen.getByLabelText(/room \/ desk \/ specifics/i);
    await user.clear(roomInput);
    await user.type(roomInput, "Rm 402, Wing C");

    // Click Confirm
    const confirmBtn = screen.getByRole("button", { name: /confirm location/i });
    await user.click(confirmBtn);

    // Modal closed
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    // Verified checkout context sync
    expect(screen.getByTestId("checkout-hostel")).toHaveTextContent("Hostel Block B");
    expect(screen.getByTestId("checkout-address")).toHaveTextContent("Hostel Block B, Rm 402, Wing C");

    expect(toast.success).toHaveBeenCalledWith("Location set to Hostel Block B, Rm 402, Wing C");
  });

  it("handles GPS geolocation auto-detection inside campus bounds", async () => {
    const user = userEvent.setup();

    // Mock navigator.geolocation
    const mockGeolocation = {
      getCurrentPosition: vi.fn().mockImplementation((success) => {
        success({
          coords: {
            latitude: 18.4489,
            longitude: 73.8262, // Hostel Block B coords
          },
        });
      }),
    };

    vi.stubGlobal("navigator", {
      ...global.navigator,
      geolocation: mockGeolocation,
    });

    renderWithProviders();

    await user.click(screen.getByRole("button", { name: /open location modal/i }));

    const gpsBtn = screen.getByRole("button", { name: /use current gps location/i });
    await user.click(gpsBtn);

    await waitFor(() => {
      expect(mockGeolocation.getCurrentPosition).toHaveBeenCalled();
      expect(toast.success).toHaveBeenCalledWith("Location set to Hostel Block B");
    });

    expect(screen.getByTestId("checkout-hostel")).toHaveTextContent("Hostel Block B");

    vi.unstubAllGlobals();
  });

  it("handles GPS geolocation error with fallback to default campus zone", async () => {
    const user = userEvent.setup();

    const mockGeolocation = {
      getCurrentPosition: vi.fn().mockImplementation((_success, error) => {
        error(new Error("Permission denied"));
      }),
    };

    vi.stubGlobal("navigator", {
      ...global.navigator,
      geolocation: mockGeolocation,
    });

    renderWithProviders();

    await user.click(screen.getByRole("button", { name: /open location modal/i }));

    const gpsBtn = screen.getByRole("button", { name: /use current gps location/i });
    await user.click(gpsBtn);

    await waitFor(() => {
      expect(mockGeolocation.getCurrentPosition).toHaveBeenCalled();
      expect(toast.info).toHaveBeenCalledWith("GPS unavailable: Set to Hostel Block A");
    });

    vi.unstubAllGlobals();
  });
});
