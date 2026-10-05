import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AdminOrdersTable } from "@/components/admin/AdminOrdersTable";
import { DeleteOrderModal } from "@/components/admin/DeleteOrderModal";
import { deleteAdminOrder, type AdminOrder } from "@/services/adminService";

const mockOrders: AdminOrder[] = [
  {
    _id: "660c1f1f1f1f1f1f1f1f1f1f",
    customer_name: "Aarav Sharma",
    customer_email: "aarav@campus.edu",
    restaurant_name: "North Canteen",
    status: "Preparing",
    payment_method: "online",
    payment_status: "paid",
    total: 240,
    created_at: "2026-09-05T12:00:00Z",
  },
  {
    _id: "660c2f2f2f2f2f2f2f2f2f2f",
    customer_name: "Priya Patel",
    customer_email: "priya@campus.edu",
    restaurant_name: "South Mess",
    status: "Delivered",
    payment_method: "cod",
    payment_status: "paid",
    total: 150,
    created_at: "2026-09-05T11:30:00Z",
  },
];

describe("Admin Orders Management & Deletion Control", () => {
  describe("AdminOrdersTable Component", () => {
    it("renders table headers including Fulfillment and Actions columns", () => {
      render(<AdminOrdersTable orders={mockOrders} />);

      expect(screen.getByText("Order ID")).toBeInTheDocument();
      expect(screen.getByText("Fulfillment")).toBeInTheDocument();
      expect(screen.getByText("Customer")).toBeInTheDocument();
      expect(screen.getByText("Restaurant")).toBeInTheDocument();
      expect(screen.getByText("Order Status")).toBeInTheDocument();
      expect(screen.getByText("Payment Method")).toBeInTheDocument();
      expect(screen.getByText("Payment Status")).toBeInTheDocument();
      expect(screen.getByText("Total")).toBeInTheDocument();
      expect(screen.getByText("Created At")).toBeInTheDocument();
      expect(screen.getByText("Actions")).toBeInTheDocument();
    });

    it("renders order rows with customer and pricing details and fulfillment badges", () => {
      render(<AdminOrdersTable orders={mockOrders} />);

      expect(screen.getByText("Aarav Sharma")).toBeInTheDocument();
      expect(screen.getByText("aarav@campus.edu")).toBeInTheDocument();
      expect(screen.getByText("North Canteen")).toBeInTheDocument();
      expect(screen.getByText("₹240.00")).toBeInTheDocument();

      expect(screen.getByText("Priya Patel")).toBeInTheDocument();
      expect(screen.getByText("South Mess")).toBeInTheDocument();
      expect(screen.getByText("₹150.00")).toBeInTheDocument();

      expect(screen.getAllByText("DELIVERY").length).toBeGreaterThan(0);
    });

    it("renders +₹5 Small Cart tag when order has small_order_fee > 0", () => {
      const ordersWithSmallCart: AdminOrder[] = [
        {
          _id: "660c3f3f3f3f3f3f3f3f3f3f",
          customer_name: "Rahul Verma",
          customer_email: "rahul@campus.edu",
          restaurant_name: "Tea Post",
          status: "Delivered",
          payment_method: "online",
          payment_status: "paid",
          total: 65,
          food_subtotal: 40,
          small_order_fee: 5,
          delivery_type: "DELIVERY",
          created_at: "2026-09-05T12:00:00Z",
        },
        {
          _id: "660c4f4f4f4f4f4f4f4f4f4f",
          customer_name: "Neha Gupta",
          restaurant_name: "Quick Bites",
          status: "Ready for Pickup",
          payment_method: "cod",
          total: 30,
          food_subtotal: 30,
          order_type: "TAKEAWAY",
          created_at: "2026-09-05T12:30:00Z",
        },
      ];

      render(<AdminOrdersTable orders={ordersWithSmallCart} />);

      expect(screen.getByTestId("small-order-tag")).toBeInTheDocument();
      expect(screen.getByText("⚡ +₹5 Small Cart")).toBeInTheDocument();
      expect(screen.getByText("TAKEAWAY")).toBeInTheDocument();
    });

    it("triggers onViewOrder callback when view details button is clicked", () => {
      const handleView = vi.fn();
      render(
        <AdminOrdersTable orders={mockOrders} onViewOrder={handleView} />
      );

      const viewButtons = screen.getAllByRole("button", {
        name: /view details for order/i,
      });
      expect(viewButtons.length).toBe(2);

      fireEvent.click(viewButtons[0]);
      expect(handleView).toHaveBeenCalledTimes(1);
      expect(handleView).toHaveBeenCalledWith(mockOrders[0]);
    });

    it("triggers onDeleteOrder callback when delete button is clicked", () => {
      const handleDelete = vi.fn();
      render(
        <AdminOrdersTable orders={mockOrders} onDeleteOrder={handleDelete} />
      );

      const deleteButtons = screen.getAllByRole("button", {
        name: /delete order/i,
      });
      expect(deleteButtons.length).toBe(2);

      fireEvent.click(deleteButtons[0]);
      expect(handleDelete).toHaveBeenCalledTimes(1);
      expect(handleDelete).toHaveBeenCalledWith(mockOrders[0]);
    });
  });

  describe("DeleteOrderModal Component", () => {
    it("renders order details, warning notice, and confirmation buttons", () => {
      const handleConfirm = vi.fn();
      const handleCancel = vi.fn();

      render(
        <DeleteOrderModal
          isOpen={true}
          order={mockOrders[0]}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />
      );

      expect(
        screen.getByRole("heading", { name: /confirm order deletion/i })
      ).toBeInTheDocument();
      expect(screen.getByText("Aarav Sharma")).toBeInTheDocument();
      expect(screen.getByText("North Canteen")).toBeInTheDocument();
      expect(screen.getByText("₹240.00")).toBeInTheDocument();
      expect(
        screen.getByText(/all item manifests and courier assignments/i)
      ).toBeInTheDocument();

      const cancelBtn = screen.getByRole("button", { name: /cancel/i });
      fireEvent.click(cancelBtn);
      expect(handleCancel).toHaveBeenCalledTimes(1);

      const confirmBtn = screen.getByRole("button", {
        name: /confirm delete/i,
      });
      fireEvent.click(confirmBtn);
      expect(handleConfirm).toHaveBeenCalledTimes(1);
    });

    it("returns null when isOpen is false", () => {
      const { container } = render(
        <DeleteOrderModal
          isOpen={false}
          order={mockOrders[0]}
          onConfirm={vi.fn()}
          onCancel={vi.fn()}
        />
      );

      expect(container.firstChild).toBeNull();
    });
  });

  describe("deleteAdminOrder Service", () => {
    it("calls DELETE /api/admin/orders/:order_id successfully", async () => {
      const response = await deleteAdminOrder("660c1f1f1f1f1f1f1f1f1f1f");
      expect(response.success).toBe(true);
      expect(response.message).toBe("Order deleted successfully");
    });
  });
});
