import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EmptyState } from "@/components/common/EmptyState";

describe("EmptyState component", () => {
  it("renders title, description and icon", () => {
    render(
      <EmptyState
        icon={<span data-testid="test-icon">🍽️</span>}
        title="No Orders Found"
        description="You have not placed any orders yet."
      />
    );

    expect(screen.getByRole("heading", { level: 2, name: /no orders found/i })).toBeInTheDocument();
    expect(screen.getByText(/you have not placed any orders yet/i)).toBeInTheDocument();
    expect(screen.getByTestId("test-icon")).toBeInTheDocument();
  });

  it("renders actionable button and handles click event", async () => {
    const handleAction = vi.fn();
    const user = userEvent.setup();

    render(
      <EmptyState
        title="Empty Cart"
        actionLabel="Explore Restaurants"
        onAction={handleAction}
      />
    );

    const button = screen.getByRole("button", { name: /explore restaurants/i });
    expect(button).toBeInTheDocument();

    await user.click(button);
    expect(handleAction).toHaveBeenCalledTimes(1);
  });

  it("renders link action when actionHref is supplied", () => {
    render(
      <EmptyState
        title="Empty Subscriptions"
        actionLabel="Browse Plans"
        actionHref="/restaurants"
      />
    );

    const link = screen.getByRole("link", { name: /browse plans/i });
    expect(link).toHaveAttribute("href", "/restaurants");
  });
});
