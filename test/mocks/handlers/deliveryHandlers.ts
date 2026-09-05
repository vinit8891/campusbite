import { http, HttpResponse } from "msw";
import { API_URL } from "@/services/apiConfig";

const url = (path: string) => `${API_URL}${path.startsWith("/") ? path : `/${path}`}`;

export const deliveryHandlers = [
  http.get(url("/orders/delivery/available"), () => {
    return HttpResponse.json({
      items: [
        {
          _id: "del-ord-1",
          customer_name: "Alice",
          status: "Ready for Pickup",
          total: 300,
        },
      ],
      total: 1,
      page: 1,
      pages: 1,
    });
  }),

  http.get(url("/orders/delivery/my/:phone"), () => {
    return HttpResponse.json([
      {
        _id: "del-ord-1",
        customer_name: "Alice",
        status: "Out for Delivery",
        total: 300,
      },
    ]);
  }),

  http.put(url("/orders/:id/:status"), ({ params }) => {
    return HttpResponse.json({
      message: "Order status updated",
      order: {
        _id: params.id as string,
        status: decodeURIComponent(params.status as string),
      },
    });
  }),
];
