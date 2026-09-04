import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { DeliveryBottomNav } from "@/components/delivery/DeliveryBottomNav";
import { DeliveryNavbar } from "@/components/delivery/DeliveryNavbar";
import { DeliverySidebar } from "@/components/delivery/DeliverySidebar";
import { DeliveryDashboardHeader } from "@/components/delivery/DeliveryDashboardHeader";
import { DeliveryDashboardStatCards } from "@/components/delivery/DeliveryDashboardStatCards";
import DeliveryDashboard from "@/app/delivery/dashboard/page";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  usePathname: () => "/delivery/dashboard",
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
  }),
}));

// Mock authTokens and delivery services
vi.mock("@/lib/authTokens", () => ({
  AUTH_STORAGE_KEYS: { deliveryToken: "deliveryToken" },
  getDeliveryPartnerSession: () => ({
    name: "Rajesh Kumar",
    phone: "9876543210",
    vehicle: "Bicycle",
    vehicle_number: "KA-01-1234",
  }),
  clearAuthForRole: vi.fn(),
}));

vi.mock("@/services/deliveryPartnerService", () => ({
  updateDeliveryStatus: vi.fn().mockResolvedValue({ success: true }),
  getDeliveryStats: vi.fn().mockResolvedValue({
    assigned_orders: 1,
    picked_up_orders: 1,
    delivered_today: 4,
    earnings_today: 160,
    total_deliveries: 42,
    rating: 4.9,
  }),
}));

describe("Delivery Partner / Courier Portal Visual & Layout Overhaul", () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem("deliveryToken", "valid-token");
    vi.clearAllMocks();
  });

  describe("DeliveryBottomNav Component", () => {
    it("renders mobile bottom navigation tabs with live badges", () => {
      render(
        <DeliveryBottomNav activeRunsCount={2} availablePoolCount={5} />
      );

      expect(screen.getByRole("navigation", { name: /mobile courier navigation/i })).toBeInTheDocument();
      expect(screen.getByText("My Runs")).toBeInTheDocument();
      expect(screen.getByText("Available")).toBeInTheDocument();
      expect(screen.getByText("Earnings")).toBeInTheDocument();
      expect(screen.getByText("Profile")).toBeInTheDocument();

      // Check badges
      expect(screen.getByText("2")).toBeInTheDocument();
      expect(screen.getByText("5")).toBeInTheDocument();
    });
  });

  describe("DeliveryNavbar Component", () => {
    it("renders brand logo pill and 1-tap duty toggle", async () => {
      render(<DeliveryNavbar activeRunsCount={1} />);

      expect(screen.getByText("CampusBite")).toBeInTheDocument();
      expect(screen.getByText("Courier Partner")).toBeInTheDocument();

      const dutyBtn = screen.getByRole("button", { name: /toggle courier duty status/i });
      expect(dutyBtn).toBeInTheDocument();
      expect(dutyBtn).toHaveTextContent(/On Duty/i);
    });

    it("toggles duty status and updates localStorage", async () => {
      vi.spyOn(window, "confirm").mockReturnValue(true);
      render(<DeliveryNavbar activeRunsCount={0} />);

      const dutyBtn = screen.getByRole("button", { name: /toggle courier duty status/i });
      fireEvent.click(dutyBtn);

      await waitFor(() => {
        expect(dutyBtn).toHaveTextContent(/Off Duty/i);
        expect(localStorage.getItem("cb_delivery_duty_status")).toBe("off");
      });

      // Toggle back on
      fireEvent.click(dutyBtn);
      await waitFor(() => {
        expect(dutyBtn).toHaveTextContent(/On Duty/i);
        expect(localStorage.getItem("cb_delivery_duty_status")).toBe("on");
      });
    });
  });

  describe("DeliverySidebar Component", () => {
    it("renders desktop sidebar navigation and partner info", () => {
      render(<DeliverySidebar activeRunsCount={1} availablePoolCount={3} />);

      expect(screen.getByText("Dashboard")).toBeInTheDocument();
      expect(screen.getByText("Available Orders")).toBeInTheDocument();
      expect(screen.getByText("My Deliveries")).toBeInTheDocument();
      expect(screen.getByText("History & Earnings")).toBeInTheDocument();
      expect(screen.getByText("Profile")).toBeInTheDocument();

      expect(screen.getByText("Rajesh Kumar")).toBeInTheDocument();
      expect(screen.getByText("Sign Out")).toBeInTheDocument();
    });
  });

  describe("DeliveryDashboardHeader Component", () => {
    it("renders warm 1-line greeting without redundant readonly table", () => {
      render(
        <DeliveryDashboardHeader
          partner={{
            id: "1",
            name: "Rajesh Kumar",
            phone: "9876543210",
            email: "rajesh@campus.edu",
            vehicle: "Bicycle",
            vehicle_number: "KA-01",
          }}
          error=""
        />
      );

      expect(screen.getByText(/Hey, Rajesh! 🛵 Ready for your next run\?/i)).toBeInTheDocument();
      expect(screen.getByText("✨ Courier Hub")).toBeInTheDocument();
      expect(screen.getByText("Live Dispatch")).toBeInTheDocument();

      // Ensure bulky static labels are not clogging the dashboard header
      expect(screen.queryByText("Partner Information")).not.toBeInTheDocument();
    });
  });

  describe("DeliveryDashboardStatCards Component", () => {
    it("renders glanceable 2-column mobile metrics with earnings, rating, and active runs", () => {
      render(
        <DeliveryDashboardStatCards
          assigned={1}
          pickedUp={1}
          deliveredToday={4}
          earningsToday={160}
          totalDeliveries={42}
          allTimeEarnings={3200}
          rating={4.9}
        />
      );

      expect(screen.getByText("Today's Earnings")).toBeInTheDocument();
      expect(screen.getByText("₹160")).toBeInTheDocument();

      expect(screen.getByText("Delivered Today")).toBeInTheDocument();
      expect(screen.getByText("4")).toBeInTheDocument();

      expect(screen.getByText("Active Runs")).toBeInTheDocument();
      expect(screen.getByText("2")).toBeInTheDocument();

      expect(screen.getByText("Runner Rating")).toBeInTheDocument();
      expect(screen.getByText("4.9 ★")).toBeInTheDocument();

      expect(screen.getByText("Total Deliveries")).toBeInTheDocument();
      expect(screen.getByText("42")).toBeInTheDocument();
    });
  });

  describe("DeliveryDashboard Page", () => {
    it("renders Active Delivery Alert Banner when active runs exist", async () => {
      render(<DeliveryDashboard />);

      await waitFor(() => {
        expect(screen.getByText(/ACTIVE DELIVERY IN PROGRESS/i)).toBeInTheDocument();
        expect(screen.getByText(/Continue Delivery & Verify OTP 🔐/i)).toBeInTheDocument();
      });
    });
  });
});
