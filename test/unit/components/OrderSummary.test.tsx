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

const mockCart = [
  { id: "1", name: "Veg Thali", price: 100, quantity: 1, restaurant_email: "rest@campus.in" },
];

let mockCheckoutState = {
  customer_name: "John Doe",
  phone: "9876543210",
  address: "Room 101, Block A",
  city: "Pune",
  pincode: "411041",
  landmark: "Near Mess",
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
    cart: mockCart,
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
    mockCheckoutState = {
      customer_name: "John Doe",
      phone: "9876543210",
      address: "Room 101, Block A",
      city: "Pune",
      pincode: "411041",
      landmark: "Near Mess",
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

  it("renders order items and statutory pricing breakdown (5% GST, ₹15 batch delivery, ₹3 tech fee)", () => {
    render(<OrderSummary />);

    expect(screen.getByText("Veg Thali × 1")).toBeInTheDocument();
    expect(screen.getByText("Items Total")).toBeInTheDocument();
    expect(screen.getAllByText("₹100.00").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Restaurant GST (5%)")).toBeInTheDocument();
    expect(screen.getByText("₹5.00")).toBeInTheDocument();
    expect(screen.getByText("Delivery Fee")).toBeInTheDocument();
    expect(screen.getByText("Saved ₹25")).toBeInTheDocument();
    expect(screen.getByText("Platform Tech Fee")).toBeInTheDocument();
    expect(screen.getByText("₹3.00")).toBeInTheDocument();
    // Total = 100 + 5 + 15 + 3 = 123.00
    expect(screen.getByText("₹123.00")).toBeInTheDocument();
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
      address: "Room 101, Block A, Pune - 411041, Near Mess",
      payment_method: "cod",
      total: 123.00,
      status: "Pending",
      items: mockCart,
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
          total: 123.00,
          payment_method: "cod",
        })
      );
      expect(mockPush).toHaveBeenCalledWith("/order-success?orderId=order_123");
    });
  });
});
