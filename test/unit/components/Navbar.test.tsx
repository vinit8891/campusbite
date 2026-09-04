import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Navbar } from "@/components/layout/navbar";
import { ROUTES } from "@/lib/routes";

const mockLogout = vi.fn();
let mockIsLoggedIn = false;
let mockUser: { name: string; email: string } | null = null;
let mockCart = [{ id: "item-1", quantity: 2 }];

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

vi.mock("@/context/AuthContext", () => ({
  useAuth: () => ({
    user: mockUser,
    isLoggedIn: mockIsLoggedIn,
    logout: mockLogout,
  }),
}));

vi.mock("@/context/CartContext", () => ({
  useCart: () => ({
    cart: mockCart,
  }),
}));

describe("Navbar Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsLoggedIn = false;
    mockUser = null;
    mockCart = [{ id: "item-1", quantity: 2 }];
  });

  it("renders brand logo and desktop navigation links", () => {
    render(<Navbar />);

    const brandLinks = screen.getAllByRole("link", { name: /campusbite/i });
    expect(brandLinks.length).toBeGreaterThan(0);
    expect(brandLinks[0]).toHaveAttribute("href", ROUTES.HOME);

    const desktopNav = screen.getByRole("navigation", {
      name: /main desktop navigation/i,
    });
    expect(desktopNav).toBeInTheDocument();
  });

  it("opens mobile drawer when hamburger button is clicked", async () => {
    const user = userEvent.setup();
    render(<Navbar />);

    const hamburgerBtn = screen.getByRole("button", {
      name: /open navigation menu/i,
    });
    expect(hamburgerBtn).toHaveAttribute("aria-expanded", "false");

    await user.click(hamburgerBtn);

    expect(hamburgerBtn).toHaveAttribute("aria-expanded", "true");
    expect(
      screen.getByRole("dialog", { name: /campusbite navigation menu/i })
    ).toBeInTheDocument();
  });

  it("renders UserNavDropdown when customer is logged in and opens menu on click", async () => {
    const user = userEvent.setup();
    mockIsLoggedIn = true;
    mockUser = { name: "Om Roy", email: "om.roy@campus.edu" };

    render(<Navbar />);

    const userMenuBtn = screen.getByRole("button", { name: /user account menu/i });
    expect(userMenuBtn).toBeInTheDocument();

    await user.click(userMenuBtn);

    expect(screen.getByRole("menu", { name: /user profile options/i })).toBeInTheDocument();
    expect(screen.getByText("Student Account")).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: /my orders/i })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: /account & settings/i })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: /campus batch schedule/i })).toBeInTheDocument();

    const signOutBtn = screen.getByRole("menuitem", { name: /sign out/i });
    await user.click(signOutBtn);
    expect(mockLogout).toHaveBeenCalledTimes(1);
  });
});
