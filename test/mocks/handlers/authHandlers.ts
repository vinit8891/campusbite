import { http, HttpResponse } from "msw";
import { API_URL } from "@/services/apiConfig";

const url = (path: string) => `${API_URL}${path.startsWith("/") ? path : `/${path}`}`;

export const authHandlers = [
  http.post(url("/auth/login"), () => {
    return HttpResponse.json({
      access_token: "mock-customer-token",
      token_type: "bearer",
    });
  }),

  http.post(url("/auth/register"), () => {
    return HttpResponse.json({
      message: "Customer registered successfully",
    });
  }),
];
