import { authJson } from "@/services/authFetch";
import { RIDER_BASE_PAYOUT } from "@/lib/orderPricing";
import type {
  DeliveryPartnerProfile,
  DeliveryDashboardStats,
  DeliveryDashboardOrder,
  RiderCashReconciliation,
} from "@/types";

export type {
  DeliveryPartnerProfile,
  DeliveryDashboardStats,
  DeliveryDashboardOrder,
  RiderCashReconciliation,
};

/**
 * Calculates earnings for a completed delivery order using the canonical flat ₹20 model.
 * earnedWage = RIDER_BASE_PAYOUT (₹20.00) + tip_amount
 */
export function calculateRiderEarnings(order?: {
  total?: number;
  delivery_fee?: number;
  tip_amount?: number;
  tip?: number;
}): number {
  const tip = Number(order?.tip_amount ?? order?.tip ?? 0);
  return Number((RIDER_BASE_PAYOUT + Math.max(0, tip)).toFixed(2));
}

function getStoredDeliveredOrders(phone?: string): Array<{
  _id?: string;
  id?: string;
  status?: string;
  total?: number;
  payment_method?: string;
  tip_amount?: number;
  tip?: number;
}> {
  if (typeof window === "undefined") return [];
  const list: Array<{
    _id?: string;
    id?: string;
    status?: string;
    total?: number;
    payment_method?: string;
    tip_amount?: number;
    tip?: number;
  }> = [];
  const seenIds = new Set<string>();

  const storageKeys = [
    phone ? `cb_my_deliveries_${phone}` : null,
    "cb_accepted_deliveries",
    "cb_orders",
    "orders",
    "cb_active_order",
  ].filter(Boolean) as string[];

  for (const key of storageKeys) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      const items = Array.isArray(parsed) ? parsed : [parsed];
      for (const item of items) {
        if (!item || typeof item !== "object") continue;
        const id = String(item._id || item.id || "").trim();
        if (id && !seenIds.has(id)) {
          seenIds.add(id);
          list.push(item);
        }
      }
    } catch {}
  }
  return list;
}

