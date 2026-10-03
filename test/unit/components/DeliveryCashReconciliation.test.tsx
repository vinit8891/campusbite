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

    expect(screen.getByText(/Flat ₹20\/run model/i)).toBeInTheDocument();
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
    expect(screen.getByText("campusbite.ops@upi")).toBeInTheDocument();

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
});
