import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import CourierOrders from "@/components/delivery/CourierOrders";
import ActiveRuns from "@/components/delivery/ActiveRuns";
import type { DeliveryOrder } from "@/types";

describe("CourierOrders & ActiveRuns Components", () => {
  it("renders Active Runs 0 badge and empty state message when orders list is empty", () => {
    render(<CourierOrders orders={[]} />);

    expect(screen.getByText("Active Runs 0")).toBeInTheDocument();
    expect(
      screen.getByText(
        "No active runs assigned. Head to Available Orders to claim delivery batches."
      )
    ).toBeInTheDocument();
  });

  it("ActiveRuns renders Active Runs 0 badge and empty state message when orders list is empty", () => {
    render(<ActiveRuns orders={[]} />);

    expect(screen.getByText("Active Runs 0")).toBeInTheDocument();
    expect(
      screen.getByText(
        "No active runs assigned. Head to Available Orders to claim delivery batches."
      )
    ).toBeInTheDocument();
  });

  it("strictly filters orders to assigned and out_for_delivery statuses", () => {
    const mixedOrders: DeliveryOrder[] = [
      {
        _id: "order-1",
        customer_name: "Aman",
        status: "assigned",
        total: 100,
        address: "Hostel A",
      } as unknown as DeliveryOrder,
      {
        _id: "order-2",
        customer_name: "Priya",
        status: "delivered",
        total: 200,
        address: "Hostel B",
      } as unknown as DeliveryOrder,
      {
        _id: "order-3",
        customer_name: "Rohan",
        status: "out_for_delivery",
        total: 150,
        address: "Hostel C",
      } as unknown as DeliveryOrder,
      {
        _id: "order-4",
        customer_name: "Vikram",
        status: "cancelled",
        total: 80,
        address: "Hostel D",
      } as unknown as DeliveryOrder,
    ];

    render(<CourierOrders orders={mixedOrders} />);

    // Count badge is 2
    expect(screen.getByLabelText("Active Runs 2")).toBeInTheDocument();
    expect(screen.getAllByText("Aman").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Rohan").length).toBeGreaterThan(0);
    expect(screen.queryByText("Priya")).not.toBeInTheDocument();
    expect(screen.queryByText("Vikram")).not.toBeInTheDocument();
  });
});

