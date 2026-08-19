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
    });
  }),
];
