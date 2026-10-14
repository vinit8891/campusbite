import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import AdminOrdersPage from "@/app/admin/orders/page";

describe("AdminOrdersPage filter tabs", () => {
  it("renders audit and support filter tabs including All Orders, Pending, Processing, Cancelled, and Delivered", async () => {
    render(<AdminOrdersPage />);

    await waitFor(() => {
      expect(screen.queryByTestId("admin-table-skeleton")).not.toBeInTheDocument();
    });

    const allTab = screen.getByRole("tab", { name: /all orders/i });
    const pendingTab = screen.getByRole("tab", { name: /pending/i });
    const processingTab = screen.getByRole("tab", { name: /processing/i });
    const cancelledTab = screen.getByRole("tab", { name: /cancelled/i });
    const deliveredTab = screen.getByRole("tab", { name: /delivered/i });

    expect(allTab).toBeInTheDocument();
    expect(pendingTab).toBeInTheDocument();
    expect(processingTab).toBeInTheDocument();
    expect(cancelledTab).toBeInTheDocument();
    expect(deliveredTab).toBeInTheDocument();

    // Default tab is All Orders
    expect(allTab).toHaveAttribute("aria-selected", "true");
    expect(cancelledTab).toHaveAttribute("aria-selected", "false");

    // Switching to Cancelled tab selects it
    fireEvent.click(cancelledTab);
    expect(cancelledTab).toHaveAttribute("aria-selected", "true");
    expect(allTab).toHaveAttribute("aria-selected", "false");

    // Switching to Processing tab selects it
    fireEvent.click(processingTab);
    expect(processingTab).toHaveAttribute("aria-selected", "true");
    expect(cancelledTab).toHaveAttribute("aria-selected", "false");

    // Switching back to All Orders displays all
    fireEvent.click(allTab);
    expect(allTab).toHaveAttribute("aria-selected", "true");
  });
});
