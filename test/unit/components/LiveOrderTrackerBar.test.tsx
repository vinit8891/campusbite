import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LiveOrderTrackerBar } from "@/components/orders/LiveOrderTrackerBar";
import * as orderService from "@/services/orderService";
import type { Order } from "@/types";

let mockIsLoggedIn = true;

vi.mock("@/context/AuthContext", () => ({
  useAuth: () => ({
    isLoggedIn: mockIsLoggedIn,
    user: mockIsLoggedIn ? { name: "Om Roy", email: "om@campus.edu" } : null,
  }),
}));

const mockActiveOrder: Order = {
  _id: "order-101",
  customer_name: "Om Roy",
  phone: "+919876543210",
  address: "Hostel Block B, Room 304",
  restaurant_email: "eatery@campus.edu",
  restaurant_name: "Campus Eatery",
  status: "Out for Delivery",
  total: 250,
  payment_method: "online",
  items: [{ id: "1", name: "Paneer Thali", price: 250, quantity: 1 }],
  delivery_partner: {
    id: "dp-1",
    name: "Rahul Sharma",
    phone: "+919876500000",
  },
  delivery_otp: 4821,
  estimated_time: "15-20 min",
};

describe("LiveOrderTrackerBar Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsLoggedIn = true;
  });

  it("does not render when customer is not logged in", async () => {
    mockIsLoggedIn = false;
    vi.spyOn(orderService, "getMyOrders").mockResolvedValue([mockActiveOrder]);

    render(<LiveOrderTrackerBar />);

    expect(screen.queryByTestId("live-order-tracker-bar")).not.toBeInTheDocument();
  });

  it("does not render when logged in but no active orders exist", async () => {
    mockIsLoggedIn = true;
    const deliveredOrder: Order = {
      ...mockActiveOrder,
      status: "Delivered",
    };
    vi.spyOn(orderService, "getMyOrders").mockResolvedValue([deliveredOrder]);

    render(<LiveOrderTrackerBar />);

    await waitFor(() => {
      expect(screen.queryByTestId("live-order-tracker-bar")).not.toBeInTheDocument();
    });
  });

  it("renders live activity bar with status, ETA, partner name, and reveals OTP on toggle", async () => {
    const user = userEvent.setup();
    mockIsLoggedIn = true;
    vi.spyOn(orderService, "getMyOrders").mockResolvedValue([mockActiveOrder]);

    render(<LiveOrderTrackerBar />);

    await waitFor(() => {
      expect(screen.getByTestId("live-order-tracker-bar")).toBeInTheDocument();
    });

    expect(
      screen.getByText("Out for delivery with Rahul Sharma")
    ).toBeInTheDocument();
    expect(screen.getByText("15-20 min")).toBeInTheDocument();
    expect(screen.getByText("Campus Eatery")).toBeInTheDocument();

    // Initial state of OTP button
    const otpButton = screen.getByRole("button", { name: /show handover otp/i });
    expect(otpButton).toBeInTheDocument();
    expect(otpButton).toHaveTextContent("Show OTP");

    // Click to reveal OTP
    await user.click(otpButton);
    expect(screen.getByText("OTP: 4821")).toBeInTheDocument();

    // Click again to hide
    await user.click(otpButton);
    expect(screen.getByText("Show OTP")).toBeInTheDocument();
  });

  it("renders preparing status correctly when order is being prepared", async () => {
    mockIsLoggedIn = true;
    const preparingOrder: Order = {
      ...mockActiveOrder,
      status: "Preparing",
      delivery_partner: undefined,
    };
    vi.spyOn(orderService, "getMyOrders").mockResolvedValue([preparingOrder]);

    render(<LiveOrderTrackerBar />);

    await waitFor(() => {
      expect(screen.getByTestId("live-order-tracker-bar")).toBeInTheDocument();
    });

    expect(
      screen.getByText("Preparing at Campus Eatery")
    ).toBeInTheDocument();
  });
});
