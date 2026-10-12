import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { CourierMilestones } from "@/components/delivery/CourierMilestones";

describe("CourierMilestones Component", () => {
  it("renders countdown badge and reset subtitle banner", () => {
    render(<CourierMilestones completedCount={3} />);

    expect(screen.getByText(/DAILY MILESTONES/i)).toBeInTheDocument();
    expect(screen.getByText(/left|Resetting/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Resets daily at 11:59 PM • Completed runs count towards today's payout/i)
    ).toBeInTheDocument();
  });
});
