import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import OrderSummary from "@/components/checkout/OrderSummary";
import * as orderService from "@/services/orderService";

const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
    back: vi.fn(),
  }),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

let currentCart = [
  { id: "1", name: "Veg Thali", price: 100, quantity: 1, restaurant_email: "rest@campus.in" },
];

let mockCheckoutState = {
  customer_name: "John Doe",
  phone: "9876543210",
  address: "Room 101, Block A",
  city: "Campus",
  pincode: "000000",
  landmark: "Near Mess",
  delivery_instructions: "Call when downstairs",
  payment_method: "cod",
  cod_confirmed: true,
  online_confirmed: false,
  delivery_for: "self" as const,
  delivery_type: "HOSTEL_BATCH" as const,
  hostel_block: "Hostel Block A",
  tip_amount: 0,
  latitude: 18.52,
  longitude: 73.85,
  restaurant_email: "rest@campus.in",
  restaurant_latitude: 18.52,
  restaurant_longitude: 73.85,
};

const mockSetCheckout = vi.fn((updater) => {
  if (typeof updater === "function") {
    mockCheckoutState = updater(mockCheckoutState);
  } else {
    mockCheckoutState = updater;
  }
});

vi.mock("@/context/CartContext", () => ({
  useCart: () => ({
    cart: currentCart,
    clearCart: vi.fn(),
  }),
}));

vi.mock("@/context/CheckoutContext", () => ({
  useCheckout: () => ({
    checkout: mockCheckoutState,
    setCheckout: mockSetCheckout,
  }),
}));

vi.mock("@/context/AuthContext", () => ({
  useAuth: () => ({
    isLoggedIn: true,
    user: { name: "John Doe", email: "john@campus.in", phone: "9876543210" },
  }),
}));

describe("OrderSummary Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentCart = [
      { id: "1", name: "Veg Thali", price: 100, quantity: 1, restaurant_email: "rest@campus.in" },
    ];
    mockCheckoutState = {
      customer_name: "John Doe",
      phone: "9876543210",
      address: "Room 101, Block A",
      city: "Campus",
      pincode: "000000",
      landmark: "Near Mess",
      delivery_instructions: "Call when downstairs",
      payment_method: "cod",
      cod_confirmed: true,
      online_confirmed: false,
      delivery_for: "self",
      delivery_type: "HOSTEL_BATCH",
      hostel_block: "Hostel Block A",
      tip_amount: 0,
      latitude: 18.52,
      longitude: 73.85,
      restaurant_email: "rest@campus.in",
      restaurant_latitude: 18.52,
      restaurant_longitude: 73.85,
    };
  });

  it("renders order items and statutory pricing breakdown (5% GST, ₹15 batch delivery, ₹5 tech fee, COD rounding)", () => {
    render(<OrderSummary />);

    expect(screen.getByText("Veg Thali × 1")).toBeInTheDocument();
    expect(screen.getByText("Items Subtotal")).toBeInTheDocument();
    expect(screen.getAllByText("₹122.00").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Food GST (5%)")).toBeInTheDocument();
    expect(screen.getByText("₹6.10")).toBeInTheDocument();
    expect(screen.getByText("Delivery Fee")).toBeInTheDocument();
    expect(screen.getByText("Hostel Batch (₹15)")).toBeInTheDocument();
    expect(screen.getByText("Platform Tech Fee")).toBeInTheDocument();
    expect(screen.getByText("₹5.00")).toBeInTheDocument();
    // Total = 122 + 6.10 + 15 + 5 = 148.10 -> 148 (COD rounded)
    expect(screen.getAllByText("₹148").length).toBeGreaterThanOrEqual(1);
  });

  it("displays amber banner and disables checkout button when delivery subtotal is below ₹35", async () => {
    const user = userEvent.setup();
    // Counter price 20 -> Calibrated app price 25 (< 35)
    currentCart = [
      { id: "tea", name: "Tea", price: 20, quantity: 1, restaurant_email: "rest@campus.in" },
    ];

    render(<OrderSummary />);

    // Amber banner with message
    expect(
      screen.getByText(/Hostel delivery requires a minimum food order of ₹35\.00/i)
    ).toBeInTheDocument();

    // Quick toggle button to switch to Takeaway
    const switchBtn = screen.getByRole("button", {
      name: /Switch to Counter Takeaway/i,
    });
    expect(switchBtn).toBeInTheDocument();

    // CTA button is disabled
    const ctaBtn = screen.getByRole("button", { name: /Min ₹35 Delivery Required/i });
    expect(ctaBtn).toBeDisabled();

    // Clicking switch to takeaway updates checkout
    await user.click(switchBtn);
    expect(mockSetCheckout).toHaveBeenCalled();
  });

  it("displays small order surcharge and helper tip when delivery subtotal is ₹35 to ₹49.99", () => {
    // Counter price 30 -> Calibrated app price 37 (between 35 and 49.99)
    currentCart = [
      { id: "samosa", name: "Samosa", price: 30, quantity: 1, restaurant_email: "rest@campus.in" },
    ];

    render(<OrderSummary />);

    // Surcharge line item
    expect(screen.getByText("Small Order Surcharge")).toBeInTheDocument();
    expect(screen.getByText("(under ₹50)")).toBeInTheDocument();
    expect(screen.getByText("+₹5.00")).toBeInTheDocument();

    // Helper tip
    expect(
      screen.getByText(/to waive the ₹5 small order fee!/i)
    ).toBeInTheDocument();
  });

  it("allows selecting rider tip and updates checkout state", async () => {
    const user = userEvent.setup();
    render(<OrderSummary />);

    const tip10Btn = screen.getByRole("button", { name: "₹10" });
    await user.click(tip10Btn);

    expect(mockSetCheckout).toHaveBeenCalled();
  });

  it("submits COD order with complete statutory breakdown and delivery metadata", async () => {
    const user = userEvent.setup();
    const placeOrderSpy = vi.spyOn(orderService, "placeOrder").mockResolvedValueOnce({
      _id: "order_123",
      restaurant_email: "rest@campus.in",
      customer_name: "John Doe",
      phone: "9876543210",
      address: "Room 101, Block A, Hostel Block A, Ref: Near Mess (Note: Call when downstairs)",
      payment_method: "cod",
      total: 148,
      status: "Pending",
      items: currentCart,
    });

    render(<OrderSummary />);

    const submitBtn = screen.getByRole("button", { name: /Place COD Order/i });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(placeOrderSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          restaurant_email: "rest@campus.in",
          delivery_type: "HOSTEL_BATCH",
          hostel_block: "Hostel Block A",
          total: 148,
          payment_method: "cod",
          address: expect.stringContaining("Room 101, Block A"),
        })
      );
      expect(mockPush).toHaveBeenCalledWith("/order-success?orderId=order_123");
    });
  });
});
