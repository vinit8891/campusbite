import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CartPage from "@/app/cart/page";

const mockPush = vi.fn();
const mockBack = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
    back: mockBack,
  }),
}));

const mockCart = [
  {
    id: "item-1",
    name: "Butter Naan",
    price: 40,
    quantity: 2,
    image: "/images/food/naan.jpg",
    restaurant_email: "eatery@campus.edu",
    restaurant_name: "Campus Eatery",
  },
  {
    id: "item-2",
    name: "Paneer Butter Masala",
    price: 120,
    quantity: 1,
    image: "/images/food/paneer.jpg",
    restaurant_email: "eatery@campus.edu",
    restaurant_name: "Campus Eatery",
  },
];

let mockCartState = mockCart;
let mockDeliveryType: "HOSTEL_BATCH" | "STANDARD" = "HOSTEL_BATCH";
const mockSetDeliveryType = vi.fn((type) => {
  mockDeliveryType = type;
});
const mockIncreaseQuantity = vi.fn();
const mockDecreaseQuantity = vi.fn();
const mockRemoveFromCart = vi.fn();

vi.mock("@/context/CartContext", () => ({
  useCart: () => ({
    cart: mockCartState,
    deliveryType: mockDeliveryType,
    setDeliveryType: mockSetDeliveryType,
    increaseQuantity: mockIncreaseQuantity,
    decreaseQuantity: mockDecreaseQuantity,
    removeFromCart: mockRemoveFromCart,
    clearCart: vi.fn(),
  }),
}));

let mockCheckoutState = {
  customer_name: "Jane Doe",
  phone: "9876543210",
  address: "Room 202, Block B",
  city: "Pune",
  pincode: "411041",
  landmark: "Main Gate",
  payment_method: "cod",
  cod_confirmed: true,
  online_confirmed: false,
  delivery_for: "self" as const,
  delivery_type: "HOSTEL_BATCH" as const,
  hostel_block: "Hostel Block A",
  tip_amount: 0,
  latitude: 18.52,
  longitude: 73.85,
  restaurant_email: "eatery@campus.edu",
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

vi.mock("@/context/CheckoutContext", () => ({
  useCheckout: () => ({
    checkout: mockCheckoutState,
    setCheckout: mockSetCheckout,
  }),
}));

describe("CartPage Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCartState = [...mockCart];
    mockDeliveryType = "HOSTEL_BATCH";
  });

  it("renders cart items and pricing breakdown with 5% GST, ₹15 delivery fee, and ₹3 platform fee", () => {
    render(<CartPage />);

    // Items: (40 * 2) + (120 * 1) = 200 Subtotal
    // GST 5%: 200 * 0.05 = 10.00
    // Delivery Fee: 15.00 (Hostel Batch)
    // Platform Fee: 3.00
    // Grand Total: 200 + 10 + 15 + 3 = 228.00

    expect(screen.getByText("Your Order")).toBeInTheDocument();
    expect(screen.getByText("Butter Naan")).toBeInTheDocument();
    expect(screen.getByText("Paneer Butter Masala")).toBeInTheDocument();

    expect(screen.getByText("Subtotal")).toBeInTheDocument();
    expect(screen.getByText("₹200.00")).toBeInTheDocument();

    expect(screen.getByText("Restaurant GST (5%)")).toBeInTheDocument();
    expect(screen.getByText("₹10.00")).toBeInTheDocument();

    expect(screen.getByText("Delivery Fee")).toBeInTheDocument();
    expect(screen.getByText("Hostel Batch")).toBeInTheDocument();
    expect(screen.getByText("₹15.00")).toBeInTheDocument();

    expect(screen.getByText("Platform Fee")).toBeInTheDocument();
    expect(screen.getByText("₹3.00")).toBeInTheDocument();

    expect(screen.getByText("Grand Total")).toBeInTheDocument();
    expect(screen.getByText("₹228.00")).toBeInTheDocument();
  });

  it("allows selecting Direct Room Delivery (₹40) and updates delivery mode state", async () => {
    const user = userEvent.setup();
    render(<CartPage />);

    const directDeliveryBtn = screen.getByRole("radio", {
      name: /Direct Room Delivery/i,
    });
    await user.click(directDeliveryBtn);

    expect(mockSetDeliveryType).toHaveBeenCalledWith("STANDARD");
    expect(mockSetCheckout).toHaveBeenCalled();
  });

  it("navigates to checkout when Proceed to Checkout is clicked", async () => {
    const user = userEvent.setup();
    render(<CartPage />);

    const checkoutBtn = screen.getByRole("button", {
      name: /Proceed to Checkout/i,
    });
    await user.click(checkoutBtn);

    expect(mockPush).toHaveBeenCalledWith("/checkout");
  });
});
