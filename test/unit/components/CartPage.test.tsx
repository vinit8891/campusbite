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
  city: "Campus",
  pincode: "000000",
  landmark: "Main Gate",
  delivery_instructions: "",
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

  it("renders cart items and pricing breakdown with calibrated prices, 5% GST, delivery fee, and platform fee", () => {
    render(<CartPage />);

    // Calibrated items:
    // Butter Naan: ceil(40 / 0.82) = 49; qty 2 = 98.00
    // Paneer Butter Masala: ceil(120 / 0.82) = 147; qty 1 = 147.00
    // Subtotal: 98 + 147 = 245.00
    // Food GST (5%): 245 * 0.05 = 12.25
    // Delivery Fee: 15.00 (Hostel Batch)
    // Platform Tech Fee: 5.00
    // Grand Total: 245 + 12.25 + 15 + 5 = 277.25

    expect(screen.getByText("Your Order")).toBeInTheDocument();
    expect(screen.getByText("Butter Naan")).toBeInTheDocument();
    expect(screen.getByText("Paneer Butter Masala")).toBeInTheDocument();

    expect(screen.getByText("Items Subtotal")).toBeInTheDocument();
    expect(screen.getByText("₹245.00")).toBeInTheDocument();

    expect(screen.getByText("Food GST (5%)")).toBeInTheDocument();
    expect(screen.getByText("₹12.25")).toBeInTheDocument();

    expect(screen.getByText("Delivery Fee")).toBeInTheDocument();
    expect(screen.getAllByText("Hostel Batch").length).toBeGreaterThan(0);
    expect(screen.getByText("₹15.00")).toBeInTheDocument();

    expect(screen.getByText("Platform Tech Fee")).toBeInTheDocument();
    expect(screen.getByText("₹5.00")).toBeInTheDocument();

    expect(screen.getByText("Grand Total")).toBeInTheDocument();
    expect(screen.getByText("₹277.25")).toBeInTheDocument();
  });

  it("allows selecting Direct Room Delivery and updates delivery mode state", async () => {
    const user = userEvent.setup();
    render(<CartPage />);

    const directDeliveryBtn = screen.getByRole("radio", {
      name: /Direct Room/i,
    });
    await user.click(directDeliveryBtn);

    expect(mockSetDeliveryType).toHaveBeenCalledWith("EXPRESS_DOOR");
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

  it("shows minimum delivery warning and disables checkout when subtotal < ₹35 on delivery", async () => {
    const user = userEvent.setup();
    // 1 item with price 10 -> calibrated ceil(10/0.82) = 13 < 35
    mockCartState = [
      {
        id: "item-tea",
        name: "Masala Chai",
        price: 10,
        quantity: 1,
        image: "/images/food/chai.jpg",
        restaurant_email: "eatery@campus.edu",
        restaurant_name: "Campus Eatery",
      },
    ];
    mockDeliveryType = "HOSTEL_BATCH";

    render(<CartPage />);

    expect(
      screen.getByText(/Hostel delivery requires a minimum food order of ₹35.00/i)
    ).toBeInTheDocument();

    const checkoutBtn = screen.getByRole("button", {
      name: /Min Delivery ₹35 Required/i,
    });
    expect(checkoutBtn).toBeDisabled();

    // Quick switch to Takeaway
    const switchBtn = screen.getByRole("button", {
      name: /Switch to Counter Takeaway/i,
    });
    await user.click(switchBtn);
    expect(mockSetDeliveryType).toHaveBeenCalledWith("COUNTER_TAKEAWAY");
  });

  it("shows small order surcharge and helper tip when delivery subtotal is between ₹35 and ₹50", () => {
    // 1 item with price 30 -> calibrated ceil(30/0.82) = 37 (between 35 and 50)
    mockCartState = [
      {
        id: "item-snack",
        name: "Veg Sandwich",
        price: 30,
        quantity: 1,
        image: "/images/food/sandwich.jpg",
        restaurant_email: "eatery@campus.edu",
        restaurant_name: "Campus Eatery",
      },
    ];
    mockDeliveryType = "HOSTEL_BATCH";

    render(<CartPage />);

    // Small Order Surcharge line item
    expect(screen.getByText("Small Order Surcharge")).toBeInTheDocument();
    expect(screen.getByText("+₹5.00")).toBeInTheDocument();

    // Helper tip
    expect(
      screen.getByText(/Add.*to waive the ₹5 small order fee!/i)
    ).toBeInTheDocument();

    // Checkout button is active
    const checkoutBtn = screen.getByRole("button", {
      name: /Proceed to Checkout/i,
    });
    expect(checkoutBtn).toBeEnabled();
  });
});