export function getRiderCashReconciliation(phone?: string): RiderCashReconciliation {
  if (typeof window === "undefined") {
    return {
      cash_in_hand: 0,
      total_payout_earned: 0,
      net_cash_due: 0,
      total_cod_collected: 0,
      total_remitted: 0,
      completed_deliveries: 0,
    };
  }

  const key1 = phone ? `cb_cih_${phone}` : "cb_cih_default";
  const key2 = phone ? `cb_rider_reconciliation_${phone}` : "cb_rider_reconciliation_default";

  let parsed: Partial<RiderCashReconciliation> = {};
  try {
    const raw =
      localStorage.getItem(key2) ||
      localStorage.getItem(key1) ||
      localStorage.getItem("cb_cih_default") ||
      localStorage.getItem("cb_rider_reconciliation_default");
    if (raw) {
      parsed = JSON.parse(raw);
    }
  } catch (_) {}

  // 1. Determine completed deliveries and tips dynamically
  const storedOrders = getStoredDeliveredOrders(phone);
  const completedOrders = storedOrders.filter((o) => {
    const s = String(o.status || "").toLowerCase().trim();
    return s === "delivered" || s === "completed";
  });

  const completedCount = Math.max(
    completedOrders.length,
    Number(parsed.completed_deliveries || 0)
  );

  // 2. Sum COD collected and tips from delivered runs
  let codFromOrders = 0;
  for (const o of completedOrders) {
    const pm = String(o.payment_method || "").toLowerCase().trim();
    if (pm.includes("cod") || pm.includes("cash")) {
      codFromOrders += Number(o.total || 0);
    }
  }

  const totalTips = completedOrders.reduce(
    (sum, o) => sum + Math.max(0, Number(o.tip_amount ?? o.tip ?? 0)),
    0
  );

  // 3. Enforce canonical flat ₹20 per delivered order + tips
  // Never return raw stale numbers if total_payout_earned contains fractional decimals (like .75)
  // or doesn't match completedCount * 20.00 + tips.
  let canonicalPayoutEarned = Number(
    (completedCount * RIDER_BASE_PAYOUT + totalTips).toFixed(2)
  );
  if (completedCount === 0 && Number(parsed.total_payout_earned || 0) > 0) {
    const rawEarned = Number(parsed.total_payout_earned);
    // If it's a legacy fractional payout (e.g. 12.75 with .75), eliminate it
    if (rawEarned % 20 === 0) {
      canonicalPayoutEarned = rawEarned;
    }
  }

  const total_remitted = Number((parsed.total_remitted || 0).toFixed(2));
  const total_cod_collected = Number(
    Math.max(
      codFromOrders,
      Number(parsed.total_cod_collected ?? parsed.cash_in_hand ?? 0)
    ).toFixed(2)
  );

  const cash_in_hand = Math.max(
    0,
    Number((total_cod_collected - total_remitted).toFixed(2))
  );

  // Recompute canonical net dues
  const canonicalNetDue = Math.max(
    0,
    Number((total_cod_collected - canonicalPayoutEarned - total_remitted).toFixed(2))
  );

  const updatedRecon: RiderCashReconciliation = {
    cash_in_hand,
    total_payout_earned: canonicalPayoutEarned,
    net_cash_due: canonicalNetDue,
    total_cod_collected,
    total_remitted,
    completed_deliveries: completedCount,
  };

  // Overwrite stale caches
  try {
    localStorage.setItem(key1, JSON.stringify(updatedRecon));
    localStorage.setItem(key2, JSON.stringify(updatedRecon));
  } catch (_) {}

  return updatedRecon;
}

export function recordDeliveredOrderCash(
  order: {
    total?: number;
    payment_method?: string;
    tip_amount?: number;
    tip?: number;
    delivery_fee?: number;
  },
  phone?: string
): RiderCashReconciliation {
  const current = getRiderCashReconciliation(phone);
  const paymentMethod = String(order.payment_method || "").toLowerCase().trim();
  const isCod = paymentMethod.includes("cod") || paymentMethod.includes("cash");

  const orderCash = isCod ? Number(order.total || 0) : 0;
  const earnedWage = calculateRiderEarnings(order);

  const total_cod_collected = Number(
    ((current.total_cod_collected ?? current.cash_in_hand) + orderCash).toFixed(2)
  );
  const total_remitted = Number((current.total_remitted ?? 0).toFixed(2));
  const completed_deliveries = (current.completed_deliveries ?? 0) + 1;
  const total_payout_earned = Number(
    (current.total_payout_earned + earnedWage).toFixed(2)
  );

  const cash_in_hand = Math.max(
    0,
    Number((total_cod_collected - total_remitted).toFixed(2))
  );
  const net_cash_due = Math.max(
    0,
    Number(
      (total_cod_collected - total_payout_earned - total_remitted).toFixed(2)
    )
  );

  const updated: RiderCashReconciliation = {
    cash_in_hand,
    total_payout_earned,
    net_cash_due,
    total_cod_collected,
    total_remitted,
    completed_deliveries,
  };

  if (typeof window !== "undefined") {
    const key1 = phone ? `cb_cih_${phone}` : "cb_cih_default";
    const key2 = phone ? `cb_rider_reconciliation_${phone}` : "cb_rider_reconciliation_default";
    try {
      localStorage.setItem(key1, JSON.stringify(updated));
      localStorage.setItem(key2, JSON.stringify(updated));
    } catch (_) {}
  }

  return updated;
}

