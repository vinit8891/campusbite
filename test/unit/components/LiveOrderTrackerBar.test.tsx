import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  LiveOrderTrackerBar,
  isRestrictedPath,
  isNonCustomerRole,
} from "@/components/orders/LiveOrderTrackerBar";
import * as orderService from "@/services/orderService";
import type { Order } from "@/types";

let mockIsLoggedIn = true;
let mockPathname = "/";

vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname,
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

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

describe("LiveOrderTrackerBar Component & Guards", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsLoggedIn = true;
    mockPathname = "/";
    document.cookie = "cb_role=; path=/; max-age=0";
  });

  it("isRestrictedPath identifies admin, restaurant, delivery, and auth pages", () => {
    expect(isRestrictedPath("/admin")).toBe(true);
    expect(isRestrictedPath("/admin/orders")).toBe(true);
    expect(isRestrictedPath("/restaurant/dashboard")).toBe(true);
    expect(isRestrictedPath("/delivery/dashboard")).toBe(true);
    expect(isRestrictedPath("/login")).toBe(true);
    expect(isRestrictedPath("/register")).toBe(true);
    expect(isRestrictedPath("/forgot-password")).toBe(true);
    expect(isRestrictedPath("/reset-password")).toBe(true);
    expect(isRestrictedPath("/orders/order-101")).toBe(true);
    expect(isRestrictedPath("/track-order/order-101")).toBe(true);

    expect(isRestrictedPath("/")).toBe(false);
    expect(isRestrictedPath("/restaurants")).toBe(false);
    expect(isRestrictedPath("/subscriptions")).toBe(false);
    expect(isRestrictedPath("/cart")).toBe(false);
    expect(isRestrictedPath("/my-orders")).toBe(false);
    expect(isRestrictedPath("/profile")).toBe(false);
  });

  it("does not render or fetch orders on restricted portal paths or dedicated tracking pages", async () => {
    const getMyOrdersSpy = vi
      .spyOn(orderService, "getMyOrders")
      .mockResolvedValue([mockActiveOrder]);

    mockPathname = "/admin/dashboard";
    const { rerender } = render(<LiveOrderTrackerBar />);
    expect(screen.queryByTestId("live-order-tracker-bar")).not.toBeInTheDocument();
    expect(getMyOrdersSpy).not.toHaveBeenCalled();

    mockPathname = "/restaurant/dashboard";
    rerender(<LiveOrderTrackerBar />);
    expect(screen.queryByTestId("live-order-tracker-bar")).not.toBeInTheDocument();
    expect(getMyOrdersSpy).not.toHaveBeenCalled();

    mockPathname = "/delivery/dashboard";
    rerender(<LiveOrderTrackerBar />);
    expect(screen.queryByTestId("live-order-tracker-bar")).not.toBeInTheDocument();
    expect(getMyOrdersSpy).not.toHaveBeenCalled();

    mockPathname = "/login";
    rerender(<LiveOrderTrackerBar />);
    expect(screen.queryByTestId("live-order-tracker-bar")).not.toBeInTheDocument();
    expect(getMyOrdersSpy).not.toHaveBeenCalled();

    mockPathname = "/orders/order-101";
    rerender(<LiveOrderTrackerBar />);
    expect(screen.queryByTestId("live-order-tracker-bar")).not.toBeInTheDocument();
    expect(getMyOrdersSpy).not.toHaveBeenCalled();

    mockPathname = "/track-order/order-101";
    rerender(<LiveOrderTrackerBar />);
    expect(screen.queryByTestId("live-order-tracker-bar")).not.toBeInTheDocument();
    expect(getMyOrdersSpy).not.toHaveBeenCalled();
  });

  it("does not render or fetch orders when active session has a non-customer role cookie", async () => {
    document.cookie = "cb_role=restaurant_owner; path=/";
    const getMyOrdersSpy = vi
      .spyOn(orderService, "getMyOrders")
      .mockResolvedValue([mockActiveOrder]);

    render(<LiveOrderTrackerBar />);
    expect(screen.queryByTestId("live-order-tracker-bar")).not.toBeInTheDocument();
    expect(getMyOrdersSpy).not.toHaveBeenCalled();
  });

  it("does not render when customer is not logged in", async () => {
    mockIsLoggedIn = false;
    const getMyOrdersSpy = vi
      .spyOn(orderService, "getMyOrders")
      .mockResolvedValue([mockActiveOrder]);

    render(<LiveOrderTrackerBar />);
    expect(screen.queryByTestId("live-order-tracker-bar")).not.toBeInTheDocument();
    expect(getMyOrdersSpy).not.toHaveBeenCalled();
  });

  it("renders live activity bar on customer shopping pages when active order exists", async () => {
    const user = userEvent.setup();
    mockIsLoggedIn = true;
    mockPathname = "/";
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

    // Toggle OTP reveal
    const otpButton = screen.getByRole("button", { name: /show handover otp/i });
    expect(otpButton).toHaveTextContent("Show OTP");

    await user.click(otpButton);
    expect(screen.getByText("OTP: 4821")).toBeInTheDocument();
  });

  it("omits OTP pill when active order does not have delivery_otp or otp", async () => {
    mockIsLoggedIn = true;
    mockPathname = "/";
    const orderWithoutOtp: Order = {
      ...mockActiveOrder,
      delivery_otp: undefined,
    };
    vi.spyOn(orderService, "getMyOrders").mockResolvedValue([orderWithoutOtp]);

    render(<LiveOrderTrackerBar />);

    await waitFor(() => {
      expect(screen.getByTestId("live-order-tracker-bar")).toBeInTheDocument();
    });

    expect(screen.queryByRole("button", { name: /show handover otp/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/OTP:/i)).not.toBeInTheDocument();
  });

  it("clears active order and localStorage when all orders are completed or delivered", async () => {
    mockIsLoggedIn = true;
    mockPathname = "/";
    const deliveredOrder: Order = {
      ...mockActiveOrder,
      status: "Delivered",
    };
    localStorage.setItem("cb_active_order_id", "order-101");
    vi.spyOn(orderService, "getMyOrders").mockResolvedValue([deliveredOrder]);

    render(<LiveOrderTrackerBar />);

    await waitFor(() => {
      expect(screen.queryByTestId("live-order-tracker-bar")).not.toBeInTheDocument();
    });

    expect(localStorage.getItem("cb_active_order_id")).toBeNull();
  });
});
