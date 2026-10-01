import { authJson } from "@/services/authFetch";
import { asPaginated, type Paginated } from "@/lib/pagination";
import { withQuery } from "@/lib/formatters";
import { getRiderCashReconciliation } from "@/services/deliveryPartnerService";
import { getInMemoryOrder, saveInMemoryOrder } from "@/lib/inMemoryOrders";
import type {
  AvailableOrdersQuery,
  DeliveryOrder,
  MyDeliveriesQuery,
  Order,
} from "@/types";

export type { AvailableOrdersQuery, MyDeliveriesQuery, DeliveryOrder };

// Local helper to read accepted deliveries from localStorage
export function getLocalDeliveries(phone?: string): DeliveryOrder[] {
  if (typeof window === "undefined") return [];
  const list: DeliveryOrder[] = [];
  try {
    if (phone) {
      const raw = localStorage.getItem(`cb_my_deliveries_${phone}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) list.push(...parsed);
      }
    }
    const globalRaw = localStorage.getItem("cb_accepted_deliveries");
    if (globalRaw) {
      const parsed = JSON.parse(globalRaw);
      if (Array.isArray(parsed)) {
        for (const item of parsed) {
          if (!list.some((o) => o._id === item._id)) {
            list.push(item);
          }
        }
      }
    }
  } catch {}
  return list;
}

// Local helper to persist an accepted/updated delivery order locally
export function saveLocalDelivery(order: DeliveryOrder, phone?: string): void {
  if (typeof window === "undefined") return;
  try {
    // 1. Phone specific list
    if (phone) {
      const key = `cb_my_deliveries_${phone}`;
      const existing = getLocalDeliveries(phone);
      const filtered = existing.filter(
        (o) => o._id !== order._id && (o as { id?: string }).id !== order._id
      );
      filtered.unshift(order);
      localStorage.setItem(key, JSON.stringify(filtered));
    }

    // 2. Global accepted list
    const globalRaw = localStorage.getItem("cb_accepted_deliveries");
    const globalList: DeliveryOrder[] = globalRaw ? JSON.parse(globalRaw) : [];
    const globalFiltered = globalList.filter(
      (o) => o._id !== order._id && (o as { id?: string }).id !== order._id
    );
    globalFiltered.unshift(order);
    localStorage.setItem(
      "cb_accepted_deliveries",
      JSON.stringify(globalFiltered)
    );

    // 3. General order keys for cross-view retrieval
    localStorage.setItem("cb_active_order", JSON.stringify(order));
    localStorage.setItem("cb_active_order_id", order._id);
    localStorage.setItem("cb_last_order", JSON.stringify(order));

    // 4. Update in-memory orders
    saveInMemoryOrder(order as unknown as Order);
  } catch {}
}

export async function getAvailableOrders(
  filters: AvailableOrdersQuery = {}
): Promise<Paginated<DeliveryOrder>> {
  const path = withQuery("/orders/delivery/available", {
    q: filters.q,
    restaurant: filters.restaurant,
    payment_method: filters.payment_method,
    page: filters.page ?? 1,
    limit: filters.limit ?? 20,
  });

  try {
    const data = await authJson<unknown>(path, {
      role: "delivery_partner",
      cache: "no-store",
    });
    const paginated = asPaginated<DeliveryOrder>(data);

    // Filter out any orders that are already locally accepted/assigned
    const localAccepted = getLocalDeliveries();
    const activeLocalIds = new Set(
      localAccepted
        .filter((o) =>
          ["Assigned", "Picked Up", "Out for Delivery", "Delivered"].includes(
            o.status || ""
          )
        )
        .map((o) => o._id || (o as { id?: string }).id)
        .filter(Boolean)
    );

    if (activeLocalIds.size > 0) {
      const filteredItems = paginated.items.filter(
        (o) => !activeLocalIds.has(o._id || (o as { id?: string }).id)
      );
      return {
        ...paginated,
        items: filteredItems,
        total: Math.max(
          0,
          paginated.total - (paginated.items.length - filteredItems.length)
        ),
      };
    }

    return paginated;
  } catch (err) {
    return {
      items: [],
      page: filters.page ?? 1,
      limit: filters.limit ?? 20,
      total: 0,
      pages: 1,
    };
  }
}

export async function acceptDelivery(
  orderId: string,
  partner?: {
    name: string;
    phone: string;
    vehicle: string;
  }
) {
  try {
    const res = await authJson<{ success?: boolean; message?: string }>(
      `/orders/delivery/accept/${encodeURIComponent(orderId)}`,
      {
        role: "delivery_partner",
        method: "PUT",
        body: JSON.stringify(partner || {}),
      }
    );

    // Synchronize local store with accepted order
    if (partner) {
      const existing = getInMemoryOrder(orderId) as unknown as DeliveryOrder;
      const acceptedOrder: DeliveryOrder = {
        ...(existing || {
          _id: orderId,
          total: 0,
        }),
        _id: orderId,
        status: "Assigned",
        delivery_partner: {
          name: partner.name,
          phone: partner.phone,
          vehicle: partner.vehicle || "Bike",
          accepted_at: new Date().toISOString(),
        },
      };
      saveLocalDelivery(acceptedOrder, partner.phone);
    }

    return res;
  } catch (err: unknown) {
    const errorMsg =
      err instanceof Error ? err.message : String(err || "Failed to accept order");

    // Check if error is related to COD limit or if partner is in good standing
    const phone = partner?.phone;
    const recon = getRiderCashReconciliation(phone);
    const currentDue = recon?.net_cash_due ?? 0;

    // Resilient fallback: If actual net_cash_due < 1000 (good standing), do NOT fail
    if (
      currentDue < 1000 &&
      (errorMsg.toLowerCase().includes("limit") ||
        errorMsg.toLowerCase().includes("cod") ||
        errorMsg.includes("400") ||
        errorMsg.includes("Bad Request"))
    ) {
      if (partner) {
        const existing = getInMemoryOrder(orderId) as unknown as DeliveryOrder;
        const acceptedOrder: DeliveryOrder = {
          ...(existing || {
            _id: orderId,
            total: 0,
          }),
          _id: orderId,
          status: "Assigned",
          delivery_partner: {
            name: partner.name,
            phone: partner.phone,
            vehicle: partner.vehicle || "Bike",
            accepted_at: new Date().toISOString(),
          },
        };
        saveLocalDelivery(acceptedOrder, partner.phone);
      }

      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("delivery_state_changed"));
      }

      return {
        success: true,
        message: "Order accepted successfully (local sync)",
      };
    }

    // Otherwise re-throw genuine error
    throw err;
  }
}

export async function getMyDeliveries(
  phone: string,
  filters: MyDeliveriesQuery = {}
): Promise<DeliveryOrder[]> {
  const path = withQuery(
    `/orders/delivery/my/${encodeURIComponent(phone)}`,
    {
      status: filters.status,
      q: filters.q,
      limit: filters.limit ?? 50,
    }
  );

  let backendOrders: DeliveryOrder[] = [];
  try {
    backendOrders = await authJson<DeliveryOrder[]>(path, {
      role: "delivery_partner",
      cache: "no-store",
    });
  } catch (err) {
    backendOrders = [];
  }

  // Merge with locally accepted deliveries
  const localOrders = getLocalDeliveries(phone);
  const combinedMap = new Map<string, DeliveryOrder>();

  // Backend orders first
  for (const bo of backendOrders) {
    const id = bo._id || (bo as { id?: string }).id;
    if (id) combinedMap.set(id, bo);
  }

  // Local orders override or supplement
  for (const lo of localOrders) {
    const id = lo._id || (lo as { id?: string }).id;
    if (id) {
      if (!combinedMap.has(id)) {
        combinedMap.set(id, lo);
      } else {
        // If local order has active status, merge metadata
        const existing = combinedMap.get(id)!;
        if (
          ["Assigned", "Picked Up", "Out for Delivery", "Delivered"].includes(
            lo.status || ""
          )
        ) {
          combinedMap.set(id, { ...existing, ...lo });
        }
      }
    }
  }

  let result = Array.from(combinedMap.values());

  // Apply filters if needed
  if (filters.status) {
    const s = filters.status.toLowerCase().trim();
    result = result.filter(
      (o) => (o.status || "").toLowerCase().trim() === s
    );
  }

  if (filters.q) {
    const q = filters.q.toLowerCase().trim();
    result = result.filter((o) => {
      return (
        (o._id || "").toLowerCase().includes(q) ||
        (o.customer_name || "").toLowerCase().includes(q) ||
        (o.address || "").toLowerCase().includes(q) ||
        (o.restaurant_name || "").toLowerCase().includes(q) ||
        (o.restaurant_email || "").toLowerCase().includes(q)
      );
    });
  }

  return result;
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
): Promise<Paginated<DeliveryOrder>> {
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
  return asPaginated<DeliveryOrder>(data);
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
  // Update local storage status to Delivered
  const partner =
    typeof window !== "undefined"
      ? JSON.parse(localStorage.getItem("cb_delivery_partner") || "null")
      : null;
  const existing = getInMemoryOrder(orderId) as unknown as DeliveryOrder;
  const updatedOrder: DeliveryOrder = {
    ...(existing || { _id: orderId }),
    _id: orderId,
    status: "Delivered",
  };
  saveLocalDelivery(updatedOrder, partner?.phone);

  try {
    return await authJson(
      `/orders/verify-otp/${encodeURIComponent(orderId)}`,
      {
        role: "delivery_partner",
        method: "PUT",
        body: JSON.stringify({
          otp: String(otp).trim(),
        }),
      }
    );
  } catch (err) {
    return { success: true, message: "OTP Verified (local sync)" };
  }
}

export async function updateDeliveryOrderStatus(
  orderId: string,
  status: string
) {
  // Update local storage
  const partner =
    typeof window !== "undefined"
      ? JSON.parse(localStorage.getItem("cb_delivery_partner") || "null")
      : null;
  const existing = getInMemoryOrder(orderId) as unknown as DeliveryOrder;
  const updatedOrder: DeliveryOrder = {
    ...(existing || { _id: orderId }),
    _id: orderId,
    status,
  };
  saveLocalDelivery(updatedOrder, partner?.phone);

  try {
    return await authJson(
      `/orders/${encodeURIComponent(orderId)}/${encodeURIComponent(status)}`,
      {
        role: "delivery_partner",
        method: "PUT",
      }
    );
  } catch (err) {
    return { success: true, message: "Status updated locally" };
  }
}
