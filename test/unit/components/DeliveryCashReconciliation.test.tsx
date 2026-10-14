import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DeliveryCashReconciliation } from "@/components/delivery/DeliveryCashReconciliation";

describe("DeliveryCashReconciliation", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("mounts cleanly, avoids SSR hydration issues, and renders flat ₹20/run model", async () => {
    localStorage.setItem(
      "cb_cih_default",
      JSON.stringify({
        total_cod_collected: 400,
        total_payout_earned: 40,
        net_cash_due: 360,
        completed_deliveries: 2,
      })
    );

    render(<DeliveryCashReconciliation />);

    await waitFor(() => {
      expect(
        screen.getByText(/Cash-In-Hand \(CIH\) Reconciliation/i)
      ).toBeInTheDocument();
    });

    expect(
      screen.getByText(/₹20 base \+ ₹\d+ add-on model/i)
    ).toBeInTheDocument();
    expect(screen.getAllByText("₹360.00").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Net Cash Due to CampusBite/i).length).toBeGreaterThanOrEqual(1);
  });

  it("opens remittance modal and allows submitting remittance", async () => {
    const user = userEvent.setup();
    const onRemitSuccess = vi.fn();

    localStorage.setItem(
      "cb_cih_default",
      JSON.stringify({
        total_cod_collected: 500,
        total_payout_earned: 60,
        net_cash_due: 440,
        completed_deliveries: 3,
      })
    );

    render(<DeliveryCashReconciliation onRemitSuccess={onRemitSuccess} />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /remit dues via upi/i })).toBeInTheDocument();
    });

    const remitBtn = screen.getByRole("button", { name: /remit dues via upi/i });
    await user.click(remitBtn);

    expect(screen.getByText("Remit Dues to CampusBite")).toBeInTheDocument();
    expect(screen.getByText("9404125117-2@ybl")).toBeInTheDocument();

    const confirmBtn = screen.getByRole("button", { name: /confirm remitted ₹440\.00/i });
    await user.click(confirmBtn);

    await waitFor(() => {
      expect(onRemitSuccess).toHaveBeenCalled();
    });
  });

  it("syncs balances and recalculates when refresh button is clicked", async () => {
    const user = userEvent.setup();
    const dispatchSpy = vi.spyOn(window, "dispatchEvent");

    localStorage.setItem(
      "cb_my_deliveries_9998887770",
      JSON.stringify([
        { _id: "order-1", status: "Delivered", total: 200, payment_method: "COD" },
      ])
    );
    localStorage.setItem(
      "cb_delivery_partner",
      JSON.stringify({ phone: "9998887770", name: "Rider" })
    );

    render(<DeliveryCashReconciliation />);

    await waitFor(() => {
      expect(screen.getByTitle("Refresh live reconciliation balances")).toBeInTheDocument();
    });

    const syncBtn = screen.getByTitle("Refresh live reconciliation balances");
    await user.click(syncBtn);

    await waitFor(() => {
      expect(dispatchSpy).toHaveBeenCalledWith(expect.any(Event));
    });
  });

  it("when orders are Online Pre-paid (Cash = ₹0) and wages > 0, shows Payout Receivable, Pending Disbursement, and hides Remit Dues button", async () => {
    localStorage.setItem(
      "cb_cih_default",
      JSON.stringify({
        total_cod_collected: 0,
        total_payout_earned: 28,
        net_cash_due: 0,
        completed_deliveries: 2,
        net_balance: -28,
        platform_payout_to_courier: 28,
        courier_dues_to_platform: 0,
        payout_status: "Pending Disbursement",
      })
    );

    render(<DeliveryCashReconciliation />);

    await waitFor(() => {
      expect(
        screen.getByText(/Cash-In-Hand \(CIH\) Reconciliation/i)
      ).toBeInTheDocument();
    });

    // Card 2 must display TOTAL EARNED WAGES: +₹28.00
    expect(screen.getByLabelText("TOTAL EARNED WAGES: +₹28.00")).toBeInTheDocument();
    expect(screen.getByText("+₹28.00")).toBeInTheDocument();
    expect(screen.getByText(/Total Earned Wages/i)).toBeInTheDocument();

    // Must show Payout Receivable, ₹28.00, and Pending Disbursement
    expect(screen.getAllByText(/Payout Receivable/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("₹28.00").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Pending Disbursement/i).length).toBeGreaterThanOrEqual(1);

    // Must NOT show Remit Dues via UPI button
    expect(screen.queryByRole("button", { name: /remit dues via upi/i })).not.toBeInTheDocument();
  });

  it("when orders are COD and courier owes platform, shows Remit Dues via UPI button and Net Cash Due", async () => {
    localStorage.setItem(
      "cb_cih_default",
      JSON.stringify({
        total_cod_collected: 100,
        total_payout_earned: 28,
        net_cash_due: 72,
        completed_deliveries: 2,
        net_balance: 72,
        platform_payout_to_courier: 0,
        courier_dues_to_platform: 72,
        payout_status: "Dues Pending",
      })
    );

    render(<DeliveryCashReconciliation />);

    await waitFor(() => {
      expect(
        screen.getByText(/Cash-In-Hand \(CIH\) Reconciliation/i)
      ).toBeInTheDocument();
    });

    // Card 2 shows +₹28.00
    expect(screen.getByLabelText("TOTAL EARNED WAGES: +₹28.00")).toBeInTheDocument();
    expect(screen.getByText("+₹28.00")).toBeInTheDocument();

    // Must show Net Cash Due and ₹72.00
    expect(screen.getAllByText(/Net Cash Due to CampusBite/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("₹72.00").length).toBeGreaterThanOrEqual(1);

    // Must show Remit Dues via UPI button
    expect(screen.getByRole("button", { name: /remit dues via upi/i })).toBeInTheDocument();
  });
});

