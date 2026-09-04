import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import Footer from "@/components/layout/Footer";
import { ROUTES } from "@/lib/routes";

describe("Footer Component", () => {
  it("renders compact, sleek, mobile-friendly 2-to-4 column layout", () => {
    render(<Footer />);

    // Brand & Concise Tagline
    expect(
      screen.getByText(/closed-campus food delivery network connecting hostels with top campus eateries/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/daily 8 am – 2 am/i)).toBeInTheDocument();

    // Section Headings
    expect(screen.getByText("Explore")).toBeInTheDocument();
    expect(screen.getByText("Portals")).toBeInTheDocument();
    expect(screen.getByText("Help")).toBeInTheDocument();

    // Explore / Order Links
    expect(screen.getByRole("link", { name: /^restaurants$/i })).toHaveAttribute(
      "href",
      ROUTES.RESTAURANTS
    );
    expect(screen.getByRole("link", { name: /hostel mess plans/i })).toHaveAttribute(
      "href",
      ROUTES.SUBSCRIPTIONS
    );
    expect(screen.getByRole("link", { name: /student specials/i })).toHaveAttribute(
      "href",
      ROUTES.RESTAURANTS
    );
    expect(screen.getByRole("link", { name: /track order/i })).toHaveAttribute(
      "href",
      ROUTES.MY_ORDERS
    );

    // Partner Portals Links
    expect(screen.getByRole("link", { name: /restaurant portal/i })).toHaveAttribute(
      "href",
      ROUTES.RESTAURANT_LOGIN
    );
    expect(screen.getByRole("link", { name: /courier partner/i })).toHaveAttribute(
      "href",
      ROUTES.DELIVERY_LOGIN
    );
    expect(screen.getByRole("link", { name: /^admin$/i })).toHaveAttribute(
      "href",
      ROUTES.ADMIN_LOGIN
    );

    // Help & Support Links
    expect(screen.getByRole("link", { name: /campus help desk/i })).toHaveAttribute(
      "href",
      ROUTES.TERMS
    );
    expect(screen.getByRole("link", { name: "support@campusbite.in" })).toHaveAttribute(
      "href",
      "mailto:support@campusbite.in"
    );
    expect(screen.getByRole("link", { name: /^terms$/i })).toHaveAttribute(
      "href",
      ROUTES.TERMS
    );
    expect(screen.getByRole("link", { name: /^privacy$/i })).toHaveAttribute(
      "href",
      ROUTES.PRIVACY_POLICY
    );

    // Bottom Bar
    expect(
      screen.getByText(/© \d{4} CampusBite • Closed Campus Delivery/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/razorpay verified & encrypted/i)
    ).toBeInTheDocument();
  });
});
