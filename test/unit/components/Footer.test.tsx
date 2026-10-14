import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import Footer from "@/components/layout/Footer";

let mockPath = "/";

vi.mock("next/navigation", () => ({
  usePathname: () => mockPath,
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
  }),
}));

describe("Footer Component", () => {
  it("renders ultra-compact mobile-responsive layout on normal routes", () => {
    mockPath = "/";
    const { container } = render(<Footer />);

    expect(container.firstChild).not.toBeNull();

    // Brand & Live Status
    expect(screen.getByText("CampusBite")).toBeInTheDocument();
    expect(screen.getByText(/canteens live • 8 am – 2 am/i)).toBeInTheDocument();

    // Section Headings
    expect(screen.getByText("Explore")).toBeInTheDocument();
    expect(screen.getByText("For Partners")).toBeInTheDocument();
    expect(screen.getByText("Support")).toBeInTheDocument();
    expect(screen.getByText("Admin")).toBeInTheDocument();

    // Explore Links
    expect(screen.getByRole("link", { name: /campus canteens/i })).toHaveAttribute(
      "href",
      "/restaurants"
    );
    expect(screen.getByRole("link", { name: /mess & tiffin plans/i })).toHaveAttribute(
      "href",
      "/subscriptions"
    );
    expect(screen.getByRole("link", { name: /track order/i })).toHaveAttribute(
      "href",
      "/orders"
    );

    // Partners Links
    expect(screen.getByRole("link", { name: /canteen login/i })).toHaveAttribute(
      "href",
      "/restaurant/login"
    );
    expect(screen.getByRole("link", { name: /register eatery/i })).toHaveAttribute(
      "href",
      "/restaurant/register"
    );
    expect(screen.getByRole("link", { name: /rider login/i })).toHaveAttribute(
      "href",
      "/delivery/login"
    );
    expect(screen.getByRole("link", { name: /become a courier/i })).toHaveAttribute(
      "href",
      "/delivery/register"
    );

    // Support Links
    expect(screen.getByRole("link", { name: /contact us/i })).toHaveAttribute(
      "href",
      "/contact"
    );
    expect(screen.getByRole("link", { name: /email help desk/i })).toHaveAttribute(
      "href",
      "mailto:campusbites.co.in@gmail.com"
    );
    expect(screen.getByRole("link", { name: /terms of service/i })).toHaveAttribute(
      "href",
      "/terms"
    );
    expect(screen.getByRole("link", { name: /privacy policy/i })).toHaveAttribute(
      "href",
      "/privacy"
    );
    expect(screen.getByRole("link", { name: /refund policy/i })).toHaveAttribute(
      "href",
      "/refund-policy"
    );

    // Operations / Admin
    expect(screen.getByRole("link", { name: /admin verification hub/i })).toHaveAttribute(
      "href",
      "/admin/verifications"
    );
    expect(screen.getByText(/zeal college campus network/i)).toBeInTheDocument();

    // Founder & Leadership
    expect(screen.getByText(/Founder & CEO: Vinit Awathare/i)).toBeInTheDocument();

    // Bottom Bar
    expect(
      screen.getByText(/© 2026 CampusBite Technologies\. Built for campus communities\./i)
    ).toBeInTheDocument();
    expect(
      screen.getAllByText(/Verified Campus Food Aggregator \| Zeal Institutes Narhe Campus/i).length
    ).toBeGreaterThanOrEqual(1);
  });

  it("aligns Support and Admin side-by-side in responsive grid without col-span-2", () => {
    mockPath = "/";
    const { container } = render(<Footer />);

    // Verify 4-column responsive grid container exists
    const gridContainer = container.querySelector(".grid.grid-cols-2.md\\:grid-cols-4");
    expect(gridContainer).not.toBeNull();

    // Verify all 4 column headings exist as direct children/descendants in order
    const headings = gridContainer?.querySelectorAll("h4");
    expect(headings?.length).toBe(4);
    expect(headings?.[0].textContent).toBe("Explore");
    expect(headings?.[1].textContent).toBe("For Partners");
    expect(headings?.[2].textContent).toBe("Support");
    expect(headings?.[3].textContent).toBe("Admin");

    // Ensure Admin column does not have col-span-2 causing vertical stacking on mobile
    const adminHeading = screen.getByText("Admin");
    const adminCol = adminHeading.closest("div");
    expect(adminCol?.className).not.toContain("col-span-2");
  });

  it("unmounts/hides completely on /checkout route for a distraction-free funnel", () => {
    mockPath = "/checkout";
    const { container } = render(<Footer />);
    expect(container.firstChild).toBeNull();
  });
});
