import { http, HttpResponse } from "msw";
import { API_URL } from "@/services/apiConfig";

const url = (path: string) => `${API_URL}${path.startsWith("/") ? path : `/${path}`}`;

export const subscriptionHandlers = [
  http.get(url("/subscriptions/my"), () => {
    return HttpResponse.json({
      items: [
        {
          subscription_id: "sub-1",
          plan_id: "plan-1",
          restaurant_email: "diner@campus.edu",
          meal_type: "Lunch",
          subscription_type: "Monthly",
          status: "active",
          start_date: "2026-08-01",
          end_date: "2026-08-31",
          price: 2400,
        },
      ],
    });
  }),

  http.get(url("/subscriptions/summary"), () => {
    return HttpResponse.json({
      active_subscriptions: 1,
      today_meal: "Lunch",
      next_meal: "Dinner",
      upcoming_count: 0,
      total_spent: 2400,
    });
  }),

  http.get(url("/subscriptions/payments/my"), () => {
    return HttpResponse.json({
      items: [],
      total: 0,
      page: 1,
      pages: 1,
    });
  }),
];
