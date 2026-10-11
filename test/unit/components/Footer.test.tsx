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
  it("renders professional modern 4-column layout on normal routes", () => {
    mockPath = "/";
    const { container } = render(<Footer />);

    expect(container.firstChild).not.toBeNull();

    // Brand & Concise Tagline
    expect(
      screen.getByText(/hyperlocal closed-campus food delivery network connecting hostels with certified college canteens and messes/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/canteens live • 8:00 am – 2:00 am/i)).toBeInTheDocument();

    // Section Headings
    expect(screen.getByText("Explore")).toBeInTheDocument();
    expect(screen.getByText("Partner Portals")).toBeInTheDocument();
    expect(screen.getByText(/Help & Campus Safety/i)).toBeInTheDocument();

    // Explore / Order Links
    expect(screen.getByRole("link", { name: /campus canteens & stalls/i })).toHaveAttribute(
      "href",
      "/restaurants"
    );
    expect(screen.getByRole("link", { name: /hostel tiffin & mess plans/i })).toHaveAttribute(
      "href",
      "/subscriptions"
    );
    expect(screen.getByRole("link", { name: /live order tracking/i })).toHaveAttribute(
      "href",
      "/orders"
    );
    expect(screen.getByRole("link", { name: /student combo deals/i })).toHaveAttribute(
      "href",
      "/restaurants?filter=deals"
    );

    // Partner Portals Links
    expect(screen.getByRole("link", { name: /canteen partner portal/i })).toHaveAttribute(
      "href",
      "/restaurant/login"
    );
    expect(screen.getByRole("link", { name: /register new kitchen/i })).toHaveAttribute(
      "href",
      "/restaurant/register"
    );
    expect(screen.getByRole("link", { name: /student courier portal/i })).toHaveAttribute(
      "href",
      "/delivery/login"
    );
    expect(screen.getByRole("link", { name: /become a campus runner/i })).toHaveAttribute(
      "href",
      "/delivery/register"
    );
    expect(screen.getByRole("link", { name: /admin verification hub/i })).toHaveAttribute(
      "href",
      "/admin/verifications"
    );

    // Help & Campus Safety Links
    expect(screen.getByRole("link", { name: /zeal campus help desk/i })).toHaveAttribute(
      "href",
      "/help"
    );
    expect(screen.getByRole("link", { name: /support@campusbite\.in/i })).toHaveAttribute(
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
    expect(screen.getByRole("link", { name: /refunds & settlement policy/i })).toHaveAttribute(
      "href",
      "/terms#refunds"
    );

    // Bottom Bar
    expect(
      screen.getByText(/© 2026 CampusBite Technologies\. Built for Zeal College & Campus Communities\./i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/100% Encrypted UPI Payments • FSSAI Verified Partners/i)
    ).toBeInTheDocument();
  });

  it("unmounts/hides completely on /checkout route for a distraction-free funnel", () => {
    mockPath = "/checkout";
    const { container } = render(<Footer />);
    expect(container.firstChild).toBeNull();
  });
});
