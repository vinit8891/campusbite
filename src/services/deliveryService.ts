import { authJson } from "@/services/authFetch";
import { asPaginated, type Paginated } from "@/lib/pagination";
import { withQuery } from "@/lib/formatters";
import type { AvailableOrdersQuery, MyDeliveriesQuery } from "@/types";

export type { AvailableOrdersQuery, MyDeliveriesQuery };

export async function getAvailableOrders(
  filters: AvailableOrdersQuery = {}
): Promise<Paginated<any>> {
  const path = withQuery("/orders/delivery/available", {
    q: filters.q,
    restaurant: filters.restaurant,
    payment_method: filters.payment_method,
    page: filters.page ?? 1,
    limit: filters.limit ?? 20,
  });

  const data = await authJson<unknown>(path, {
    role: "delivery_partner",
    cache: "no-store",
  });
  return asPaginated(data);
}

export async function acceptDelivery(
  orderId: string,
  partner?: {
    name: string;
    phone: string;
    vehicle: string;
  }
) {
  return authJson(`/orders/delivery/accept/${encodeURIComponent(orderId)}`, {
    role: "delivery_partner",
    method: "PUT",
    body: JSON.stringify(partner || {}),
  });
}


export async function getMyDeliveries(
  phone: string,
  filters: MyDeliveriesQuery = {}
) {
  const path = withQuery(
    `/orders/delivery/my/${encodeURIComponent(phone)}`,
    {
      status: filters.status,
      q: filters.q,
      limit: filters.limit ?? 50,
    }
  );

  return authJson<any[]>(path, {
    role: "delivery_partner",
    cache: "no-store",
  });
}

export type DeliveryHistoryQuery = {
  from_date?: string;
  to_date?: string;
  q?: string;
  page?: number;
  limit?: number;
};

export async function getDeliveryHistory(
  filters: DeliveryHistoryQuery = {}
): Promise<Paginated<any>> {
  const path = withQuery("/orders/delivery/history", {
    from_date: filters.from_date,
    to_date: filters.to_date,
    q: filters.q,
    page: filters.page ?? 1,
    limit: filters.limit ?? 20,
  });

  const data = await authJson<unknown>(path, {
    role: "delivery_partner",
    cache: "no-store",
  });
  return asPaginated(data);
}

export async function updateLiveLocation(
  orderId: string,
  latitude: number,
  longitude: number
) {
  return authJson(
    `/orders/delivery/location/${encodeURIComponent(orderId)}`,
    {
      role: "delivery_partner",
      method: "PUT",
      body: JSON.stringify({
        latitude,
        longitude,
      }),
    }
  );
}

export async function getOrderOTP(orderId: string) {
  if (!orderId) {
    throw new Error("Invalid Order ID");
  }

  return authJson<{
    otp: number | null;
    verified: boolean;
    status: string;
  }>(`/orders/otp/${encodeURIComponent(orderId)}`, {
    role: "customer",
    cache: "no-store",
  });
}

export async function verifyDeliveryOTP(
  orderId: string,
  otp: string | number
) {
  return authJson(
    `/orders/verify-otp/${encodeURIComponent(orderId)}`,
    {
      role: "delivery_partner",
      method: "PUT",
      body: JSON.stringify({
        otp: String(otp).trim(),
      }),
    }
  );
}

export async function updateDeliveryOrderStatus(
  orderId: string,
  status: string
) {
  return authJson(
    `/orders/${encodeURIComponent(orderId)}/${encodeURIComponent(status)}`,
    {
      role: "delivery_partner",
      method: "PUT",
    }
  );
}
