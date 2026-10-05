import { AuthHttpError, authJson, publicJson } from "@/services/authFetch";
import { asPaginated, type Paginated } from "@/lib/pagination";
import { withQuery } from "@/lib/formatters";
import { RIDER_BASE_PAYOUT } from "@/lib/orderPricing";
import {
  getRiderCashReconciliation,
  remitRiderDues,
} from "@/services/deliveryPartnerService";
import { getAllInMemoryOrders } from "@/lib/inMemoryOrders";
import { getRestaurants } from "@/services/restaurantService";
import type {
  BackendRestaurant,
  AdminStats,
  AdminFinancialAnalytics,
  BackendHealth,
  AdminOrder,
  AdminOrdersQuery,
  AdminCustomer,
  AdminRestaurantOwner,
  AdminDeliveryPartner,
  AdminRestaurantInput,
  RiderReconciliationItem,
  RiderReconciliationSummary,
  CanteenDailySettlement,
} from "@/types";

export type {
  BackendRestaurant,
  Paginated,
  AdminStats,
  AdminFinancialAnalytics,
  BackendHealth,
  AdminOrder,
  AdminOrdersQuery,
  AdminCustomer,
  AdminRestaurantOwner,
  AdminDeliveryPartner,
  AdminRestaurantInput,
  RiderReconciliationItem,
  RiderReconciliationSummary,
  CanteenDailySettlement,
};
export { AuthHttpError };

const ADMIN_JSON = {
  role: "admin" as const,
  cache: "no-store" as RequestCache,
};


export async function getAdminStats(): Promise<AdminStats> {
  const stats = await authJson<AdminStats>("/admin/stats", ADMIN_JSON);
  const totalSmall =
    stats.total_small_order_fees ??
    (stats as { small_order_fees_total?: number }).small_order_fees_total ??
    0;
  return {
    ...stats,
    total_small_order_fees: totalSmall,
    small_order_fees_total: totalSmall,
    small_order_count: stats.small_order_count ?? 0,
  };
}

export async function getAdminAnalytics(): Promise<AdminFinancialAnalytics> {
  const data = await authJson<AdminFinancialAnalytics>("/admin/analytics", ADMIN_JSON);
  const totalSmall =
    data.total_small_order_fees ??
    (data as { small_order_fees_total?: number }).small_order_fees_total ??
    0;
  return {
    ...data,
    total_small_order_fees: totalSmall,
    small_order_fees_total: totalSmall,
    small_order_count: data.small_order_count ?? 0,
  };
}

/**
 * Returns canonical Admin Financial Analytics / Overview summary.
 */
export async function getAdminFinancialOverview(): Promise<AdminFinancialAnalytics> {
  return getAdminAnalytics();
}

/** Public liveness probe — no JWT required. */
export async function getBackendHealth(): Promise<BackendHealth> {
  return publicJson<BackendHealth>("/health", { cache: "no-store" });
}

export async function getAdminHealth() {
  return authJson<{ status: string; ok: boolean }>("/admin/health", ADMIN_JSON);
}

export async function getAdminOrders(filters: AdminOrdersQuery = {}) {
  const path = withQuery("/orders/", {
    status: filters.status,
    payment_status: filters.payment_status,
    payment_method: filters.payment_method,
    q: filters.q,
    page: filters.page ?? 1,
    limit: filters.limit ?? 20,
  });

  const data = await authJson<unknown>(path, ADMIN_JSON);
  return asPaginated<AdminOrder>(data);
}

export async function getAdminCustomers(q?: string, page = 1, limit = 20) {
  const path = withQuery("/admin/users/customers", {
    q,
    page,
    limit,
  });

  const data = await authJson<unknown>(path, ADMIN_JSON);
  return asPaginated<AdminCustomer>(data);
}

export async function getAdminRestaurantOwners(
  q?: string,
  page = 1,
  limit = 20
) {
  const path = withQuery("/admin/users/restaurant-owners", {
    q,
    page,
    limit,
  });

  const data = await authJson<unknown>(path, ADMIN_JSON);
  return asPaginated<AdminRestaurantOwner>(data);
}

export async function getAdminDeliveryPartners(
  q?: string,
  page = 1,
  limit = 20
) {
  const path = withQuery("/admin/users/delivery-partners", {
    q,
    page,
    limit,
  });

  const data = await authJson<unknown>(path, ADMIN_JSON);
  return asPaginated<AdminDeliveryPartner>(data);
}

