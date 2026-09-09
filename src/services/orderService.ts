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

  let order: Order;
  try {
    order = await authJson<Order>("/orders/", {
      role: "customer",
      method: "POST",
      body: JSON.stringify(payload),
    });
  } catch (backendErr) {
    // If backend direct endpoint is unreachable, fallback to internal Next.js /api/orders
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        order = await res.json();
      } else {
        throw backendErr;
      }
    } catch {
      throw backendErr;
    }
  }

  // Save the placed order object to localStorage for instant local retrieval
  if (typeof window !== "undefined" && order) {
    try {
      localStorage.setItem("cb_last_order", JSON.stringify(order));
      localStorage.setItem(
        "cb_active_order_id",
        order._id || (order as unknown as { id?: string }).id || ""
      );
    } catch {
      // ignore
    }
  }

  return order;
}

/** Preferred: load orders for the authenticated customer from JWT. */
export async function getMyOrders(): Promise<Order[]> {
  try {
    return await authJson<Order[]>("/orders/my", {
      role: "customer",
      cache: "no-store",
    });
  } catch (err) {
    // Fallback: Check internal API /api/orders or local storage
    try {
      const res = await fetch("/api/orders", { cache: "no-store" });
      if (res.ok) {
        const localOrders = await res.json();
        if (Array.isArray(localOrders) && localOrders.length > 0) {
          return localOrders;
        }
      }
    } catch {
      // ignore
    }

    if (typeof window !== "undefined") {
      try {
        const lastRaw = localStorage.getItem("cb_last_order");
        if (lastRaw) {
          const last = JSON.parse(lastRaw);
          if (last) return [last];
        }
      } catch {
        // ignore
      }
    }
    throw err;
  }
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
  if (!orderId) {
    throw new Error("Order ID is required");
  }

  try {
    return await authJson<Order>(`/orders/${encodeURIComponent(orderId)}`, {
      role: "customer",
      cache: "no-store",
    });
  } catch (err) {
    // Fallback 1: Next.js internal /api/orders/[id] route
    try {
      const res = await fetch(`/api/orders/${encodeURIComponent(orderId)}`, {
        cache: "no-store",
      });
      if (res.ok) {
        const data = await res.json();
        if (data && (data._id || data.id)) return data;
      }
    } catch {
      // ignore
    }

    // Fallback 2: localStorage 'cb_last_order'
    if (typeof window !== "undefined") {
      try {
        const cachedRaw = localStorage.getItem("cb_last_order");
        if (cachedRaw) {
          const cached = JSON.parse(cachedRaw);
          if (
            cached &&
            (cached._id === orderId ||
              cached.id === orderId ||
              cached._id?.slice(-8) === orderId ||
              orderId === "latest" ||
              orderId === "last")
          ) {
            return cached;
          }
        }
      } catch {
        // ignore
      }
    }

    throw err;
  }
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

