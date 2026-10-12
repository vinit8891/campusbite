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

  it("renders locked and unlocked milestone bonus tiers accurately", () => {
    render(<CourierMilestones completedCount={3} />);

    // Tier 1 and Tier 2 rendered
    expect(screen.getByText(/Tier 1/i)).toBeInTheDocument();
    expect(screen.getByText(/Tier 2/i)).toBeInTheDocument();
    expect(screen.getByText(/Tier 3/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Unlocked/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/3\/6/i)).toBeInTheDocument();
  });
});

