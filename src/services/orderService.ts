import { AuthHttpError, authFetch, authJson } from "@/services/authFetch";

export async function placeOrder(data: any) {
  const payload = {
    restaurant_email: data.restaurant_email,
    customer_name: data.customer_name,
    phone: data.phone,
    address: data.address,
    payment_method: data.payment_method,
    total: data.total,
    delivery_for: data.delivery_for || "self",
    restaurant_latitude: data.restaurant_latitude ?? 18.52043,
    restaurant_longitude: data.restaurant_longitude ?? 73.856743,
    latitude: data.latitude ?? null,
    longitude: data.longitude ?? null,
    items: (data.items || []).map((item: any) => ({
      id: String(item.id),
      name: item.name,
      price: Number(item.price),
      quantity: Number(item.quantity),
    })),
  };

  const res = await authFetch("/orders/", {
    role: "customer",
    method: "POST",
    body: JSON.stringify(payload),
  });

  const body = await res.json().catch(() => null);

  if (!res.ok) {
    throw new AuthHttpError(
      res.status,
      typeof body?.detail === "string"
        ? body.detail
        : "Failed to place order"
    );
  }

  return body;
}

/** Preferred: load orders for the authenticated customer from JWT. */
export async function getMyOrders() {
  return authJson<any[]>("/orders/my", {
    role: "customer",
    cache: "no-store",
  });
}

export async function getCustomerOrders(phone: string) {
  return authJson<any[]>(
    `/orders/customer/${encodeURIComponent(phone)}`,
    {
      role: "customer",
      cache: "no-store",
    }
  );
}

export async function getOrderById(orderId: string) {
  return authJson<any>(`/orders/${orderId}`, {
    role: "customer",
    cache: "no-store",
  });
}

export async function getDeliveryLocation(orderId: string) {
  return authJson<any>(`/orders/delivery/location/${orderId}`, {
    role: "customer",
    cache: "no-store",
  });
}
