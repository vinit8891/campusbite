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
  const { fullAddressLabel, activeAddress, savedAddresses, openLocationModal } =
    useLocation();
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
      <div data-testid="active-tag">{activeAddress.tag}</div>
      <div data-testid="saved-count">{savedAddresses.length}</div>
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

describe("LocationPickerModal & Dynamic Saved Addresses Lifecycle", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("starts with empty savedAddresses and displays empty state message in modal", async () => {
    const user = userEvent.setup();
    renderWithProviders();

    expect(screen.getByTestId("saved-count")).toHaveTextContent("0");

    await user.click(
      screen.getByRole("button", { name: /open location modal/i })
    );

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(
      screen.getByText("No saved addresses yet. Enter details above to save.")
    ).toBeInTheDocument();
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

  it("allows selecting address tag, entering custom address, and saving to localStorage and checkout", async () => {
    const user = userEvent.setup();
    renderWithProviders();

    await user.click(
      screen.getByRole("button", { name: /open location modal/i })
    );

    // Select "Home" tag
    const homeTagBtn = screen.getByRole("radio", { name: /home/i });
    await user.click(homeTagBtn);
    expect(homeTagBtn).toHaveAttribute("aria-checked", "true");

    // Enter room/flat
    const roomInput = screen.getByLabelText(/flat \/ room \/ house no/i);
    await user.clear(roomInput);
    await user.type(roomInput, "Flat 201, 2nd Floor");

    // Enter building/society name
    const buildingInput = screen.getByLabelText(
      /building \/ hostel \/ pg \/ society name/i
    );
    await user.clear(buildingInput);
    await user.type(buildingInput, "Sai Residency");

    // Enter landmark
    const landmarkInput = screen.getByLabelText(/area \/ landmark/i);
    await user.clear(landmarkInput);
    await user.type(landmarkInput, "Near West Gate");

    // Click "Save & Deliver Here"
    const saveBtn = screen.getByRole("button", {
      name: /save & deliver here/i,
    });
    await user.click(saveBtn);

    // Modal closes
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    // Context & Checkout verified
    expect(screen.getByTestId("active-tag")).toHaveTextContent("home");
    expect(screen.getByTestId("saved-count")).toHaveTextContent("1");
    expect(screen.getByTestId("checkout-hostel")).toHaveTextContent(
      "Sai Residency"
    );
    expect(screen.getByTestId("checkout-address")).toHaveTextContent(
      "Sai Residency, Flat 201, 2nd Floor"
    );
    expect(screen.getByTestId("checkout-landmark")).toHaveTextContent(
      "Near West Gate"
    );

    // Check localStorage persistence
    const savedInStorage = JSON.parse(
      localStorage.getItem("cb_saved_addresses") || "[]"
    );
    expect(savedInStorage).toHaveLength(1);
    expect(savedInStorage[0].buildingOrSociety).toBe("Sai Residency");
    expect(savedInStorage[0].tag).toBe("home");

    expect(toast.success).toHaveBeenCalledWith(
      "Location set to Sai Residency, Flat 201, 2nd Floor"
    );
  });

  it("allows deleting a saved address from the list and localStorage", async () => {
    // Pre-populate 1 saved address in localStorage
    const initialAddress = {
      id: "addr-test-1",
      tag: "hostel",
      label: "Block B Hostel",
      roomOrFlat: "Room 14",
      buildingOrSociety: "Block B Hostel",
      areaOrLandmark: "Campus Wing B",
      city: "Pune",
    };
    localStorage.setItem(
      "cb_saved_addresses",
      JSON.stringify([initialAddress])
    );

    const user = userEvent.setup();
    renderWithProviders();

    expect(screen.getByTestId("saved-count")).toHaveTextContent("1");

    await user.click(
      screen.getByRole("button", { name: /open location modal/i })
    );

    // Verify saved address card is visible
    expect(screen.getByText("Block B Hostel")).toBeInTheDocument();

    // Click Delete button
    const deleteBtn = screen.getByRole("button", {
      name: /delete saved address block b hostel/i,
    });
    await user.click(deleteBtn);

    // Verify item deleted
    expect(screen.getByTestId("saved-count")).toHaveTextContent("0");
    expect(
      screen.getByText("No saved addresses yet. Enter details above to save.")
    ).toBeInTheDocument();

    const storedList = JSON.parse(
      localStorage.getItem("cb_saved_addresses") || "[]"
    );
    expect(storedList).toHaveLength(0);
    expect(toast.success).toHaveBeenCalledWith("Saved address removed");
  });

  it("handles GPS reverse geocoding with OpenStreetMap Nominatim", async () => {
    const user = userEvent.setup();

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
