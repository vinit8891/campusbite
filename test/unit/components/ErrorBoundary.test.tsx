import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";

function ProblematicComponent({ shouldThrow }: { shouldThrow?: boolean }) {
  if (shouldThrow) {
    throw new Error("Test explosion");
  }
  return <div>Safe Content</div>;
}

describe("ErrorBoundary component", () => {
  it("renders children when no error occurs", () => {
    render(
      <ErrorBoundary>
        <ProblematicComponent />
      </ErrorBoundary>
    );

    expect(screen.getByText("Safe Content")).toBeInTheDocument();
  });

  it("catches render errors and shows fallback UI", () => {
    // Suppress console.error in tests for expected thrown error
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    render(
      <ErrorBoundary sectionName="orders">
        <ProblematicComponent shouldThrow />
      </ErrorBoundary>
    );

    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument();

    spy.mockRestore();
  });

  it("resets state when retry button is clicked", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const user = userEvent.setup();

    const { rerender } = render(
      <ErrorBoundary>
        <ProblematicComponent shouldThrow />
      </ErrorBoundary>
    );

    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();

    // Re-render with fixed child and click retry
    rerender(
      <ErrorBoundary>
        <ProblematicComponent shouldThrow={false} />
      </ErrorBoundary>
    );

    const retryBtn = screen.getByRole("button", { name: /try again/i });
    await user.click(retryBtn);

    expect(screen.getByText("Safe Content")).toBeInTheDocument();
    spy.mockRestore();
  });
});
