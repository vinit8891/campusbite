import { AuthHttpError, authFetch, authJson } from "@/services/authFetch";

export async function getAvailableOrders() {
  return authJson<any[]>("/orders/delivery/available", {
    role: "delivery_partner",
    cache: "no-store",
  });
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

export async function getMyDeliveries(phone: string) {
  return authJson<any[]>(
    `/orders/delivery/my/${encodeURIComponent(phone)}`,
    {
      role: "delivery_partner",
      cache: "no-store",
    }
  );
}

export async function getDeliveryHistory() {
  return authJson<any[]>("/orders/delivery/history", {
    role: "delivery_partner",
    cache: "no-store",
  });
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
