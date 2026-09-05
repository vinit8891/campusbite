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
];