export function remitRiderDues(
  phone?: string,
  amountRemitted?: number
): RiderCashReconciliation {
  const current = getRiderCashReconciliation(phone);
  const remitted =
    amountRemitted !== undefined ? amountRemitted : current.net_cash_due;

  const total_cod_collected = Number(
    (current.total_cod_collected ?? current.cash_in_hand).toFixed(2)
  );
  const total_remitted = Number(
    ((current.total_remitted ?? 0) + remitted).toFixed(2)
  );
  const completed_deliveries = current.completed_deliveries ?? 0;
  const total_payout_earned = current.total_payout_earned;

  const cash_in_hand = Math.max(
    0,
    Number((total_cod_collected - total_remitted).toFixed(2))
  );
  const net_cash_due = Math.max(
    0,
    Number(
      (total_cod_collected - total_payout_earned - total_remitted).toFixed(2)
    )
  );

  const updated: RiderCashReconciliation = {
    cash_in_hand,
    total_payout_earned,
    net_cash_due,
    total_cod_collected,
    total_remitted,
    completed_deliveries,
  };

  if (typeof window !== "undefined") {
    const key1 = phone ? `cb_cih_${phone}` : "cb_cih_default";
    const key2 = phone ? `cb_rider_reconciliation_${phone}` : "cb_rider_reconciliation_default";
    try {
      localStorage.setItem(key1, JSON.stringify(updated));
      localStorage.setItem(key2, JSON.stringify(updated));
    } catch (_) {}
  }

  return updated;
}

export async function getDeliveryStatus(phone: string) {
  return authJson<{ online: boolean }>(
    `/delivery-partner/status/${encodeURIComponent(phone)}`,
    {
      role: "delivery_partner",
      cache: "no-store",
    }
  );
}

export async function updateDeliveryStatus(
  phone: string,
  online: boolean
) {
  return authJson("/delivery-partner/status", {
    role: "delivery_partner",
    method: "PUT",
    body: JSON.stringify({
      phone,
      online,
    }),
  });
}

export async function getDeliveryPartnerProfile() {
  return authJson<DeliveryPartnerProfile>("/delivery-partner/me", {
    role: "delivery_partner",
    cache: "no-store",
  });
}

export async function updateDeliveryPartnerProfile(payload: {
  name?: string;
  vehicle?: string;
  vehicle_type?: string;
  vehicle_number?: string;
  profile_image?: string;
  online?: boolean;
}) {
  return authJson<{
    message: string;
    partner: DeliveryPartnerProfile;
  }>("/delivery-partner/me", {
    role: "delivery_partner",
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function getDeliveryStats(phone: string) {
  const cih = getRiderCashReconciliation(phone);
  try {
    const data = await authJson<DeliveryDashboardStats>(
      `/delivery-dashboard/stats/${encodeURIComponent(phone)}`,
      {
        role: "delivery_partner",
        cache: "no-store",
      }
    );

    const cashInHand = data.cash_in_hand ?? cih.cash_in_hand;
    const totalPayout =
      data.total_payout_earned ?? (data.earnings || cih.total_payout_earned);
    const netDue =
      data.net_cash_due !== undefined
        ? Math.max(0, data.net_cash_due)
        : Math.max(0, Number((cashInHand - totalPayout).toFixed(2)));

    return {
      ...data,
      cash_in_hand: cashInHand,
      total_payout_earned: totalPayout,
      net_cash_due: netDue,
    };
  } catch (err) {
    return {
      phone,
      pending: 0,
      completed: cih.completed_deliveries ?? 0,
      earnings: cih.total_payout_earned,
      rating: 5.0,
      cash_in_hand: cih.cash_in_hand,
      total_payout_earned: cih.total_payout_earned,
      net_cash_due: cih.net_cash_due,
      assigned_orders: 0,
      picked_up_orders: 0,
      delivered_today: cih.completed_deliveries ?? 0,
      earnings_today: cih.total_payout_earned,
      total_deliveries: cih.completed_deliveries ?? 0,
      recent_assigned_orders: [],
    };
  }
}

