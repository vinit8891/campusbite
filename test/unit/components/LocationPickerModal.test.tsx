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
  const { fullAddressLabel, activeAddress, openLocationModal } = useLocation();
  const { checkout } = useCheckout();

  return (
    <div>
      <button
        type="button"
        onClick={openLocationModal}
        aria-label="Open location modal"
      >
        {fullAddressLabel}
      </button>
      <div data-testid="active-type">{activeAddress.type}</div>
      <div data-testid="checkout-hostel">{checkout.hostel_block}</div>
      <div data-testid="checkout-address">{checkout.address}</div>
      <div data-testid="checkout-landmark">{checkout.landmark}</div>
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

describe("LocationPickerModal & Generalized LocationContext", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("opens modal on trigger and closes on X or backdrop click", async () => {
    const user = userEvent.setup();
    renderWithProviders();

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: /open location modal/i })
    );

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Select Delivery Location")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Delivering to your hostel, PG, flat, or college department"
      )
    ).toBeInTheDocument();

    // Close via close button
    const closeBtn = screen.getByRole("button", {
      name: /close location picker/i,
    });
    await user.click(closeBtn);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    // Open again and close via backdrop
    await user.click(
      screen.getByRole("button", { name: /open location modal/i })
    );
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    const backdrop = screen.getByTestId("location-modal-backdrop");
    await user.click(backdrop);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("allows selecting address type and entering custom PG/flat details with checkout sync", async () => {
    const user = userEvent.setup();
    renderWithProviders();

    await user.click(
      screen.getByRole("button", { name: /open location modal/i })
    );

    // Select "PG / Flat" address type
    const pgTypeBtn = screen.getByRole("radio", { name: /pg \/ flat/i });
    await user.click(pgTypeBtn);
    expect(pgTypeBtn).toHaveAttribute("aria-checked", "true");

    // Enter room/flat
    const roomInput = screen.getByLabelText(/flat \/ room \/ house no/i);
    await user.clear(roomInput);
    await user.type(roomInput, "Flat 402, 4th Floor");

    // Enter building/society name
    const buildingInput = screen.getByLabelText(
      /building \/ society \/ hostel name/i
    );
    await user.clear(buildingInput);
    await user.type(buildingInput, "Greenfield Heights PG");

    // Enter landmark
    const landmarkInput = screen.getByLabelText(/area \/ landmark/i);
    await user.clear(landmarkInput);
    await user.type(landmarkInput, "Near Zeal North Gate");

    // Click "Save & Deliver Here"
    const saveBtn = screen.getByRole("button", {
      name: /save & deliver here/i,
    });
    await user.click(saveBtn);

    // Modal closes
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    // Context & Checkout verified
    expect(screen.getByTestId("active-type")).toHaveTextContent("pg_flat");
    expect(screen.getByTestId("checkout-hostel")).toHaveTextContent(
      "Greenfield Heights PG"
    );
    expect(screen.getByTestId("checkout-address")).toHaveTextContent(
      "Greenfield Heights PG, Flat 402, 4th Floor"
    );
    expect(screen.getByTestId("checkout-landmark")).toHaveTextContent(
      "Near Zeal North Gate"
    );

    expect(toast.success).toHaveBeenCalledWith(
      "Location set to Greenfield Heights PG, Flat 402, 4th Floor"
    );
  });

  it("allows selecting from saved locations list and updates active location", async () => {
    const user = userEvent.setup();
    renderWithProviders();

    await user.click(
      screen.getByRole("button", { name: /open location modal/i })
    );

    // Look for saved location "Silver Oak PG"
    const silverOakSavedBtn = screen.getByRole("button", {
      name: /silver oak pg/i,
    });
    await user.click(silverOakSavedBtn);

    // Click "Save & Deliver Here"
    const saveBtn = screen.getByRole("button", {
      name: /save & deliver here/i,
    });
    await user.click(saveBtn);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByTestId("active-type")).toHaveTextContent("pg_flat");
    expect(screen.getByTestId("checkout-hostel")).toHaveTextContent(
      "Silver Oak PG"
    );
  });

  it("handles GPS reverse geocoding with OpenStreetMap Nominatim", async () => {
    const user = userEvent.setup();

    // Mock global fetch for OpenStreetMap Nominatim
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        address: {
          amenity: "Zeal College Campus",
          suburb: "Narhe",
          city: "Pune",
        },
      }),
    });
    vi.stubGlobal("fetch", mockFetch);

    // Mock navigator.geolocation
    const mockGeolocation = {
      getCurrentPosition: vi.fn().mockImplementation((success) => {
        success({
          coords: {
            latitude: 18.4489,
            longitude: 73.8262,
          },
        });
      }),
    };

    vi.stubGlobal("navigator", {
      ...global.navigator,
      geolocation: mockGeolocation,
    });

    renderWithProviders();

    await user.click(
      screen.getByRole("button", { name: /open location modal/i })
    );

    const gpsBtn = screen.getByRole("button", {
      name: /use current gps location/i,
    });
    await user.click(gpsBtn);

    await waitFor(() => {
      expect(mockGeolocation.getCurrentPosition).toHaveBeenCalled();
      expect(mockFetch).toHaveBeenCalled();
      expect(toast.success).toHaveBeenCalledWith(
        "Location detected: Zeal College Campus"
      );
    });

    expect(screen.getByTestId("checkout-hostel")).toHaveTextContent(
      "Zeal College Campus"
    );

    vi.unstubAllGlobals();
  });

  it("handles GPS geolocation error with graceful fallback", async () => {
    const user = userEvent.setup();

    const mockGeolocation = {
      getCurrentPosition: vi.fn().mockImplementation((_success, error) => {
        error(new Error("User denied Geolocation"));
      }),
    };

    vi.stubGlobal("navigator", {
      ...global.navigator,
      geolocation: mockGeolocation,
    });

    renderWithProviders();

    await user.click(
      screen.getByRole("button", { name: /open location modal/i })
    );

    const gpsBtn = screen.getByRole("button", {
      name: /use current gps location/i,
    });
    await user.click(gpsBtn);

    await waitFor(() => {
      expect(mockGeolocation.getCurrentPosition).toHaveBeenCalled();
      expect(toast.info).toHaveBeenCalledWith(
        "GPS unavailable: Set to Hostel Block A"
      );
    });

    vi.unstubAllGlobals();
  });
});
