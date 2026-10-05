import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { AdminRiderCihOversight } from "@/components/admin/AdminRiderCihOversight";
import * as adminService from "@/services/adminService";
import type { RiderReconciliationSummary } from "@/types";

const mockSummary: RiderReconciliationSummary = {
  total_cash_collected: 1270.0,
  total_campus_cih: 1270.0,
  total_wages_kept: 160.0,
  net_unremitted_dues: 1110.0,
  locked_riders_count: 1,
  approaching_limit_count: 1,
  active_riders_count: 1,
  riders: [
    {
      id: "courier-1",
      name: "Rahul Verma",
      phone: "9876543210",
      orders_delivered: 4,
      cash_collected: 620.0,
      wages_kept: 80.0,
      net_cash_due: 540.0,
      net_due: 540.0,
      max_limit: 500.0,
      is_locked: true,
      excess_amount: 40.0,
      status: "LOCKED",
      remittance_status: "DUES_PENDING",
      approved_remittances: 0.0,
    },
    {
      id: "courier-2",
      name: "Amit Sharma",
      phone: "9876501234",
      orders_delivered: 2,
      cash_collected: 460.0,
      wages_kept: 40.0,
      net_cash_due: 420.0,
      net_due: 420.0,
      max_limit: 500.0,
      is_locked: false,
      excess_amount: 0.0,
      status: "APPROACHING_LIMIT",
      remittance_status: "DUES_PENDING",
      approved_remittances: 0.0,
    },
    {
      id: "courier-3",
      name: "Vikas Patil",
      phone: "9876509999",
      orders_delivered: 2,
      cash_collected: 190.0,
      wages_kept: 40.0,
      net_cash_due: 150.0,
      net_due: 150.0,
      max_limit: 500.0,
      is_locked: false,
      excess_amount: 0.0,
      status: "ACTIVE",
      remittance_status: "DUES_PENDING",
      approved_remittances: 0.0,
    },
  ],
};

