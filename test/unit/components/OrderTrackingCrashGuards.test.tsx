import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { OrderItems } from "@/components/order-details/OrderItems";
import { CustomerOtpCard } from "@/components/common/CustomerOtpCard";
import { OrderCard } from "@/components/orders/OrderCard";
import { useOrderFiltering } from "@/hooks/orders/useOrderFiltering";
import { renderHook, act } from "@testing-library/react";
import type { Order } from "@/types";

describe("Order Tracking Crash Defensive Guards (#418)", () => {
  describe("OrderItems defensive guards", () => {
    it("renders gracefully without crashing when items is undefined", () => {
      render(<OrderItems items={undefined as any} />);
      expect(screen.getByText("Ordered Items")).toBeInTheDocument();
      expect(screen.getByText("0 items")).toBeInTheDocument();
    });

    it("renders gracefully when items is an empty list", () => {
      render(<OrderItems items={[]} />);
      expect(screen.getByText("0 items")).toBeInTheDocument();
    });

    it("renders items correctly when items array is provided", () => {
      const mockItems = [
        { id: "item-1", name: "Masala Dosa", price: 60, quantity: 2 },
      ];
      render(<OrderItems items={mockItems} />);
      expect(screen.getByText("1 item")).toBeInTheDocument();
      expect(screen.getByText("Masala Dosa")).toBeInTheDocument();
      expect(screen.getByText(/2\s*×\s*₹/)).toBeInTheDocument();
    });
  });

  describe("CustomerOtpCard formatting and padding", () => {
    it("safely pads numeric OTPs under 4 digits with leading zeros", () => {
      render(<CustomerOtpCard otp={42} variant="detailed" />);
      expect(screen.getByText("0042")).toBeInTheDocument();
      expect(screen.getByLabelText("Delivery OTP code: 0042")).toBeInTheDocument();
    });

    it("renders 4-digit OTP correctly in compact and detailed variants", () => {
      const { rerender } = render(<CustomerOtpCard otp={1234} variant="detailed" />);
      expect(screen.getByText("1234")).toBeInTheDocument();

      rerender(<CustomerOtpCard otp={1234} variant="compact" />);
      expect(screen.getByText("1234")).toBeInTheDocument();
    });

    it("returns null when otp is null or undefined without throwing", () => {
      const { container } = render(<CustomerOtpCard otp={null} />);
      expect(container.firstChild).toBeNull();
    });
  });

  describe("OrderCard defensive guards against undefined items", () => {
    it("renders without crashing when order.items is missing or null", () => {
      const incompleteOrder: Order = {
        _id: "order-err-test",
        customer_name: "Test Student",
        phone: "9876543210",
        address: "Hostel Block A",
        restaurant_name: "Zeal Canteen",
        restaurant_email: "canteen@zeal.edu",
        status: "Preparing",
        total: 100,
        payment_method: "cod",
        payment_status: "pending",
        items: undefined as any,
      };

      render(<OrderCard order={incompleteOrder} />);
      expect(screen.getByText("Zeal Canteen")).toBeInTheDocument();
      expect(screen.getByText("Preparing")).toBeInTheDocument();
    });
  });

  describe("useOrderFiltering hook defensive guards", () => {
    it("filters orders without crashing when an order has undefined items", () => {
      const ordersWithMissingItems = [
        {
          _id: "ord-1",
          restaurant_name: "Campus Grill",
          restaurant_email: "grill@campus.edu",
          status: "Accepted",
          items: undefined as any,
        } as Order,
        {
          _id: "ord-2",
          restaurant_name: "Campus Cafe",
          restaurant_email: "cafe@campus.edu",
          status: "Delivered",
          items: [{ id: "1", name: "Cold Coffee", price: 40, quantity: 1 }],
        } as Order,
      ];

      const { result } = renderHook(() =>
        useOrderFiltering(ordersWithMissingItems)
      );

      expect(result.current.filteredOrders.length).toBe(2);

      // Perform a search query to test search index string creation
      act(() => {
        result.current.setSearch("Coffee");
      });
      expect(result.current.filteredOrders.length).toBe(1);
      expect(result.current.filteredOrders[0]._id).toBe("ord-2");
    });
  });

  describe("PaymentBreakdown and OrderReceipt Dynamic Subtotal Calculation", () => {
    it("computes items_subtotal dynamically from items array when subtotal is mismatched or missing", async () => {
      const { PaymentBreakdown } = await import("@/components/orders/PaymentBreakdown");

      const orderWithMismatch: Partial<Order> = {
        _id: "order-244",
        items_subtotal: 190.0, // Mismatched stored subtotal
        items: [
          { id: "i1", name: "Veg Burger", price: 100, quantity: 2 },
          { id: "i2", name: "Fries", price: 22, quantity: 2 },
        ],
        // 100*2 + 22*2 = 244.00
      };

      render(<PaymentBreakdown order={orderWithMismatch} />);

      // Computed subtotal: ₹244.00
      expect(screen.getByText("₹244.00")).toBeInTheDocument();
      // Food GST (5% of 244): ₹12.20
      expect(screen.getByText("₹12.20")).toBeInTheDocument();
      // Platform Tech Fee: ₹3.00
      expect(screen.getByText("₹3.00")).toBeInTheDocument();
      // Delivery Fee: ₹15.00
      expect(screen.getByText("₹15.00")).toBeInTheDocument();
      // Total Paid: 244 + 12.20 + 3 + 15 = ₹274.20
      expect(screen.getByText("₹274.20")).toBeInTheDocument();
    });

    it("uses OrderReceipt alias and handles empty or missing items array safely", async () => {
      const { OrderReceipt } = await import("@/components/orders/PaymentBreakdown");

      render(<OrderReceipt order={null} />);
      expect(screen.getByText("Items Subtotal")).toBeInTheDocument();
      expect(screen.getAllByText("₹0.00").length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText("Total Paid")).toBeInTheDocument();
    });
  });
});
