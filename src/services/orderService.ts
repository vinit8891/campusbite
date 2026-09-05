import { authJson } from "@/services/authFetch";
import type {
  Order,
  OrderItemPayload,
  PlaceOrderPayload,
  TrackingLocation,
} from "@/types";

export type { OrderItemPayload, PlaceOrderPayload, TrackingLocation };

export async function placeOrder(data: PlaceOrderPayload): Promise<Order> {
  const payload = {
    restaurant_email: data.restaurant_email,
    customer_name: data.customer_name,
    phone: data.phone,
    address: data.address,
    payment_method: data.payment_method || "cod",
    payment_status: "pending",
    total: data.total,
    delivery_for: data.delivery_for || "self",
    delivery_type: data.delivery_type || "HOSTEL_BATCH",
    hostel_block: data.hostel_block || null,
    tip_amount: data.tip_amount ?? 0,
    restaurant_latitude: data.restaurant_latitude ?? 18.52043,
    restaurant_longitude: data.restaurant_longitude ?? 73.856743,
    latitude: data.latitude ?? null,
    longitude: data.longitude ?? null,
    items: (data.items || []).map((item) => ({
      id: String(item.id),
      name: item.name,
      price: Number(item.price),
      quantity: Number(item.quantity),
      is_budget_meal: Boolean(item.is_budget_meal),
    })),
  };

  return authJson<Order>("/orders/", {
    role: "customer",
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/** Preferred: load orders for the authenticated customer from JWT. */
export async function getMyOrders(): Promise<Order[]> {
  return authJson<Order[]>("/orders/my", {
    role: "customer",
    cache: "no-store",
  });
}

export async function getCustomerOrders(phone: string): Promise<Order[]> {
  return authJson<Order[]>(
    `/orders/customer/${encodeURIComponent(phone)}`,
    {
      role: "customer",
      cache: "no-store",
    }
  );
}

export async function getOrderById(orderId: string): Promise<Order> {
  return authJson<Order>(`/orders/${encodeURIComponent(orderId)}`, {
    role: "customer",
    cache: "no-store",
  });
}

export async function getDeliveryLocation(orderId: string): Promise<TrackingLocation> {
  return authJson<TrackingLocation>(
    `/orders/delivery/location/${encodeURIComponent(orderId)}`,
    {
      role: "customer",
      cache: "no-store",
    }
  );
}

export { deleteAdminOrder } from "@/services/adminService";

