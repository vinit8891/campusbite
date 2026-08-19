import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

import { EmptyState } from "@/components/common/EmptyState";
import PaginationControls from "@/components/ui/PaginationControls";

describe("Admin Management Journey", () => {
  it("renders empty state placeholder when no restaurants or orders are found", () => {
    render(
      <EmptyState
        title="No Restaurants Found"
        description="No registered restaurants match your criteria."
        actionLabel="Add Restaurant"
        actionHref="/admin/add-restaurant"
      />
    );

    expect(screen.getByText("No Restaurants Found")).toBeInTheDocument();
    expect(screen.getByText("No registered restaurants match your criteria.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /add restaurant/i })).toBeInTheDocument();
  });

  it("renders accessible pagination controls for large admin datasets", () => {
    const handlePageChange = vi.fn();
    render(
      <PaginationControls
        page={2}
        pages={5}
        total={50}
        onPageChange={handlePageChange}
      />
    );

    expect(screen.getByRole("navigation", { name: /pagination/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/current page, page 2/i)).toHaveAttribute("aria-current", "page");
  });
});