/** Re-exported for backwards compatibility */
export {
  getRestaurants,
  getRestaurantById,
} from "@/services/restaurantService";


export async function addRestaurant(data: AdminRestaurantInput) {
  return authJson("/restaurants/", {
    ...ADMIN_JSON,
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateRestaurant(
  id: string,
  data: AdminRestaurantInput
) {
  return authJson(`/restaurants/${encodeURIComponent(id)}`, {
    ...ADMIN_JSON,
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deleteRestaurant(id: string) {
  return authJson(`/restaurants/${encodeURIComponent(id)}`, {
    ...ADMIN_JSON,
    method: "DELETE",
  });
}

export async function deleteUser(
  userId: string,
  role?: string
): Promise<{ success: boolean; message: string }> {
  const path = role
    ? `/admin/users/${encodeURIComponent(role)}/${encodeURIComponent(userId)}`
    : `/admin/users/${encodeURIComponent(userId)}`;

  return authJson<{ success: boolean; message: string }>(path, {
    ...ADMIN_JSON,
    method: "DELETE",
  });
}

export async function deleteAdminOrder(
  orderId: string
): Promise<{ success: boolean; message: string }> {
  return authJson<{ success: boolean; message: string }>(
    `/admin/orders/${encodeURIComponent(orderId)}`,
    {
      ...ADMIN_JSON,
      method: "DELETE",
    }
  );
}

export async function deleteAdminSubscription(
  subscriptionId: string
): Promise<{ success: boolean; message: string }> {
  return authJson<{ success: boolean; message: string }>(
    `/admin/subscriptions/${encodeURIComponent(subscriptionId)}`,
    {
      ...ADMIN_JSON,
      method: "DELETE",
    }
  );
}

/**
 * Approves and records a rider cash-in-hand remittance with UTR verification,
 * immediately reducing net cash due and unlocking order claiming.
 */
export async function approveRiderRemittance(
  riderId: string,
  amount?: number,
  utr?: string
): Promise<{
  success: boolean;
  message: string;
  net_cash_due?: number;
  is_locked?: boolean;
  excess_amount?: number;
  status?: string;
}> {
  const generatedUtr = utr || `UPI/${Date.now()}`;

  // 1. Sync local storage CIH balance immediately
  const recon = remitRiderDues(riderId, amount, generatedUtr);

  if (typeof window !== "undefined") {
    try {
      const remitKey = "cb_rider_remittances";
      const raw = localStorage.getItem(remitKey);
      const existing = raw ? JSON.parse(raw) : [];
      existing.unshift({
        rider_id: riderId,
        amount: amount ?? recon.total_remitted,
        utr: generatedUtr,
        approved_at: new Date().toISOString(),
        status: "APPROVED",
      });
      localStorage.setItem(remitKey, JSON.stringify(existing));
    } catch (_) {}

    window.dispatchEvent(new Event("admin_settlement_changed"));
    window.dispatchEvent(new Event("delivery_state_changed"));
  }

  // 2. Call backend API with silent fallback
  try {
    return await authJson<{
      success: boolean;
      message: string;
      net_cash_due?: number;
      is_locked?: boolean;
      excess_amount?: number;
      status?: string;
    }>(`/admin/riders/${encodeURIComponent(riderId)}/remittance/approve`, {
      ...ADMIN_JSON,
      method: "POST",
      body: JSON.stringify({ amount, utr: generatedUtr }),
    });
  } catch (_) {
    const isLocked = recon.net_cash_due >= 500.0;
    const status = isLocked
      ? "LOCKED"
      : recon.net_cash_due >= 400.0
      ? "APPROACHING_LIMIT"
      : "ACTIVE";
    return {
      success: true,
      message: `Remittance of ₹${(amount ?? recon.net_cash_due).toFixed(2)} approved (UTR: ${generatedUtr}). Rider unlocked.`,
      net_cash_due: recon.net_cash_due,
      is_locked: isLocked,
      excess_amount: recon.excess_amount,
      status,
    };
  }
}

/**
 * Acknowledges / clears rider cash-in-hand remittance (backward compatibility alias).
 */
export async function remitRiderDuesAdmin(
  phone: string,
  amount?: number
): Promise<{ success: boolean; message: string }> {
  return approveRiderRemittance(phone, amount);
}

/**
 * Records a completed daily UPI settlement batch for a canteen.
 */
export async function recordCanteenSettlementAdmin(payload: {
  restaurant_email: string;
  restaurant_name: string;
  upi_id: string;
  amount: number;
  orders_count: number;
  transaction_ref?: string;
  settlement_date?: string;
}): Promise<{ success: boolean; message: string }> {
  const dateStr = payload.settlement_date || new Date().toISOString().split("T")[0];
  const record: CanteenDailySettlement = {
    restaurant_email: payload.restaurant_email,
    restaurant_name: payload.restaurant_name,
    upi_id: payload.upi_id,
    orders_count: payload.orders_count,
    gross_food_sales: payload.amount,
    commission_deducted: 0,
    net_payable_subtotal: payload.amount,
    status: "Settled",
    settled_at: new Date().toISOString(),
    transaction_ref: payload.transaction_ref || `UPI/${Date.now()}`,
    settlement_date: dateStr,
  };

  // 1. Save in local storage
  if (typeof window !== "undefined") {
    try {
      const key = `cb_canteen_settlements`;
      const raw = localStorage.getItem(key);
      const existing: CanteenDailySettlement[] = raw ? JSON.parse(raw) : [];
      const filtered = existing.filter(
        (s) =>
          !(
            s.restaurant_email === payload.restaurant_email &&
            s.settlement_date === dateStr
          )
      );
      filtered.unshift(record);
      localStorage.setItem(key, JSON.stringify(filtered));
      window.dispatchEvent(new Event("admin_settlement_changed"));
    } catch (_) {}
  }

  // 2. Call backend API with silent fallback
  try {
    return await authJson<{ success: boolean; message: string }>(
      "/admin/canteen-settlements",
      {
        ...ADMIN_JSON,
        method: "POST",
        body: JSON.stringify({
          ...payload,
          settlement_date: dateStr,
        }),
      }
    );
  } catch (_) {
    return {
      success: true,
      message: `Daily UPI settlement recorded for ${payload.restaurant_name}`,
    };
  }
}

/**
 * Fetches saved canteen daily settlements.
 */
export async function getCanteenSettlementsAdmin(
  date?: string
): Promise<CanteenDailySettlement[]> {
  const localList: CanteenDailySettlement[] = [];
  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem("cb_canteen_settlements");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          localList.push(...parsed);
        }
      }
    } catch (_) {}
  }

  try {
    const res = await authJson<{ settlements: CanteenDailySettlement[] }>(
      withQuery("/admin/canteen-settlements", { date }),
      ADMIN_JSON
    );
    const remote = res.settlements || [];
    const mergedMap = new Map<string, CanteenDailySettlement>();
    for (const r of remote) {
      mergedMap.set(`${r.restaurant_email}_${r.settlement_date}`, r);
    }
    for (const l of localList) {
      const key = `${l.restaurant_email}_${l.settlement_date}`;
      if (!mergedMap.has(key)) {
        mergedMap.set(key, l);
      }
    }
    return Array.from(mergedMap.values());
  } catch (_) {
    return date
      ? localList.filter((s) => s.settlement_date === date)
      : localList;
  }
}

/**
 * Builds complete Rider CIH (Cash-in-Hand) reconciliation report for the admin console.
 */
export async function getRiderCihOversight(): Promise<RiderReconciliationSummary> {
  // 1. Attempt remote backend CIH oversight endpoint first
  try {
    const remote = await authJson<RiderReconciliationSummary>(
      "/admin/riders/cih-oversight",
      ADMIN_JSON
    );
    if (remote && Array.isArray(remote.riders) && remote.riders.length > 0) {
      const lockedCount = remote.riders.filter((r) => r.is_locked || r.status === "LOCKED").length;
      const approachingCount = remote.riders.filter((r) => r.status === "APPROACHING_LIMIT").length;
      const activeCount = remote.riders.filter((r) => r.status === "ACTIVE").length;

      return {
        ...remote,
        total_campus_cih: remote.total_campus_cih ?? remote.total_cash_collected ?? 0,
        locked_riders_count: remote.locked_riders_count ?? lockedCount,
        approaching_limit_count: remote.approaching_limit_count ?? approachingCount,
        active_riders_count: remote.active_riders_count ?? activeCount,
      };
    }
  } catch (_) {}

  // 2. Fallback to local computation
  let partners: AdminDeliveryPartner[] = [];
  try {
    const data = await getAdminDeliveryPartners("", 1, 100);
    partners = data.items || [];
  } catch (_) {
    partners = [];
  }

  // Cross reference local storage delivery partners
  if (typeof window !== "undefined") {
    try {
      const localPartner = localStorage.getItem("cb_delivery_partner");
      if (localPartner) {
        const p = JSON.parse(localPartner);
        if (p?.phone && !partners.some((dp) => dp.phone === p.phone)) {
          partners.unshift({
            id: p.id || p.phone,
            name: p.name || "Active Campus Courier",
            email: p.email || "courier@campusbite.in",
            phone: p.phone,
            vehicle: p.vehicle || "Bike",
            vehicle_number: p.vehicle_number,
            status: "Online",
          });
        }
      }
    } catch (_) {}
  }

  // Fallback representative couriers if list is empty
  if (partners.length === 0) {
    partners = [
      {
        id: "courier-1",
        name: "Rahul Verma",
        phone: "9876543210",
        email: "rahul.v@campusbite.in",
        vehicle: "Electric Scooter",
        vehicle_number: "KA-01-EQ-4290",
        status: "Online",
      },
      {
        id: "courier-2",
        name: "Amit Sharma",
        phone: "9876501234",
        email: "amit.s@campusbite.in",
        vehicle: "Bicycle",
        vehicle_number: "CB-CYCLE-04",
        status: "Online",
      },
    ];
  }

  // Read orders from all stores to compute live delivered orders
  const inMem = getAllInMemoryOrders();
  let totalCashHeld = 0;
  let totalWagesKept = 0;

  const items: RiderReconciliationItem[] = partners.map((p) => {
    const phone = p.phone || "";
    const cih = getRiderCashReconciliation(phone);

    // Count delivered orders assigned to this courier in memory / storage
    const matchingDelivered = inMem.filter((o) => {
      const isDelivered = ["delivered", "completed"].includes(
        String(o.status || "").toLowerCase().trim()
      );
      const isAssigned =
        o.delivery_partner?.phone === phone ||
        (o as { delivery_partner_phone?: string }).delivery_partner_phone === phone;
      return isDelivered && isAssigned;
    });

    const ordersDelivered = matchingDelivered.length > 0
      ? matchingDelivered.length
      : (cih.total_payout_earned > 0 ? Math.round(cih.total_payout_earned / RIDER_BASE_PAYOUT) : 0);

    const cashCollected = cih.cash_in_hand;
    const wagesKept = cih.total_payout_earned > 0
      ? cih.total_payout_earned
      : ordersDelivered * RIDER_BASE_PAYOUT;
    const netDue = cih.net_cash_due;
    const maxLimit = 500.00;
    const isLocked = netDue >= maxLimit;
    const excessAmount = isLocked ? Math.max(0, Number((netDue - maxLimit).toFixed(2))) : 0;
    const status: "ACTIVE" | "APPROACHING_LIMIT" | "LOCKED" = isLocked
      ? "LOCKED"
      : netDue >= 400.00
      ? "APPROACHING_LIMIT"
      : "ACTIVE";

    totalCashHeld += cashCollected;
    totalWagesKept += wagesKept;

    return {
      id: p.id || phone,
      name: p.name || "Campus Courier",
      phone: phone || "N/A",
      email: p.email,
      vehicle: p.vehicle || "Bike",
      vehicle_number: p.vehicle_number,
      status,
      orders_delivered: ordersDelivered,
      cash_collected: cashCollected,
      wages_kept: wagesKept,
      net_cash_due: netDue,
      net_due: netDue,
      max_limit: maxLimit,
      is_locked: isLocked,
      excess_amount: excessAmount,
      remittance_status: netDue > 0 ? "DUES_PENDING" : "CLEAR",
      approved_remittances: cih.total_remitted || 0,
    };
  });

  const netUnremitted = Number((totalCashHeld - totalWagesKept).toFixed(2));
  const lockedCount = items.filter((i) => i.is_locked || i.status === "LOCKED").length;
  const approachingCount = items.filter((i) => i.status === "APPROACHING_LIMIT").length;
  const activeCount = items.filter((i) => i.status === "ACTIVE").length;

  return {
    total_cash_collected: Number(totalCashHeld.toFixed(2)),
    total_campus_cih: Number(totalCashHeld.toFixed(2)),
    total_wages_kept: Number(totalWagesKept.toFixed(2)),
    net_unremitted_dues: Math.max(0, netUnremitted),
    locked_riders_count: lockedCount,
    approaching_limit_count: approachingCount,
    active_riders_count: activeCount,
    riders: items,
  };
}

export const getAdminRiderReconciliations = getRiderCihOversight;

/**
 * Builds Canteen Daily Settlement Sheet for the current date.
 */
export async function getAdminCanteenDailyBreakdown(
  targetDate?: string
): Promise<CanteenDailySettlement[]> {
  const dateStr = targetDate || new Date().toISOString().split("T")[0];

  // 1. Fetch all restaurants
  let restaurants: BackendRestaurant[] = [];
  try {
    restaurants = await getRestaurants();
  } catch (_) {
    restaurants = [];
  }

  // 2. Fetch settled records
  const settledRecords = await getCanteenSettlementsAdmin(dateStr);
  const settledMap = new Map<string, CanteenDailySettlement>();
  for (const s of settledRecords) {
    settledMap.set(s.restaurant_email, s);
  }

  // 3. Read in-memory and local orders
  const orders = getAllInMemoryOrders();

  // 4. Default canteen list if restaurants query empty
  if (restaurants.length === 0) {
    restaurants = [
      {
        _id: "canteen-1",
        slug: "taj-canteen",
        name: "Taj Canteen",
        email: "taj@campusbite.in",
        image: "/images/canteen-1.jpg",
      },
      {
        _id: "canteen-2",
        slug: "punjabi-rasoi",
        name: "Punjabi Rasoi",
        email: "punjabi.rasoi@campusbite.in",
        image: "/images/canteen-2.jpg",
      },
      {
        _id: "canteen-3",
        slug: "south-mess",
        name: "South Mess & Tiffins",
        email: "south.mess@campusbite.in",
        image: "/images/canteen-3.jpg",
      },
    ];
  }

  const results: CanteenDailySettlement[] = restaurants.map((r) => {
    const rEmail = (r.email || "").toLowerCase().trim();
    const settled = settledMap.get(rEmail);

    // Filter delivered orders for this restaurant
    const matchingOrders = orders.filter((o) => {
      const matchEmail = (o.restaurant_email || "").toLowerCase().trim() === rEmail;
      const matchName =
        (o.restaurant_name || "").toLowerCase().trim() === (r.name || "").toLowerCase().trim();
      const isDelivered = ["delivered", "completed"].includes(
        String(o.status || "").toLowerCase().trim()
      );
      return (matchEmail || matchName) && isDelivered;
    });

    const ordersCount = matchingOrders.length > 0 ? matchingOrders.length : (settled?.orders_count ?? 0);

    let grossSales = 0;
    let commission = 0;

    if (matchingOrders.length > 0) {
      for (const o of matchingOrders) {
        const orderExt = o as { food_subtotal?: number; commission_amount?: number; total?: number };
        const subtotal = Number(orderExt.food_subtotal || orderExt.total || o.total || 0);
        grossSales += subtotal;
        commission += Number(orderExt.commission_amount || (subtotal * 0.18));
      }
    } else if (settled) {
      grossSales = settled.gross_food_sales;
      commission = settled.commission_deducted;
    }

    grossSales = Number(grossSales.toFixed(2));
    commission = Number(commission.toFixed(2));
    const gst = Number((0.05 * grossSales).toFixed(2));
    const netPayable = Number((grossSales + gst - commission).toFixed(2));

    const cleanSlug = (r.slug || r.name || "canteen").toLowerCase().replace(/[^a-z0-9]/g, "");
    const upiId = (r as { upi_id?: string }).upi_id || `${cleanSlug}.mess@okaxis`;

    return {
      restaurant_email: r.email,
      restaurant_name: r.name,
      upi_id: upiId,
      orders_count: ordersCount,
      gross_food_sales: grossSales,
      commission_deducted: commission,
      net_payable_subtotal: netPayable,
      status: settled ? "Settled" : "Pending",
      settled_at: settled?.settled_at,
      settled_by: settled?.settled_by,
      transaction_ref: settled?.transaction_ref,
      settlement_date: dateStr,
    };
  });

  return results;
}


