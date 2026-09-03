import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import { StudentSpecials } from "@/components/home/StudentSpecials";

describe("StudentSpecials component", () => {
  it("renders section heading, dishes, and high-res Unsplash images", () => {
    render(<StudentSpecials />);

    expect(screen.getByRole("heading", { name: "Student Specials", level: 2 })).toBeInTheDocument();
    expect(screen.getByText("Affordable meals specially for students.")).toBeInTheDocument();

    const dishes = ["Veg Burger", "Veg Pizza", "Chicken Biryani"];
    for (const dish of dishes) {
      expect(screen.getByText(dish)).toBeInTheDocument();
      const image = screen.getByAltText(dish);
      expect(image).toBeInTheDocument();
      expect(image.getAttribute("src")).toContain("images.unsplash.com");
    }
  });

  it("renders prices, ratings, and order links with categories", () => {
    render(<StudentSpecials />);

    expect(screen.getByText("₹99")).toBeInTheDocument();
    expect(screen.getByText("₹149")).toBeInTheDocument();
    expect(screen.getByText("₹179")).toBeInTheDocument();

    expect(screen.getByText("4.7")).toBeInTheDocument();
    expect(screen.getByText("4.8")).toBeInTheDocument();
    expect(screen.getByText("4.9")).toBeInTheDocument();

    const orderButtons = screen.getAllByRole("link", { name: /order now/i });
    expect(orderButtons).toHaveLength(3);
    expect(orderButtons[0]).toHaveAttribute("href", expect.stringContaining("category=Burger"));
    expect(orderButtons[1]).toHaveAttribute("href", expect.stringContaining("category=Pizza"));
    expect(orderButtons[2]).toHaveAttribute("href", expect.stringContaining("category=Biryani"));
  });
});
