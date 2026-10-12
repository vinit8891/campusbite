import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import DeliveryOrdersPage from "@/app/delivery/dashboard/orders/page";
import type { DeliveryOrder } from "@/types";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
  }),
  usePathname: () => "/delivery/dashboard/orders",
}));

const mockOrders: DeliveryOrder[] = [
  {
    _id: "order-active-1",
    restaurant_email: "canteen@campus.edu",
    customer_name: "Rahul Sharma",
    customer_email: "rahul@campus.edu",
    phone: "9876543210",
    address: "Room 101, Hostel A",
    status: "Out for Delivery",
    payment_method: "cod",
    payment_status: "pending",
    total: 150,
    created_at: "2026-10-12T10:00:00Z",
    items: [{ id: "item-1", name: "Thali", price: 150, quantity: 1 }],
  },
  {
    _id: "6accabe2-history-order",
    restaurant_email: "canteen@campus.edu",
    customer_name: "Pooja Patel",
    customer_email: "pooja@campus.edu",
    phone: "9876543211",
    address: "Room 202, Hostel B",
    status: "delivered",
    payment_method: "online",
    payment_status: "paid",
    total: 220,
    created_at: "2026-10-12T09:00:00Z",
    items: [{ id: "item-2", name: "Biryani", price: 220, quantity: 1 }],
  },
  {
    _id: "cancelled-order-3",
    restaurant_email: "canteen@campus.edu",
    customer_name: "Amit Kumar",
    customer_email: "amit@campus.edu",
    phone: "9876543212",
    address: "Room 303, Hostel C",
    status: "cancelled",
    payment_method: "online",
    payment_status: "refunded",
    total: 80,
    created_at: "2026-10-12T08:00:00Z",
    items: [{ id: "item-3", name: "Chai", price: 40, quantity: 2 }],
  },
];

let hookOrders = mockOrders;
let hookLoading = false;
let hookError = "";

vi.mock("@/hooks/delivery/useDeliveryOrders", () => ({
  DELIVERY_STATUS_OPTIONS: ["Assigned", "Picked Up", "Out for Delivery", "Delivered"],
  formatAssignedTime: () => "Today 10:00 AM",
  useDeliveryOrders: () => ({
    orders: hookOrders,
    loading: hookLoading,
    error: hookError,
    q: "",
    setQ: vi.fn(),
    status: "",
    setStatus: vi.fn(),
    otpOrderId: null,
    setOtpOrderId: vi.fn(),
    otp: "",
    setOtp: vi.fn(),
    verifying: false,
    otpError: "",
    setOtpError: vi.fn(),
    loadOrders: vi.fn(),
    currentFilters: vi.fn(),
    updateStatus: vi.fn(),
    verifyOTP: vi.fn(),
    handleSearchSubmit: vi.fn(),
  }),
}));

describe("DeliveryOrdersPage Dual-Tab Segregation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hookOrders = [...mockOrders];
    hookLoading = false;
    hookError = "";
  });

  it("segregates assigned orders into active runs and run history tabs with correct counts", () => {
    render(<DeliveryOrdersPage />);

    expect(screen.getByText("🛵 Active Runs")).toBeInTheDocument();
    expect(screen.getByText("📋 Run History")).toBeInTheDocument();

    // 1 active run, 2 past runs (1 delivered, 1 cancelled)
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();

    // In Active tab by default: Rahul Sharma should be visible in table and cards
    expect(screen.getAllByText("Rahul Sharma").length).toBeGreaterThan(0);
    expect(screen.queryByText("Pooja Patel")).not.toBeInTheDocument();
  });

  it("switches to Run History tab on click and displays past/delivered runs including #6accabe2", async () => {
    const user = userEvent.setup();
    render(<DeliveryOrdersPage />);

    const historyTabBtn = screen.getByRole("button", { name: /Run History/i });
    await user.click(historyTabBtn);

    // Past orders should now be rendered in table and cards
    expect(screen.getAllByText("Pooja Patel").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Amit Kumar").length).toBeGreaterThan(0);
    expect(screen.queryByText("Rahul Sharma")).not.toBeInTheDocument();
  });

  it("renders the empty state card when there are no active runs and provides link to browse available and switch to history", async () => {
    const user = userEvent.setup();
    // Only past orders, no active orders
    hookOrders = [mockOrders[1]]; // Pooja Patel (delivered)

    render(<DeliveryOrdersPage />);

    expect(screen.getByText("No active runs right now!")).toBeInTheDocument();
    expect(
      screen.getByText(
        "You don't have any ongoing deliveries in progress. Check available orders to claim fresh runs."
      )
    ).toBeInTheDocument();

    const browseLink = screen.getByRole("link", { name: /Browse Available Orders/i });
    expect(browseLink).toHaveAttribute("href", "/delivery/available");

    const viewHistoryBtn = screen.getByRole("button", { name: /View History \(1\)/i });
    await user.click(viewHistoryBtn);

    // Clicking switch to history should render the delivered order
    expect(screen.getAllByText("Pooja Patel").length).toBeGreaterThan(0);
    expect(screen.queryByText("No active runs right now!")).not.toBeInTheDocument();
  });

  it("shows clean history empty state when run history is empty", async () => {
    const user = userEvent.setup();
    // Only active orders, no past orders
    hookOrders = [mockOrders[0]];

    render(<DeliveryOrdersPage />);

    const historyTabBtn = screen.getByRole("button", { name: /Run History/i });
    await user.click(historyTabBtn);

    expect(screen.getByText("No run history found")).toBeInTheDocument();
  });
});
