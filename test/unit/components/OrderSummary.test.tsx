import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import OrderSummary from "@/components/checkout/OrderSummary";
import * as orderService from "@/services/orderService";
import * as paymentService from "@/services/paymentService";
import * as razorpayCheckoutModule from "@/lib/razorpayCheckout";

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
  delivery_for: "self" as "self" | "friend",
  delivery_type: "HOSTEL_BATCH" as "HOSTEL_BATCH" | "COUNTER_TAKEAWAY" | "EXPRESS_DOOR" | "STANDARD",
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

  it("renders order items and statutory pricing breakdown (5% GST, ₹15 campus delivery, ₹3 fee, COD rounding)", () => {
    render(<OrderSummary />);

    expect(screen.getByText("Veg Thali × 1")).toBeInTheDocument();
    expect(screen.getByText("Items Subtotal")).toBeInTheDocument();
    expect(screen.getAllByText("₹122.00").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Food GST (5%)")).toBeInTheDocument();
    expect(screen.getByText("₹6.10")).toBeInTheDocument();
    expect(screen.getByText("Delivery Fee")).toBeInTheDocument();
    expect(screen.getByText("Campus Delivery (₹15)")).toBeInTheDocument();
    expect(screen.getByText("Platform Fee")).toBeInTheDocument();
    expect(screen.getByText("₹3.00")).toBeInTheDocument();
    // Total = 122 + 6.10 + 15 + 3 = 146.10 -> 146 (COD rounded)
    expect(screen.getAllByText("₹146").length).toBeGreaterThanOrEqual(1);
  });

  it("renders ₹2 platform fee when takeaway is selected and calculates Veg Thali takeaway total", () => {
    // Veg Thali with counter price ₹80 -> calibrated app price ₹98
    currentCart = [
      { id: "veg_thali", name: "Veg Thali", price: 80, quantity: 1, restaurant_email: "rest@campus.in" },
    ];
    mockCheckoutState = {
      ...mockCheckoutState,
      delivery_type: "COUNTER_TAKEAWAY",
      payment_method: "online",
    };

    render(<OrderSummary />);

    expect(screen.getByText("Veg Thali × 1")).toBeInTheDocument();
    expect(screen.getAllByText("₹98.00").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Food GST (5%)")).toBeInTheDocument();
    expect(screen.getByText("₹4.90")).toBeInTheDocument();
    expect(screen.getByText("Delivery Fee")).toBeInTheDocument();
    expect(screen.getByText("Self Pickup (₹0)")).toBeInTheDocument();
    expect(screen.getByText("₹0.00")).toBeInTheDocument();
    expect(screen.getByText("Platform Fee")).toBeInTheDocument();
    expect(screen.getByText("₹2.00")).toBeInTheDocument();
    // Online total = 98 + 4.90 + 0 + 2 = 104.90
    expect(screen.getAllByText("₹104.90").length).toBeGreaterThanOrEqual(1);
  });

  it("calculates Veg Thali delivery total with ₹3 Platform Fee (₹120.90 online)", () => {
    // Veg Thali counter price ₹80 -> calibrated app price ₹98
    currentCart = [
      { id: "veg_thali", name: "Veg Thali", price: 80, quantity: 1, restaurant_email: "rest@campus.in" },
    ];
    mockCheckoutState = {
      ...mockCheckoutState,
      delivery_type: "HOSTEL_BATCH",
      payment_method: "online",
    };

    render(<OrderSummary />);

    expect(screen.getByText("Veg Thali × 1")).toBeInTheDocument();
    expect(screen.getAllByText("₹98.00").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Food GST (5%)")).toBeInTheDocument();
    expect(screen.getByText("₹4.90")).toBeInTheDocument();
    expect(screen.getByText("Delivery Fee")).toBeInTheDocument();
    expect(screen.getByText("Campus Delivery (₹15)")).toBeInTheDocument();
    expect(screen.getByText("₹15.00")).toBeInTheDocument();
    expect(screen.getByText("Platform Fee")).toBeInTheDocument();
    expect(screen.getByText("₹3.00")).toBeInTheDocument();
    // Online total = 98 + 4.90 + 15 + 3 = 120.90
    expect(screen.getAllByText("₹120.90").length).toBeGreaterThanOrEqual(1);
  });

  it("renders 2 modern fulfillment toggle options and toggles to Takeaway without blockers", async () => {
    const user = userEvent.setup();
    // Counter price 20 -> Calibrated app price 25 (< 35)
    currentCart = [
      { id: "tea", name: "Tea", price: 20, quantity: 1, restaurant_email: "rest@campus.in" },
    ];

    render(<OrderSummary />);

    // Renders the 2 modern options
    expect(screen.getByRole("button", { name: /Campus Delivery/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Takeaway/i })).toBeInTheDocument();

    // CTA button is enabled (no min delivery blocker)
    const ctaBtn = screen.getByRole("button", { name: /Place COD Order/i });
    expect(ctaBtn).not.toBeDisabled();

    // Clicking takeaway toggle button updates checkout
    const takeawayBtn = screen.getByRole("button", { name: /Takeaway/i });
    await user.click(takeawayBtn);
    expect(mockSetCheckout).toHaveBeenCalled();
  });

  it("renders flat ₹3.00 Platform Fee for delivery regardless of subtotal", () => {
    // Counter price 30 -> Calibrated app price 37 (between 35 and 49.99)
    currentCart = [
      { id: "samosa", name: "Samosa", price: 30, quantity: 1, restaurant_email: "rest@campus.in" },
    ];

    render(<OrderSummary />);

    // Platform Fee displays ₹3.00 flat
    expect(screen.getByText("Platform Fee")).toBeInTheDocument();
    expect(screen.getByText("₹3.00")).toBeInTheDocument();

    // No separate surcharge line item
    expect(screen.queryByText("Small Order Surcharge")).not.toBeInTheDocument();
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
      total: 146,
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
          fulfillment_mode: "delivery",
          delivery_type: "HOSTEL_BATCH",
          hostel_block: "Hostel Block A",
          total: 146,
          payment_method: "cod",
          address: expect.stringContaining("Room 101, Block A"),
        })
      );
      expect(mockPush).toHaveBeenCalledWith("/order-success?orderId=order_123");
    });
  });

  it("resets 'Processing your payment' loader and re-enables button when online payment modal is closed", async () => {
    const user = userEvent.setup();
    mockCheckoutState = {
      ...mockCheckoutState,
      payment_method: "online",
      online_confirmed: true,
      cod_confirmed: false,
    };

    vi.spyOn(orderService, "placeOrder").mockResolvedValueOnce({
      _id: "order_online_999",
      restaurant_email: "rest@campus.in",
      customer_name: "John Doe",
      phone: "9876543210",
      payment_method: "online",
      total: 146.1,
      status: "Pending",
      items: currentCart,
    });

    vi.spyOn(paymentService, "getRazorpayConfig").mockResolvedValueOnce({
      provider: "razorpay",
      enabled: true,
      key_id: "rzp_test_sample123",
      mode: "test",
    });

    vi.spyOn(paymentService, "createRazorpayPayment").mockResolvedValueOnce({
      order_id: "order_online_999",
      payment_id: "pay_sample123",
      razorpay_order_id: "order_rzp_999",
      amount: 146.1,
      amount_paise: 14610,
      currency: "INR",
      key_id: "rzp_test_sample123",
      payment_status: "pending",
    });

    const cancelSpy = vi.spyOn(paymentService, "cancelRazorpayPayment").mockResolvedValueOnce({
      message: "cancelled",
    });

    let dismissHandler: (() => void) | undefined;
    vi.spyOn(razorpayCheckoutModule, "triggerUpiOrRazorpayCheckout").mockImplementation(
      async (args: any) => {
        dismissHandler = args.onDismiss;
        return { mode: "razorpay_modal" };
      }
    );

    render(<OrderSummary />);

    const submitBtn = screen.getByRole("button", { name: /Place ONLINE Order/i });
    await user.click(submitBtn);

    // After clicking, button text reflects processing state or loader
    await waitFor(() => {
      expect(dismissHandler).toBeDefined();
    });

    // Invoke modal dismiss callback
    dismissHandler!();

    // Verify loader resets and button returns to enabled Place ONLINE Order state
    await waitFor(() => {
      expect(cancelSpy).toHaveBeenCalledWith("order_online_999", "checkout_dismissed");
      const placeBtn = screen.getByRole("button", { name: /Place ONLINE Order/i });
      expect(placeBtn).toBeInTheDocument();
      expect(placeBtn).not.toBeDisabled();
      expect(screen.queryByText(/Processing your payment/i)).not.toBeInTheDocument();
    });
  });
});
