import { http, HttpResponse } from "msw";
import { API_URL } from "@/services/apiConfig";
import { authHandlers } from "./handlers/authHandlers";
import { restaurantHandlers } from "./handlers/restaurantHandlers";
import { orderHandlers } from "./handlers/orderHandlers";
import { subscriptionHandlers } from "./handlers/subscriptionHandlers";
import { paymentHandlers } from "./handlers/paymentHandlers";
import { deliveryHandlers } from "./handlers/deliveryHandlers";
import { adminHandlers } from "./handlers/adminHandlers";

const url = (path: string) => `${API_URL}${path.startsWith("/") ? path : `/${path}`}`;

export const handlers = [
  http.get(url("/health"), () => {
    return HttpResponse.json({
      status: "ok",
      app_name: "CampusBite",
      version: "1.0.0",
      uptime: 12345,
    });
  }),
  ...authHandlers,
  ...restaurantHandlers,
  ...orderHandlers,
  ...subscriptionHandlers,
  ...paymentHandlers,
  ...deliveryHandlers,
  ...adminHandlers,
];
