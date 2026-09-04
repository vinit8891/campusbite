import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { OrderAgainCarousel } from "@/components/home/OrderAgainCarousel";
import * as orderService from "@/services/orderService";
import { toast } from "sonner";
import type { Order } from "@/types";

let mockIsLoggedIn = true;
const mockAddToCart = vi.fn();

vi.mock("@/context/AuthContext", () => ({
  useAuth: () => ({
    isLoggedIn: mockIsLoggedIn,
    user: mockIsLoggedIn ? { name: "Om Roy", email: "om@campus.edu" } : null,
  }),
}));

vi.mock("@/context/CartContext", () => ({
  useCart: () => ({
    addToCart: mockAddToCart,
  }),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const mockPastOrders: Order[] = [
  {
    _id: "order-201",
    customer_name: "Om Roy",
    phone: "+919876543210",
    address: "Hostel Block A",
    restaurant_email: "dhaba@campus.edu",
    restaurant_name: "Campus Dhaba",
    status: "Delivered",
    total: 180,
    payment_method: "upi",
    items: [
      {
        id: "item-10",
        name: "Special Dal Makhani",
        price: 140,
        quantity: 1,
        image: "/images/dal.jpg",
      },
      {
        id: "item-11",
        name: "Butter Roti",
        price: 20,
        quantity: 2,
        image: "/images/roti.jpg",
      },
    ],
  },
];

describe("OrderAgainCarousel Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsLoggedIn = true;
  });

  it("does not render when customer is not logged in", async () => {
    mockIsLoggedIn = false;
    vi.spyOn(orderService, "getMyOrders").mockResolvedValue(mockPastOrders);

    render(<OrderAgainCarousel />);

    expect(screen.queryByTestId("order-again-section")).not.toBeInTheDocument();
  });

  it("does not render when logged in customer has no past orders", async () => {
    mockIsLoggedIn = true;
    vi.spyOn(orderService, "getMyOrders").mockResolvedValue([]);

    render(<OrderAgainCarousel />);

    await waitFor(() => {
      expect(screen.queryByTestId("order-again-section")).not.toBeInTheDocument();
    });
  });

  it("renders past order dishes and adds item to cart on 1-Tap Reorder click with toast", async () => {
    const user = userEvent.setup();
    mockIsLoggedIn = true;
    vi.spyOn(orderService, "getMyOrders").mockResolvedValue(mockPastOrders);

    render(<OrderAgainCarousel />);

    await waitFor(() => {
      expect(screen.getByTestId("order-again-section")).toBeInTheDocument();
    });

    expect(screen.getByText("Special Dal Makhani")).toBeInTheDocument();
    expect(screen.getByText("Butter Roti")).toBeInTheDocument();
    expect(screen.getAllByText("Campus Dhaba").length).toBe(2);

    const reorderBtns = screen.getAllByRole("button", { name: /reorder/i });
    expect(reorderBtns.length).toBe(2);

    await user.click(reorderBtns[0]);

    expect(mockAddToCart).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "item-10",
        name: "Special Dal Makhani",
        price: 140,
        restaurant_email: "dhaba@campus.edu",
        restaurant_name: "Campus Dhaba",
        quantity: 1,
      })
    );

    expect(toast.success).toHaveBeenCalledWith(
      "Added Special Dal Makhani to your cart!"
    );
  });
});
