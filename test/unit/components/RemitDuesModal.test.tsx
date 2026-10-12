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
});
