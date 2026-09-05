import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminNavbar } from "@/components/admin/AdminNavbar";
import AdminLayout from "@/app/admin/layout";
import { getAdminHealth } from "@/services/adminService";
import { clearAuthForRole } from "@/lib/authTokens";

// Mock next/navigation
const mockPush = vi.fn();
const mockReplace = vi.fn();
let currentPathname = "/admin";

vi.mock("next/navigation", () => ({
  usePathname: () => currentPathname,
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
    refresh: vi.fn(),
  }),
}));

// Mock authTokens and adminService
vi.mock("@/lib/authTokens", () => ({
  AUTH_STORAGE_KEYS: { adminToken: "adminToken" },
  clearAuthForRole: vi.fn(),
}));

vi.mock("@/services/adminService", () => ({
  getAdminHealth: vi.fn().mockResolvedValue({ status: "ok" }),
}));

describe("Admin Layout & Responsive Navigation Overhaul", () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem("adminToken", "valid-admin-token");
    vi.clearAllMocks();
    currentPathname = "/admin";
  });

  describe("AdminSidebar Component", () => {
    it("renders brand header with admin console pill", () => {
      render(<AdminSidebar onLogout={vi.fn()} />);

      expect(screen.getByText("CampusBite")).toBeInTheDocument();
      expect(screen.getByText("🛡️ Admin Console")).toBeInTheDocument();
    });

    it("renders grouped navigation items for OPERATIONS and DIRECTORIES", () => {
      render(<AdminSidebar onLogout={vi.fn()} />);

      // Section labels
      expect(screen.getByText("OPERATIONS")).toBeInTheDocument();
      expect(screen.getByText("DIRECTORIES")).toBeInTheDocument();

      // Navigation links
      expect(screen.getByText("Mission Control")).toBeInTheDocument();
      expect(screen.getByText("Global Orders")).toBeInTheDocument();
      expect(screen.getByText("Mess Subscriptions")).toBeInTheDocument();
      expect(screen.getByText("Campus Eateries")).toBeInTheDocument();
      expect(screen.getByText("User & Courier Directory")).toBeInTheDocument();
    });

    it("highlights active route with amber accent styling", () => {
      currentPathname = "/admin/orders";
      render(<AdminSidebar onLogout={vi.fn()} />);

      const ordersLink = screen.getByText("Global Orders").closest("a");
      expect(ordersLink).toHaveClass("border-amber-500");
      expect(ordersLink).toHaveClass("text-amber-400");
    });

    it("renders Super Admin status and live API health badge in footer", () => {
      render(<AdminSidebar onLogout={vi.fn()} />);

      expect(screen.getByText("Super Admin")).toBeInTheDocument();
      expect(screen.getByText("campusbite@admin")).toBeInTheDocument();
      expect(screen.getByText("API Online")).toBeInTheDocument();
    });

    it("calls onLogout when Sign Out button is clicked", () => {
      const handleLogout = vi.fn();
      render(<AdminSidebar onLogout={handleLogout} />);

      const signOutBtn = screen.getByRole("button", { name: /sign out/i });
      fireEvent.click(signOutBtn);

      expect(handleLogout).toHaveBeenCalledTimes(1);
    });

    it("renders close button and triggers onClose in mobile drawer mode", () => {
      const handleClose = vi.fn();
      render(<AdminSidebar onLogout={vi.fn()} onClose={handleClose} isMobile />);

      const closeBtn = screen.getByRole("button", { name: /close navigation menu/i });
      expect(closeBtn).toBeInTheDocument();

      fireEvent.click(closeBtn);
      expect(handleClose).toHaveBeenCalledTimes(1);
    });
  });

  describe("AdminNavbar Component", () => {
    it("renders mobile navbar with hamburger menu trigger, logo, and health pill", () => {
      const handleOpen = vi.fn();
      render(<AdminNavbar onOpenDrawer={handleOpen} />);

      const menuBtn = screen.getByRole("button", { name: /open admin navigation menu/i });
      expect(menuBtn).toBeInTheDocument();

      expect(screen.getByText("CampusBite")).toBeInTheDocument();
      expect(screen.getByText("🛡️ Admin Console")).toBeInTheDocument();
      expect(screen.getByText("API Online")).toBeInTheDocument();

      fireEvent.click(menuBtn);
      expect(handleOpen).toHaveBeenCalledTimes(1);
    });
  });

  describe("AdminLayout Component", () => {
    it("renders loading state while verifying admin session and resolves to ready", async () => {
      render(
        <AdminLayout>
          <div>Admin Content</div>
        </AdminLayout>
      );

      expect(screen.getByText(/verifying admin session/i)).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.getByText("Admin Content")).toBeInTheDocument();
      });
    });

    it("redirects to admin login if no admin token exists", async () => {
      localStorage.removeItem("adminToken");

      render(
        <AdminLayout>
          <div>Admin Content</div>
        </AdminLayout>
      );

      await waitFor(() => {
        expect(mockReplace).toHaveBeenCalledWith("/admin/login");
      });
    });

    it("clears auth and redirects to admin login if health verification fails", async () => {
      vi.mocked(getAdminHealth).mockRejectedValueOnce(new Error("Unauthorized"));

      render(
        <AdminLayout>
          <div>Admin Content</div>
        </AdminLayout>
      );

      await waitFor(() => {
        expect(clearAuthForRole).toHaveBeenCalledWith("admin");
        expect(mockReplace).toHaveBeenCalledWith("/admin/login");
      });
    });

    it("renders desktop sidebar, mobile navbar, and content when verified", async () => {
      render(
        <AdminLayout>
          <div data-testid="test-content">Dashboard Content</div>
        </AdminLayout>
      );

      await waitFor(() => {
        expect(screen.getByTestId("test-content")).toBeInTheDocument();
      });

      // Check for navigation links
      expect(screen.getAllByText("Mission Control").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Global Orders").length).toBeGreaterThan(0);
    });

    it("opens and closes mobile slide-out drawer on toggle, backdrop, and close clicks", async () => {
      render(
        <AdminLayout>
          <div>Dashboard Content</div>
        </AdminLayout>
      );

      await waitFor(() => {
        expect(screen.getByText("Dashboard Content")).toBeInTheDocument();
      });

      const mobileDrawer = screen.getByRole("dialog", { name: /mobile navigation drawer/i });

      // Open drawer via navbar hamburger
      const hamburger = screen.getByRole("button", { name: /open admin navigation menu/i });
      act(() => {
        fireEvent.click(hamburger);
      });

      expect(mobileDrawer).toHaveClass("translate-x-0");

      // Close via close button in drawer
      const closeBtn = screen.getByRole("button", { name: /close navigation menu/i });
      act(() => {
        fireEvent.click(closeBtn);
      });

      expect(mobileDrawer).toHaveClass("-translate-x-full");

      // Open again and click backdrop
      act(() => {
        fireEvent.click(hamburger);
      });
      expect(mobileDrawer).toHaveClass("translate-x-0");

      const backdrop = document.querySelector(".bg-stone-950\\/50");
      expect(backdrop).toBeInTheDocument();
      if (backdrop) {
        act(() => {
          fireEvent.click(backdrop);
        });
      }
      expect(mobileDrawer).toHaveClass("-translate-x-full");
    });
  });
});
