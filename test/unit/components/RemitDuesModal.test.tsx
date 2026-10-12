import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { RemitDuesModal } from "@/components/delivery/RemitDuesModal";

describe("RemitDuesModal Component", () => {
  it("autofills amount with net dues and displays preset pills", () => {
    render(
      <RemitDuesModal
        isOpen={true}
        onClose={vi.fn()}
        netCashDue={350.0}
      />
    );

    const input = screen.getByLabelText(/Amount to Remit/i) as HTMLInputElement;
    expect(input.value).toBe("350.00");

    expect(screen.getByText(/Full Due \(₹350.00\)/i)).toBeInTheDocument();
    expect(screen.getByText("₹200")).toBeInTheDocument();

    expect(screen.getByRole("button", { name: /Confirm Remitted ₹350.00/i })).toBeInTheDocument();
  });

  it("updates amount and submit button when clicking preset pill", () => {
    render(
      <RemitDuesModal
        isOpen={true}
        onClose={vi.fn()}
        netCashDue={350.0}
      />
    );

    const pill200 = screen.getByText("₹200");
    fireEvent.click(pill200);

    const input = screen.getByLabelText(/Amount to Remit/i) as HTMLInputElement;
    expect(input.value).toBe("200.00");

    expect(screen.getByRole("button", { name: /Confirm Remitted ₹200.00/i })).toBeInTheDocument();
  });

  it("calculates net dues from courier object props", () => {
    render(
      <RemitDuesModal
        isOpen={true}
        onClose={vi.fn()}
        courier={{
          collected_cod: 500.0,
          wages_earned: 100.0,
        }}
      />
    );

    const input = screen.getByLabelText(/Amount to Remit/i) as HTMLInputElement;
    expect(input.value).toBe("400.00");
    expect(screen.getByText(/Full Due \(₹400.00\)/i)).toBeInTheDocument();
  });

  it("handles duesAmount override with ₹699.25 and updates all modal elements", () => {
    render(
      <RemitDuesModal
        isOpen={true}
        onClose={vi.fn()}
        duesAmount={699.25}
      />
    );

    const input = screen.getByLabelText(/Amount to Remit/i) as HTMLInputElement;
    expect(input.value).toBe("699.25");
    expect(input.placeholder).toBe("e.g. 699.25");

    expect(screen.getByText("Pending: ₹699.25")).toBeInTheDocument();
    expect(screen.getByText("Full Due (₹699.25)")).toBeInTheDocument();
    expect(screen.getByText("Current Net Dues: ₹699.25")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Confirm Remitted ₹699.25/i })
    ).toBeInTheDocument();
  });

  it("resolves dues from courier.cash_in_hand or cih_balance", () => {
    render(
      <RemitDuesModal
        isOpen={true}
        onClose={vi.fn()}
        courier={{
          cash_in_hand: 550.5,
        }}
      />
    );

    const input = screen.getByLabelText(/Amount to Remit/i) as HTMLInputElement;
    expect(input.value).toBe("550.50");
    expect(screen.getByText("Pending: ₹550.50")).toBeInTheDocument();
  });

  it("renders daily remittance cutoff reminder and financial breakdown with milestone bonus", () => {
    render(
      <RemitDuesModal
        isOpen={true}
        onClose={vi.fn()}
        courier={{
          cash_collected: 400.0,
          wages_earned: 60.0,
          bonus_earned: 20.0,
          unlocked_tier: "Tier 1",
          net_due_amount: 320.0,
        }}
        netCashDue={320.0}
      />
    );

    // Reminder card
    expect(
      screen.getByText(/Daily COD Cash Remittance Cutoff: 11:00 PM IST tonight/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/settle before cutoff to avoid account lock/i)
    ).toBeInTheDocument();

    // Financial breakdown box
    expect(screen.getByText(/Total Physical COD Collected:/i)).toBeInTheDocument();
    expect(screen.getByText("₹400.00")).toBeInTheDocument();
    expect(screen.getByText(/Base Delivery Wages Earned:/i)).toBeInTheDocument();
    expect(screen.getByText("-₹60.00")).toBeInTheDocument();
    expect(screen.getByText(/Daily Milestone Bonus \(Tier 1\):/i)).toBeInTheDocument();
    expect(screen.getByText("-₹20.00")).toBeInTheDocument();
    expect(screen.getByText(/Net Cash Due to Remit:/i)).toBeInTheDocument();
    expect(screen.getByText("₹320.00")).toBeInTheDocument();
  });
});

