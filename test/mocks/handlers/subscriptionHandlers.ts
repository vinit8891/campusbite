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

  http.post(url("/subscriptions/:id/skip-date"), async ({ params, request }) => {
    const body = (await request.json()) as { skip_date: string };
    return HttpResponse.json({
      subscription_id: params.id,
      skip_date: body.skip_date,
      status: "active",
      message: `Date ${body.skip_date} added to skipped dates. Validity extended by +1 day.`,
    });
  }),

  http.post(url("/subscriptions/redeem-token"), async ({ request }) => {
    const body = (await request.json()) as {
      token: string;
      meal_type?: string;
      restaurant_email?: string;
    };
    if (body.token === "9999" || body.token === "EXPIRED") {
      return HttpResponse.json(
        { detail: "Invalid meal token or no active subscription found." },
        { status: 400 }
      );
    }
    if (body.token === "ALREADY") {
      return HttpResponse.json(
        {
          detail: "Meal token already redeemed today for Lunch at 12:45 PM.",
        },
        { status: 400 }
      );
    }

    return HttpResponse.json({
      success: true,
      message: "Meal successfully redeemed!",
      customer_name: "Rahul Sharma",
      customer_email: "rahul@campus.edu",
      plan_name: "North Mess • Veg Thali Plan",
      meal_type: body.meal_type || "Lunch",
      redeemed_at: "12:35 PM",
    });
  }),

  http.get(url("/subscriptions/counter/summary"), () => {
    return HttpResponse.json({
      date: "2026-09-05",
      meals_served: 142,
      total_subscribers: 210,
    });
  }),
];
