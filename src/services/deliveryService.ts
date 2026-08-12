import { AuthHttpError, authFetch, authJson } from "@/services/authFetch";
import { asPaginated, type Paginated } from "@/lib/pagination";

export type AvailableOrdersQuery = {
  q?: string;
  restaurant?: string;
  payment_method?: string;
  page?: number;
  limit?: number;
};

export async function getAvailableOrders(
  filters: AvailableOrdersQuery = {}
): Promise<Paginated<any>> {
  const params = new URLSearchParams();
  if (filters.q?.trim()) params.set("q", filters.q.trim());
  if (filters.restaurant?.trim()) {
    params.set("restaurant", filters.restaurant.trim());
  }
  if (filters.payment_method) {
    params.set("payment_method", filters.payment_method);
  }
  params.set("page", String(filters.page ?? 1));
  params.set("limit", String(filters.limit ?? 20));

  const query = params.toString();
  const data = await authJson<unknown>(
    `/orders/delivery/available?${query}`,
    {
      role: "delivery_partner",
      cache: "no-store",
    }
  );
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
  const res = await authFetch(
    `/orders/delivery/accept/${orderId}`,
    {
      role: "delivery_partner",
      method: "PUT",
      body: JSON.stringify(partner || {}),
    }
  );

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    throw new AuthHttpError(
      res.status,
      data?.detail || "Failed to accept order"
    );
  }

  return data;
}

export type MyDeliveriesQuery = {
  status?: string;
  q?: string;
  limit?: number;
};

export async function getMyDeliveries(
  phone: string,
  filters: MyDeliveriesQuery = {}
) {
  const params = new URLSearchParams();
  if (filters.status) params.set("status", filters.status);
  if (filters.q?.trim()) params.set("q", filters.q.trim());
  params.set("limit", String(filters.limit ?? 50));

  const query = params.toString();
  return authJson<any[]>(
    `/orders/delivery/my/${encodeURIComponent(phone)}?${query}`,
    {
      role: "delivery_partner",
      cache: "no-store",
    }
  );
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
  const params = new URLSearchParams();
  if (filters.from_date) params.set("from_date", filters.from_date);
  if (filters.to_date) params.set("to_date", filters.to_date);
  if (filters.q?.trim()) params.set("q", filters.q.trim());
  params.set("page", String(filters.page ?? 1));
  params.set("limit", String(filters.limit ?? 20));

  const query = params.toString();
  const data = await authJson<unknown>(`/orders/delivery/history?${query}`, {
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
  return authJson(`/orders/delivery/location/${orderId}`, {
    role: "delivery_partner",
    method: "PUT",
    body: JSON.stringify({
      latitude,
      longitude,
    }),
  });
}

export async function getOrderOTP(orderId: string) {
  if (!orderId) {
    throw new Error("Invalid Order ID");
  }

  return authJson<{
    otp: number | null;
    verified: boolean;
    status: string;
  }>(`/orders/otp/${orderId}`, {
    role: "customer",
    cache: "no-store",
  });
}

export async function verifyDeliveryOTP(
  orderId: string,
  otp: string | number
) {
  const payload = {
    otp: String(otp).trim(),
  };

  return authJson(`/orders/verify-otp/${orderId}`, {
    role: "delivery_partner",
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function updateDeliveryOrderStatus(
  orderId: string,
  status: string
) {
  return authJson(
    `/orders/${orderId}/${encodeURIComponent(status)}`,
    {
      role: "delivery_partner",
      method: "PUT",
    }
  );
}
