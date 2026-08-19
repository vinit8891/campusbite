import { http, HttpResponse } from "msw";
import { API_URL } from "@/services/apiConfig";

const url = (path: string) => `${API_URL}${path.startsWith("/") ? path : `/${path}`}`;

export const paymentHandlers = [
  http.get(url("/payments/razorpay/config"), () => {
    return HttpResponse.json({
      key_id: "rzp_test_123",
      currency: "INR",
      enabled: true,
    });
  }),

  http.post(url("/payments/razorpay/create"), () => {
    return HttpResponse.json({
      razorpay_order_id: "order_rzp_123",
      amount: 25000,
      currency: "INR",
      key_id: "rzp_test_123",
    });
  }),

  http.post(url("/payments/razorpay/verify"), () => {
    return HttpResponse.json({
      success: true,
      order_id: "order-1",
      payment_status: "paid",
    });
  }),
];
