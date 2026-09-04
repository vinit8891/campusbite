import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import Footer from "@/components/layout/Footer";
import { ROUTES } from "@/lib/routes";

describe("Footer Component", () => {
  it("renders 4-column rich commercial delivery layout", () => {
    render(<Footer />);

    // Brand & Mission
    expect(screen.getByText(/hyperlocal, student-first food delivery network/i)).toBeInTheDocument();
    expect(screen.getByText(/closed campus direct delivery/i)).toBeInTheDocument();

    // Student Corner Links
    expect(screen.getByRole("link", { name: /browse restaurants/i })).toHaveAttribute(
      "href",
      ROUTES.RESTAURANTS
    );
    expect(screen.getByRole("link", { name: /hostel mess plans/i })).toHaveAttribute(
      "href",
      ROUTES.SUBSCRIPTIONS
    );
    expect(screen.getByRole("link", { name: /track live order/i })).toHaveAttribute(
      "href",
      ROUTES.MY_ORDERS
    );

    // Partner With Us
    expect(screen.getByRole("link", { name: /restaurant partner portal/i })).toHaveAttribute(
      "href",
      ROUTES.RESTAURANT_LOGIN
    );
    expect(screen.getByRole("link", { name: /courier onboarding/i })).toHaveAttribute(
      "href",
      ROUTES.DELIVERY_LOGIN
    );
    expect(screen.getByRole("link", { name: /campus admin portal/i })).toHaveAttribute(
      "href",
      ROUTES.ADMIN_LOGIN
    );

    // Campus Help & Hours
    expect(screen.getByText(/daily: 8:00 am – 2:00 am/i)).toBeInTheDocument();
    expect(screen.getByText(/every 20 mins to main lobby/i)).toBeInTheDocument();
    expect(screen.getByText("support@campusbite.in")).toBeInTheDocument();

    // Trust & Security Bar
    expect(
      screen.getByText(/256-bit encrypted campus checkout • razorpay verified/i)
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /privacy policy/i })).toHaveAttribute(
      "href",
      ROUTES.PRIVACY_POLICY
    );
    expect(screen.getByRole("link", { name: /terms of service/i })).toHaveAttribute(
      "href",
      ROUTES.TERMS
    );
  });
});
