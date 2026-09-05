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
    it("renders table headers including Actions column", () => {
      render(<AdminOrdersTable orders={mockOrders} />);

      expect(screen.getByText("Order ID")).toBeInTheDocument();
      expect(screen.getByText("Customer")).toBeInTheDocument();
      expect(screen.getByText("Restaurant")).toBeInTheDocument();
      expect(screen.getByText("Order Status")).toBeInTheDocument();
      expect(screen.getByText("Payment Method")).toBeInTheDocument();
      expect(screen.getByText("Payment Status")).toBeInTheDocument();
      expect(screen.getByText("Total")).toBeInTheDocument();
      expect(screen.getByText("Created At")).toBeInTheDocument();
      expect(screen.getByText("Actions")).toBeInTheDocument();
    });

    it("renders order rows with customer and pricing details", () => {
      render(<AdminOrdersTable orders={mockOrders} />);

      expect(screen.getByText("Aarav Sharma")).toBeInTheDocument();
      expect(screen.getByText("aarav@campus.edu")).toBeInTheDocument();
      expect(screen.getByText("North Canteen")).toBeInTheDocument();
      expect(screen.getByText("₹240.00")).toBeInTheDocument();

      expect(screen.getByText("Priya Patel")).toBeInTheDocument();
      expect(screen.getByText("South Mess")).toBeInTheDocument();
      expect(screen.getByText("₹150.00")).toBeInTheDocument();
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
