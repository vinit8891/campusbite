import { http, HttpResponse } from "msw";
import { API_URL } from "@/services/apiConfig";

const url = (path: string) => `${API_URL}${path.startsWith("/") ? path : `/${path}`}`;

export const adminHandlers = [
  http.get(url("/admin/stats"), () => {
    return HttpResponse.json({
      users: 120,
      restaurant_owners: 15,
      restaurants: 12,
      delivery_partners: 20,
      orders: 540,
      total_revenue: 65400.0,
      platform_earnings: 5800.0,
      total_orders: 540,
      restaurant_settlements: 48000.0,
      courier_payouts: 8100.0,
      gst_pool: 3500.0,
      average_order_value: 121.11,
      total_small_order_fees: 320.0,
      small_order_count: 64,
    });
  }),
  http.get(url("/admin/analytics"), () => {
    return HttpResponse.json({
      total_revenue: 65400.0,
      platform_earnings: 5800.0,
      total_orders: 540,
      restaurant_settlements: 48000.0,
      courier_payouts: 8100.0,
      gst_pool: 3500.0,
      average_order_value: 121.11,
      total_small_order_fees: 320.0,
      small_order_count: 64,
    });
  }),
  http.delete(url("/admin/users/:role/:user_id"), () => {
    return HttpResponse.json({
      success: true,
      message: "User deleted successfully",
    });
  }),
  http.delete(url("/admin/users/:user_id"), () => {
    return HttpResponse.json({
      success: true,
      message: "User deleted successfully",
    });
  }),
  http.delete(url("/admin/orders/:order_id"), () => {
    return HttpResponse.json({
      success: true,
      message: "Order deleted successfully",
    });
  }),
  http.delete(url("/admin/subscriptions/:subscription_id"), () => {
    return HttpResponse.json({
      success: true,
      message: "Subscription deleted successfully",
    });
  }),
  http.get(url("/admin/riders/cih-oversight"), () => {
    return HttpResponse.json({
      total_cash_collected: 1070.0,
      total_campus_cih: 1070.0,
      total_wages_kept: 160.0,
      net_unremitted_dues: 910.0,
      locked_riders_count: 1,
      approaching_limit_count: 1,
      active_riders_count: 1,
      riders: [
        {
          id: "courier-1",
          name: "Rahul Verma",
          phone: "9876543210",
          orders_delivered: 4,
          cash_collected: 620.0,
          wages_kept: 80.0,
          net_cash_due: 540.0,
          net_due: 540.0,
          max_limit: 500.0,
          is_locked: true,
          excess_amount: 40.0,
          status: "LOCKED",
          remittance_status: "DUES_PENDING",
          approved_remittances: 0.0,
        },
        {
          id: "courier-2",
          name: "Amit Sharma",
          phone: "9876501234",
          orders_delivered: 2,
          cash_collected: 460.0,
          wages_kept: 40.0,
          net_cash_due: 420.0,
          net_due: 420.0,
          max_limit: 500.0,
          is_locked: false,
          excess_amount: 0.0,
          status: "APPROACHING_LIMIT",
          remittance_status: "DUES_PENDING",
          approved_remittances: 0.0,
        },
        {
          id: "courier-3",
          name: "Vikas Patil",
          phone: "9876509999",
          orders_delivered: 2,
          cash_collected: 190.0,
          wages_kept: 40.0,
          net_cash_due: 150.0,
          net_due: 150.0,
          max_limit: 500.0,
          is_locked: false,
          excess_amount: 0.0,
          status: "ACTIVE",
          remittance_status: "DUES_PENDING",
          approved_remittances: 0.0,
        },
      ],
    });
  }),
  http.post(url("/admin/riders/:rider_id/remittance/approve"), async ({ params, request }) => {
    const body = (await request.json().catch(() => ({}))) as { amount?: number; utr?: string };
    const amount = body.amount ?? 540.0;
    const utr = body.utr ?? "UPI/TEST123456";
    return HttpResponse.json({
      success: true,
      message: `Remittance of ₹${amount.toFixed(2)} approved (UTR: ${utr}). Rider unlocked.`,
      net_cash_due: 0.0,
      is_locked: false,
      excess_amount: 0.0,
      status: "ACTIVE",
    });
  }),
];

