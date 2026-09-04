import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MobileDrawer } from "@/components/layout/MobileDrawer";
import { ROUTES } from "@/lib/routes";

const mockLogout = vi.fn();
let mockIsLoggedIn = true;
let mockUser = {
  name: "Om Roy",
  email: "om.roy@campus.edu",
  phone: "+919876543210",
};

let mockCartItems = [
  { id: "1", name: "Thali", price: 100, quantity: 3 },
  { id: "2", name: "Chai", price: 20, quantity: 2 },
];

let mockCurrentPath = "/";

vi.mock("next/navigation", () => ({
  usePathname: () => mockCurrentPath,
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
  }),
}));

vi.mock("@/context/AuthContext", () => ({
  useAuth: () => ({
    user: mockIsLoggedIn ? mockUser : null,
    isLoggedIn: mockIsLoggedIn,
    logout: mockLogout,
  }),
}));

vi.mock("@/context/CartContext", () => ({
  useCart: () => ({
    cart: mockCartItems,
  }),
}));

describe("MobileDrawer Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsLoggedIn = true;
    mockUser = {
      name: "Om Roy",
      email: "om.roy@campus.edu",
      phone: "+919876543210",
    };
    mockCartItems = [
      { id: "1", name: "Thali", price: 100, quantity: 3 },
      { id: "2", name: "Chai", price: 20, quantity: 2 },
    ];
    mockCurrentPath = "/";
    document.body.style.overflow = "";
  });

  it("renders top bar with brand logo and accessible close button", async () => {
    const user = userEvent.setup();
    const handleClose = vi.fn();

    render(<MobileDrawer isOpen={true} onClose={handleClose} />);

    expect(screen.getByText("CampusBite")).toBeInTheDocument();
    const closeBtn = screen.getByRole("button", { name: /close navigation menu/i });
    expect(closeBtn).toBeInTheDocument();

    await user.click(closeBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it("locks body scroll when open and restores when closed", () => {
    const handleClose = vi.fn();
    const { rerender, unmount } = render(
      <MobileDrawer isOpen={true} onClose={handleClose} />
    );

    expect(document.body.style.overflow).toBe("hidden");

    rerender(<MobileDrawer isOpen={false} onClose={handleClose} />);
    unmount();
    expect(document.body.style.overflow).not.toBe("hidden");
  });

  it("closes on backdrop click and on Escape key press", async () => {
    const user = userEvent.setup();
    const handleClose = vi.fn();

    render(<MobileDrawer isOpen={true} onClose={handleClose} />);

    const backdrop = screen.getByTestId("drawer-backdrop");
    await user.click(backdrop);
    expect(handleClose).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(window, { key: "Escape" });
    expect(handleClose).toHaveBeenCalledTimes(2);
  });

  it("renders logged in user profile card with avatar, role badge, name, email and logout action", async () => {
    const user = userEvent.setup();
    const handleClose = vi.fn();

    render(<MobileDrawer isOpen={true} onClose={handleClose} />);

    expect(screen.getByText("Om Roy")).toBeInTheDocument();
    expect(screen.getByText("Student / Customer")).toBeInTheDocument();
    expect(screen.getByText("om.roy@campus.edu")).toBeInTheDocument();
    expect(screen.getByText("O")).toBeInTheDocument(); // Avatar initial

    const profileLink = screen.getByRole("link", { name: /view user profile/i });
    expect(profileLink).toHaveAttribute("href", ROUTES.PROFILE);

    const logoutButton = screen.getByRole("button", { name: /logout/i });
    expect(logoutButton).toBeInTheDocument();
    await user.click(logoutButton);
    expect(mockLogout).toHaveBeenCalledTimes(1);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it("renders guest welcoming state when user is not logged in", () => {
    mockIsLoggedIn = false;
    const handleClose = vi.fn();

    render(<MobileDrawer isOpen={true} onClose={handleClose} />);

    expect(screen.getByText(/welcome to campusbite!/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /sign in/i })).toHaveAttribute("href", ROUTES.LOGIN);
    expect(screen.getByRole("link", { name: /register/i })).toHaveAttribute("href", ROUTES.REGISTER);
    expect(screen.queryByRole("button", { name: /logout/i })).not.toBeInTheDocument();
  });

  it("renders all touch-friendly navigation list items with correct routes and badges", () => {
    const handleClose = vi.fn();

    render(<MobileDrawer isOpen={true} onClose={handleClose} />);

    const nav = screen.getByRole("navigation", { name: /mobile main navigation/i });

    const homeLink = within(nav).getByRole("link", { name: /^home$/i });
    expect(homeLink).toHaveAttribute("href", ROUTES.HOME);

    const restLink = within(nav).getByRole("link", { name: /restaurants/i });
    expect(restLink).toHaveAttribute("href", ROUTES.RESTAURANTS);

    const messLink = within(nav).getByRole("link", { name: /hostel mess plans/i });
    expect(messLink).toHaveAttribute("href", ROUTES.SUBSCRIPTIONS);

    const ordersLink = within(nav).getByRole("link", { name: /my orders/i });
    expect(ordersLink).toHaveAttribute("href", ROUTES.MY_ORDERS);
    expect(screen.getByTestId("active-order-pulse")).toBeInTheDocument();

    const cartLink = within(nav).getByRole("link", { name: /cart/i });
    expect(cartLink).toHaveAttribute("href", ROUTES.CART);
    const cartBadge = screen.getByTestId("cart-badge");
    expect(cartBadge).toHaveTextContent("5"); // 3 + 2

    const aboutLink = within(nav).getByRole("link", { name: /about & campus faq/i });
    expect(aboutLink).toHaveAttribute("href", ROUTES.ABOUT);

    const contactLink = within(nav).getByRole("link", { name: /contact support/i });
    expect(contactLink).toHaveAttribute("href", ROUTES.CONTACT);
  });

  it("displays campus version tag in footer", () => {
    render(<MobileDrawer isOpen={true} onClose={vi.fn()} />);

    expect(
      screen.getByText("CampusBite v1.0 • Closed Campus Delivery")
    ).toBeInTheDocument();
  });
});