describe("AdminRiderCihOversight Component", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(adminService, "getRiderCihOversight").mockResolvedValue(mockSummary);
    vi.spyOn(adminService, "getAdminRiderReconciliations").mockResolvedValue(mockSummary);
  });

  it("renders the high-visibility CIH summary cards and table correctly", async () => {
    render(<AdminRiderCihOversight />);

    await waitFor(() => {
      expect(screen.getByText("Courier Cash-in-Hand (COD Dues) & Float Control")).toBeInTheDocument();
    });

    expect(screen.getByText("Total Cash on Campus")).toBeInTheDocument();
    expect(screen.getByText("1,270.00")).toBeInTheDocument();

    expect(screen.getByText("Courier Wages Kept")).toBeInTheDocument();
    expect(screen.getByText("160.00")).toBeInTheDocument();

    expect(screen.getByText("Net Unremitted Dues Owed")).toBeInTheDocument();
    expect(screen.getByText("1,110.00")).toBeInTheDocument();
  });

  it("renders locked banner when couriers exceed the ₹500 limit", async () => {
    render(<AdminRiderCihOversight />);

    await waitFor(() => {
      expect(screen.getByTestId("admin-locked-riders-banner")).toBeInTheDocument();
    });

    expect(
      screen.getByText(/⚠️ 1 Courier\(s\) Exceeded ₹500 Hard Lockout Limit/i)
    ).toBeInTheDocument();
  });

  it("renders crimson 🔒 Locked badge when rider net_cash_due >= ₹500.00", async () => {
    render(<AdminRiderCihOversight />);

    await waitFor(() => {
      expect(screen.getByText("Rahul Verma")).toBeInTheDocument();
    });

    const lockedBadge = screen.getByTestId("status-locked");
    expect(lockedBadge).toBeInTheDocument();
    expect(lockedBadge).toHaveTextContent("🔒 Locked (Over ₹500 Limit)");
    expect(lockedBadge).toHaveTextContent("+₹40.00");
    expect(screen.getByText("₹540.00 / ₹500.00")).toBeInTheDocument();
  });

  it("renders amber ⚠️ Warning badge when rider net_cash_due is ₹420.00", async () => {
    render(<AdminRiderCihOversight />);

    await waitFor(() => {
      expect(screen.getByText("Amit Sharma")).toBeInTheDocument();
    });

    const warningBadge = screen.getByTestId("status-warning");
    expect(warningBadge).toBeInTheDocument();
    expect(warningBadge).toHaveTextContent("⚠️ Warning (₹400–₹499)");
    expect(screen.getByText("₹420.00 / ₹500.00")).toBeInTheDocument();
  });

  it("renders emerald ✅ Clear / Active badge when rider net_cash_due is ₹150.00", async () => {
    render(<AdminRiderCihOversight />);

    await waitFor(() => {
      expect(screen.getByText("Vikas Patil")).toBeInTheDocument();
    });

    const activeBadge = screen.getByTestId("status-active");
    expect(activeBadge).toBeInTheDocument();
    expect(activeBadge).toHaveTextContent("✅ Clear / Active (< ₹400)");
    expect(screen.getByText("₹150.00 / ₹500.00")).toBeInTheDocument();
  });

  it("opens Acknowledge Remittance modal and approves remittance unlocking rider", async () => {
    const approveSpy = vi.spyOn(adminService, "approveRiderRemittance").mockResolvedValue({
      success: true,
      message: "Remittance of ₹540.00 approved (UTR: UPI/12345678). Rider unlocked.",
      net_cash_due: 0.0,
      is_locked: false,
      excess_amount: 0.0,
      status: "ACTIVE",
    });

    render(<AdminRiderCihOversight />);

    await waitFor(() => {
      expect(screen.getByText("Rahul Verma")).toBeInTheDocument();
    });

    // Click "Acknowledge UPI & Unlock" button on locked rider
    const acknowledgeBtn = screen.getByRole("button", { name: /Acknowledge UPI & Unlock/i });
    fireEvent.click(acknowledgeBtn);

    // Assert Modal opens with UTR and amount inputs
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Acknowledge UPI Remittance/i })).toBeInTheDocument();
    expect(screen.getByText(/Courier: Rahul Verma/i)).toBeInTheDocument();

    // Confirm & Unlock
    const confirmBtn = screen.getByRole("button", { name: /Confirm & Unlock/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(approveSpy).toHaveBeenCalledWith(
        "courier-1",
        540.0,
        expect.stringMatching(/^UPI\//)
      );
    });
  });

  it("sends remittance alert when Send Alert button is clicked", async () => {
    render(<AdminRiderCihOversight />);

    await waitFor(() => {
      expect(screen.getByText("Amit Sharma")).toBeInTheDocument();
    });

    const alertButtons = screen.getAllByRole("button", { name: /Send Alert/i });
    expect(alertButtons.length).toBeGreaterThan(0);

    fireEvent.click(alertButtons[0]);
    // Alert toast is triggered without errors
  });

  it("filters couriers by status tabs", async () => {
    render(<AdminRiderCihOversight />);

    await waitFor(() => {
      expect(screen.getByText("Rahul Verma")).toBeInTheDocument();
    });

    // Filter to Locked only
    const lockedFilter = screen.getByRole("button", { name: /🔒 Locked/i });
    fireEvent.click(lockedFilter);

    expect(screen.getByText("Rahul Verma")).toBeInTheDocument();
    expect(screen.queryByText("Vikas Patil")).not.toBeInTheDocument();

    // Filter to Active only
    const activeFilter = screen.getByRole("button", { name: /✅ Active/i });
    fireEvent.click(activeFilter);

    expect(screen.getByText("Vikas Patil")).toBeInTheDocument();
    expect(screen.queryByText("Rahul Verma")).not.toBeInTheDocument();
  });
});
