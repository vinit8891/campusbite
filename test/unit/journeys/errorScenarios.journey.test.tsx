import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ErrorBoundary } from "@/components/common/ErrorBoundary";
import { EmptyState } from "@/components/common/EmptyState";
import { CardSkeleton } from "@/components/common/CardSkeleton";

describe("Error Scenarios & Fallback Boundaries", () => {
  it("catches runtime errors in child components and provides retry action", async () => {
    let shouldThrow = true;
    const ProblematicComponent = () => {
      if (shouldThrow) {
        throw new Error("Simulated backend offline 500 error");
      }
      return <div>Recovered content</div>;
    };

    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const user = userEvent.setup();

    render(
      <ErrorBoundary>
        <ProblematicComponent />
      </ErrorBoundary>
    );

    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    const retryBtn = screen.getByRole("button", { name: /try again/i });
    expect(retryBtn).toBeInTheDocument();

    shouldThrow = false;
    await user.click(retryBtn);
    expect(screen.getByText("Recovered content")).toBeInTheDocument();

    spy.mockRestore();
  });

  it("renders loading skeletons gracefully during network delay", () => {
    render(<CardSkeleton count={3} />);
    const skeletons = document.querySelectorAll(".animate-pulse");
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it("renders EmptyState when datasets are empty", () => {
    render(
      <EmptyState
        title="No active deliveries"
        description="Check back when new orders are assigned."
      />
    );
    expect(screen.getByText("No active deliveries")).toBeInTheDocument();
  });
});
