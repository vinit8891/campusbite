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
    expect(screen.getByRole("link", { name: /email help desk/i })).toHaveAttribute(
      "href",
      "mailto:support@campusbite.in"
    );
    expect(screen.getByRole("link", { name: /terms of service/i })).toHaveAttribute(
      "href",
      "/terms"
    );
    expect(screen.getByRole("link", { name: /privacy policy/i })).toHaveAttribute(
      "href",
      "/privacy"
    );

    // Operations / Admin
    expect(screen.getByRole("link", { name: /admin verification hub/i })).toHaveAttribute(
      "href",
      "/admin/verifications"
    );
    expect(screen.getByText(/zeal college campus network/i)).toBeInTheDocument();

    // Bottom Bar
    expect(
      screen.getByText(/© 2026 CampusBite Technologies\. Built for campus communities\./i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/100% Encrypted UPI • FSSAI Verified/i)
    ).toBeInTheDocument();
  });

  it("unmounts/hides completely on /checkout route for a distraction-free funnel", () => {
    mockPath = "/checkout";
    const { container } = render(<Footer />);
    expect(container.firstChild).toBeNull();
  });
});
