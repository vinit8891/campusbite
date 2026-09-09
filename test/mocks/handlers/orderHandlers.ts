import { http, HttpResponse } from "msw";
import { API_URL } from "@/services/apiConfig";
import {
  calculateCheckoutPricing,
  calculateCodRounding,
  type CartItemInput,
  type DeliveryMode,
} from "@/lib/pricingEngine";
import { isCodPayment } from "@/lib/paymentLabels";

const url = (path: string) => `${API_URL}${path.startsWith("/") ? path : `/${path}`}`;

export const orderHandlers = [

  http.get(url("/orders/my"), () => {
    return HttpResponse.json([
      {
        _id: "order-1",
        customer_name: "John Doe",
        phone: "9876543210",
        address: "Hostel 4, Room 201",
        status: "Accepted",
        payment_method: "cod",
        total: 250,
        items: [{ id: "1", name: "Paneer Masala", price: 250, quantity: 1 }],
      },
    ]);
  }),

  http.get(url("/orders/customer/:phone"), () => {
    return HttpResponse.json([
      {
        _id: "order-1",
        customer_name: "John Doe",
        phone: "9876543210",
        address: "Hostel 4, Room 201",
        status: "Accepted",
        payment_method: "cod",
        total: 250,
        items: [{ id: "1", name: "Paneer Masala", price: 250, quantity: 1 }],
      },
    ]);
  }),

  http.get(url("/orders/restaurant/:email"), () => {
    return HttpResponse.json([
      {
        _id: "order-1",
        customer_name: "John Doe",
        phone: "9876543210",
        address: "Hostel 4, Room 201",
        status: "Accepted",
        payment_method: "cod",
        total: 250,
        items: [{ id: "1", name: "Paneer Masala", price: 250, quantity: 1 }],
      },
    ]);
  }),

  http.get(url("/orders/"), () => {
    return HttpResponse.json({
      items: [
        {
          _id: "admin-ord-1",
          customer_name: "John Doe",
          total: 500,
          status: "Pending",
        },
      ],
      total: 1,
      page: 1,
      pages: 1,
    });
  }),

  http.get(url("/orders/:id"), () => {
    return HttpResponse.json({
      _id: "order-1",
      customer_name: "John Doe",
      phone: "9876543210",
      address: "Hostel 4, Room 201",
      status: "Accepted",
      payment_method: "cod",
      total: 250,
      items: [{ id: "1", name: "Paneer Masala", price: 250, quantity: 1 }],
    });
  }),

  http.post(url("/orders/"), async ({ request }) => {
    try {
      const body = (await request.json().catch(() => ({}))) as any;
      const items = Array.isArray(body?.items) ? body.items : [];
      let total = body?.total ?? 250;
      let pricing = body?.pricing_breakdown;

      if (items.length > 0) {
        const cartItems: CartItemInput[] = items.map((i: any) => ({
          id: String(i.id),
          name: i.name,
          counterPrice: Number(i.price),
          quantity: Number(i.quantity || 1),
        }));
        const mode: DeliveryMode =
          body.delivery_type === "EXPRESS_DOOR" ||
          body.delivery_type === "STANDARD" ||
          body.delivery_type === "COUNTER_TAKEAWAY"
            ? body.delivery_type === "STANDARD"
              ? "EXPRESS_DOOR"
              : body.delivery_type
            : "HOSTEL_BATCH";
        const calcPricing = calculateCheckoutPricing(cartItems, mode);
        const isCod = isCodPayment(body.payment_method);
        const tip = Number(body.tip_amount || 0);
        const unrounded = Number(
          (calcPricing.totalStudentPayable + tip).toFixed(2)
        );
        const expectedTotal = isCod
          ? calculateCodRounding(unrounded).roundedTotal
          : unrounded;
        total = expectedTotal;
        pricing = calcPricing;
      }

      return HttpResponse.json({
        _id: "order-1",
        id: "order-1",
        status: "Pending",
        total,
        pricing_breakdown: pricing,
      });
    } catch {
      return HttpResponse.json({
        _id: "order-1",
        status: "Pending",
        total: 250,
      });
    }
  }),

  http.get(url("/orders/delivery/location/:id"), () => {
    return HttpResponse.json({
      status: "Out for Delivery",
      customer_latitude: 18.5204,
      customer_longitude: 73.8567,
      restaurant_latitude: 18.5205,
      restaurant_longitude: 73.8568,
      partner_latitude: 18.52045,
      partner_longitude: 73.85675,
      restaurant_name: "Campus Diner",
      delivery_partner_name: "Ramesh Partner",
      delivery_partner_phone: "9988776655",
    });
  }),

  http.get(url("/orders/otp/:id"), () => {
    return HttpResponse.json({
      otp: 4567,
      verified: false,
      status: "Out for Delivery",
    });
  }),
];
