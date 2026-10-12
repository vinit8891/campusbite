import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AdminPayoutsPage from "@/app/admin/payouts/page";
import * as adminService from "@/services/adminService";

vi.mock("next/navigation", () => ({
  usePathname: () => "/admin/payouts",
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

const mockCanteenResponse: adminService.SettlementsCanteensResponse = {
  canteens: [
    {
      id: "rest-1",
      restaurant_id: "rest-1",
      restaurant_name: "Zeal Central Canteen",
      restaurant_email: "zeal@campusbite.in",
      phone: "9876543210",
      upi_id: "zeal@okaxis",
      orders_count: 5,
      gross_food_sales: 1000.0,
      platform_commission: 180.0,
      gst_collected: 50.0,
      net_payout: 870.0,
      status: "Pending",
      settlement_date: "2026-10-12",
    },
  ],
  summary: {
    total_food_sales: 1000.0,
    total_commission: 180.0,
    total_gst: 50.0,
    total_net_payout: 870.0,
    pending_payout: 870.0,
    paid_payout: 0.0,
  },
  date: "2026-10-12",
};

const mockCourierResponse: adminService.SettlementsCouriersResponse = {
  couriers: [
    {
      id: "rider-1",
      name: "Siddharth Patil",
      phone: "9876500001",
      vehicle: "Bike",
      orders_completed: 3,
      cod_collected: 450.0,
      wages_earned: 60.0,
      net_cash_due_to_admin: 390.0,
      is_locked: false,
      status: "ACTIVE",
      remittance_status: "DUES_PENDING",
      settlement_date: "2026-10-12",
    },
  ],
  summary: {
    total_cod_collected: 450.0,
    total_wages_earned: 60.0,
    net_cash_due_to_admin: 390.0,
    locked_couriers_count: 0,
  },
  date: "2026-10-12",
};

describe("AdminPayoutsPage Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(adminService, "fetchCanteenSettlements").mockResolvedValue(mockCanteenResponse);
    vi.spyOn(adminService, "fetchCourierSettlements").mockResolvedValue(mockCourierResponse);
  });

  it("renders 4 KPI metric cards with correct values", async () => {
    render(<AdminPayoutsPage />);

    await waitFor(() => {
      expect(screen.getByText("Zeal Central Canteen")).toBeInTheDocument();
    });

    // Check KPI cards
    expect(screen.getByText(/Total Daily Sales/i)).toBeInTheDocument();
    expect(screen.getAllByText("₹1,000.00").length).toBeGreaterThanOrEqual(1);

    expect(screen.getByText(/CampusBite 18% Cut/i)).toBeInTheDocument();
    expect(screen.getByText("₹180.00")).toBeInTheDocument();

    expect(screen.getByText(/Pending Canteen Payouts/i)).toBeInTheDocument();
    expect(screen.getAllByText("₹870.00").length).toBeGreaterThanOrEqual(1);

    expect(screen.getByText(/Courier Cash in Transit/i)).toBeInTheDocument();
    expect(screen.getAllByText("₹390.00").length).toBeGreaterThanOrEqual(1);
  });

  it("renders canteen settlements table and Mark Paid action button", async () => {
    render(<AdminPayoutsPage />);

    await waitFor(() => {
      expect(screen.getByText("Zeal Central Canteen")).toBeInTheDocument();
    });

    expect(screen.getByText("zeal@okaxis")).toBeInTheDocument();
    expect(screen.getAllByText("₹1,000.00").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("-₹180.00")).toBeInTheDocument();
    expect(screen.getAllByText("₹870.00").length).toBeGreaterThanOrEqual(2);
    expect(screen.getByRole("button", { name: /mark paid/i })).toBeInTheDocument();
  });

  it("switches to Tab 2 and renders courier cash-in-hand table", async () => {
    const user = userEvent.setup();
    render(<AdminPayoutsPage />);

    await waitFor(() => {
      expect(screen.getByText("Zeal Central Canteen")).toBeInTheDocument();
    });

    const courierTabBtn = screen.getByRole("button", { name: /tab 2: courier cash-in-hand/i });
    await user.click(courierTabBtn);

    expect(screen.getByText("Siddharth Patil")).toBeInTheDocument();
    expect(screen.getByText("₹450.00")).toBeInTheDocument();
    expect(screen.getByText("₹60.00")).toBeInTheDocument();
    expect(screen.getAllByText("₹390.00").length).toBeGreaterThanOrEqual(2);
    expect(screen.getByRole("button", { name: /acknowledge remittance/i })).toBeInTheDocument();
  });
});
