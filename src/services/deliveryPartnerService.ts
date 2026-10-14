import { authJson } from "@/services/authFetch";
import { getDeliveryPartnerSession } from "@/lib/authTokens";
import { removeInMemoryOrder } from "@/lib/inMemoryOrders";
import { toast } from "sonner";
import {
  RIDER_BASE_PAYOUT,
  RIDER_BATCH_ADDON_PAYOUT,
  calculateRiderPayout,
  calculateBatchRiderEarnings,
} from "@/lib/orderPricing";
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

export {
  RIDER_BASE_PAYOUT,
  RIDER_BATCH_ADDON_PAYOUT,
  calculateRiderPayout,
  calculateBatchRiderEarnings,
};

export const MAX_UNREMITTED_CASH_LIMIT = 500.00;

/**
 * Calculates earnings for a completed delivery order using the calibrated multi-drop model.
 * Base drop: RIDER_BASE_PAYOUT (₹20.00) + Large Cart Bonus (+₹5 if >= ₹150) + tip
 * Batch add-on drop: RIDER_BATCH_ADDON_PAYOUT (₹14.00) + tip
 */
export function calculateRiderEarnings(order?: {
  total?: number;
  food_subtotal?: number;
  subtotal?: number;
  delivery_fee?: number;
  tip_amount?: number;
  tip?: number;
  is_batch_addon?: boolean;
  isBatchAddon?: boolean;
  is_night_surge?: boolean;
  calculated_payout?: number;
}): number {
  if (order?.calculated_payout !== undefined && order.calculated_payout > 0) {
    return Number(order.calculated_payout.toFixed(2));
  }
  const tip = Number(order?.tip_amount ?? order?.tip ?? 0);
  const isAddon = Boolean(order?.is_batch_addon || order?.isBatchAddon);
  const subtotal = Number(order?.food_subtotal ?? order?.subtotal ?? order?.total ?? 0);
  return calculateRiderPayout(
    isAddon,
    tip,
    false,
    subtotal,
    Boolean(order?.is_night_surge)
  );
}

function getStoredDeliveredOrders(phone?: string): Array<{
  _id?: string;
  id?: string;
  status?: string;
  total?: number;
  payment_method?: string;
  tip_amount?: number;
  tip?: number;
  is_batch_addon?: boolean;
  isBatchAddon?: boolean;
  batch_id?: string;
  calculated_payout?: number;
  delivery_location?: { building?: string };
  hostel_block?: string;
  delivery_address?: string;
  address?: string;
  is_primary_batch_order?: boolean;
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
    is_batch_addon?: boolean;
    isBatchAddon?: boolean;
    batch_id?: string;
    calculated_payout?: number;
    delivery_location?: { building?: string };
    hostel_block?: string;
    delivery_address?: string;
    address?: string;
    is_primary_batch_order?: boolean;
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

  // 2. Sum COD collected from delivered runs
  let codFromOrders = 0;
  for (const o of completedOrders) {
    const pm = String(o.payment_method || "").toLowerCase().trim();
    if (pm.includes("cod") || pm.includes("cash")) {
      codFromOrders += Number(o.total || 0);
    }
  }

  const rawTotalCod = Number(parsed.total_cod_collected ?? parsed.cash_in_hand ?? 0);
  const total_cod_collected = Number(Math.max(codFromOrders, rawTotalCod).toFixed(2));
  const total_remitted = Number((parsed.total_remitted || 0).toFixed(2));

  let completedCount = 0;
  let canonicalPayoutEarned = 0;

  if (completedOrders.length > 0) {
    completedCount = completedOrders.length;
    // Track batch IDs and drop locations to award ₹20 to primary drop and ₹14 to subsequent drops in the same batch / location
    const seenBatches = new Set<string>();
    const seenDropLocations = new Set<string>();
    let totalWages = 0;
    for (let idx = 0; idx < completedOrders.length; idx++) {
      const o = completedOrders[idx];
      const tip = Math.max(0, Number(o.tip_amount ?? o.tip ?? 0));
      let isAddon = Boolean(o.is_batch_addon || o.isBatchAddon);
      const bId = String(o.batch_id || "").trim();
      const dropLoc = String(
        o.delivery_location?.building ||
        o.hostel_block ||
        o.delivery_address ||
        o.address ||
        ""
      ).toLowerCase().trim();

      if (idx === 0 && !o.is_batch_addon && !o.isBatchAddon) {
        isAddon = false;
      } else if (bId && seenBatches.has(bId)) {
        isAddon = true;
      } else if (dropLoc && seenDropLocations.has(dropLoc)) {
        isAddon = true;
      } else if (Boolean(o.is_batch_addon || o.isBatchAddon)) {
        isAddon = true;
      } else if (o.is_primary_batch_order === false) {
        isAddon = true;
      } else {
        isAddon = false;
      }

      if (bId) seenBatches.add(bId);
      if (dropLoc) seenDropLocations.add(dropLoc);
      const wage = isAddon ? RIDER_BATCH_ADDON_PAYOUT : RIDER_BASE_PAYOUT;
      totalWages += (o.calculated_payout !== undefined && o.calculated_payout > 0 ? o.calculated_payout : wage + tip);
    }
    canonicalPayoutEarned = Number(totalWages.toFixed(2));
  } else if (typeof parsed.total_payout_earned === "number" && parsed.total_payout_earned > 0) {
    const rawEarned = parsed.total_payout_earned;
    const decimalPart = Number((rawEarned % 1).toFixed(2));
    const isStaleFraction = rawEarned === 12.75 || decimalPart === 0.75 || decimalPart === 0.25 || decimalPart === 0.85 || decimalPart === 0.15;

    if (isStaleFraction) {
      completedCount = Math.max(1, Number(parsed.completed_deliveries || 1));
      canonicalPayoutEarned = Number((completedCount * RIDER_BASE_PAYOUT).toFixed(2));
    } else {
      canonicalPayoutEarned = Number(rawEarned.toFixed(2));
      completedCount = Math.max(
        Number(parsed.completed_deliveries || 0),
        Math.round(canonicalPayoutEarned / RIDER_BASE_PAYOUT),
        1
      );
    }
  } else if (typeof parsed.completed_deliveries === "number" && parsed.completed_deliveries > 0) {
    completedCount = parsed.completed_deliveries;
    canonicalPayoutEarned = Number((completedCount * RIDER_BASE_PAYOUT).toFixed(2));
  } else if (total_cod_collected > 0) {
    completedCount = 1;
    canonicalPayoutEarned = RIDER_BASE_PAYOUT;
  } else {
    completedCount = 0;
    canonicalPayoutEarned = 0;
  }

  const cash_in_hand = Math.max(
    0,
    Number((total_cod_collected - total_remitted).toFixed(2))
  );

  // Net balance: net_balance = total_cash_collected_cod - (earned_wages + rider_tips)
  const net_balance = Number((total_cod_collected - total_remitted - canonicalPayoutEarned).toFixed(2));
  const courier_dues_to_platform = Math.max(0, net_balance);
  const platform_payout_to_courier = net_balance < 0 ? Math.abs(net_balance) : 0;
  const payout_status = platform_payout_to_courier > 0
    ? "Pending Disbursement"
    : courier_dues_to_platform > 0
    ? "Action Required"
    : "Settled";

  const isLocked = courier_dues_to_platform >= MAX_UNREMITTED_CASH_LIMIT;
  const lockout_reason = isLocked
    ? "Cash-in-Hand limit of ₹500 exceeded. Remit pending cash via UPI to unlock order claiming."
    : undefined;
  const excess_amount = isLocked
    ? Math.max(0, Number((courier_dues_to_platform - MAX_UNREMITTED_CASH_LIMIT).toFixed(2)))
    : 0;

  const updatedRecon: RiderCashReconciliation = {
    cash_in_hand,
    total_payout_earned: canonicalPayoutEarned,
    net_cash_due: courier_dues_to_platform,
    net_balance,
    courier_dues_to_platform,
    platform_payout_to_courier,
    payout_status,
    total_cash_collected_cod: total_cod_collected,
    total_cod_collected,
    total_remitted,
    completed_deliveries: completedCount,
    isLocked,
    is_locked: isLocked,
    lockout_reason,
    excess_amount,
    max_limit: MAX_UNREMITTED_CASH_LIMIT,
  };

  // Overwrite stale caches across both keys
  try {
    localStorage.setItem(key1, JSON.stringify(updatedRecon));
    localStorage.setItem(key2, JSON.stringify(updatedRecon));
  } catch (_) {}

  return updatedRecon;
}

export interface CanClaimOrdersResult {
  canClaim: boolean;
  allowed: boolean;
  isLocked: boolean;
  net_cash_due: number;
  reason?: string;
  excess_amount: number;
}

export function canClaimOrders(phone?: string): CanClaimOrdersResult {
  const recon = getRiderCashReconciliation(phone);
  const isLocked = recon.isLocked || recon.net_cash_due >= MAX_UNREMITTED_CASH_LIMIT;
  return {
    canClaim: !isLocked,
    allowed: !isLocked,
    isLocked,
    net_cash_due: recon.net_cash_due,
    reason: isLocked ? recon.lockout_reason : undefined,
    excess_amount: recon.excess_amount ?? 0,
  };
}

export function recordDeliveredOrderCash(
  order: {
    total?: number;
    payment_method?: string;
    tip_amount?: number;
    tip?: number;
    delivery_fee?: number;
    collection_mode?: "upi" | "cash";
    is_batch_addon?: boolean;
    isBatchAddon?: boolean;
    batch_id?: string;
    calculated_payout?: number;
  },
  phone?: string,
  collectionMode?: "upi" | "cash"
): RiderCashReconciliation {
  const current = getRiderCashReconciliation(phone);
  const paymentMethod = String(order.payment_method || "").toLowerCase().trim();
  const isCod =
    paymentMethod.includes("cod") ||
    paymentMethod.includes("cash") ||
    paymentMethod.includes("pay on delivery");

  const mode = collectionMode || order.collection_mode;
  // If collection mode is explicitly UPI, physical cash collected is 0 (direct digital settlement)
  // If collection mode is cash, order total is added to CIH
  // If collection mode is omitted, default to adding cash if isCod is true
  const isPhysicalCash = mode ? mode === "cash" : isCod;
  const orderCash = isPhysicalCash ? Number(order.total || 0) : 0;
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

  const isLocked = net_cash_due >= MAX_UNREMITTED_CASH_LIMIT;
  const lockout_reason = isLocked
    ? "Cash-in-Hand limit of ₹500 exceeded. Remit pending cash via UPI to unlock order claiming."
    : undefined;
  const excess_amount = isLocked
    ? Math.max(0, Number((net_cash_due - MAX_UNREMITTED_CASH_LIMIT).toFixed(2)))
    : 0;

  const updated: RiderCashReconciliation = {
    cash_in_hand,
    total_payout_earned,
    net_cash_due,
    total_cod_collected,
    total_remitted,
    completed_deliveries,
    isLocked,
    is_locked: isLocked,
    lockout_reason,
    excess_amount,
    max_limit: MAX_UNREMITTED_CASH_LIMIT,
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
  amountRemitted?: number,
  _utrRef?: string
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

  const isLocked = net_cash_due >= MAX_UNREMITTED_CASH_LIMIT;
  const lockout_reason = isLocked
    ? "Cash-in-Hand limit of ₹500 exceeded. Remit pending cash via UPI to unlock order claiming."
    : undefined;
  const excess_amount = isLocked
    ? Math.max(0, Number((net_cash_due - MAX_UNREMITTED_CASH_LIMIT).toFixed(2)))
    : 0;

  const updated: RiderCashReconciliation = {
    cash_in_hand,
    total_payout_earned,
    net_cash_due,
    total_cod_collected,
    total_remitted,
    completed_deliveries,
    isLocked,
    is_locked: isLocked,
    lockout_reason,
    excess_amount,
    max_limit: MAX_UNREMITTED_CASH_LIMIT,
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
    let totalPayout =
      data.total_payout_earned ?? (data.earnings || cih.total_payout_earned);

    // Sanitize any stale fractional rates (e.g. 12.75)
    if (typeof totalPayout === "number" && totalPayout > 0 && totalPayout % 1 !== 0) {
      const decimals = Number((totalPayout % 1).toFixed(2));
      if (decimals === 0.75 || decimals === 0.25 || decimals === 0.85 || decimals === 0.15) {
        totalPayout = Math.max(1, Math.round(totalPayout / 15.0)) * RIDER_BASE_PAYOUT;
      }
    }

    const netDue =
      data.net_cash_due !== undefined && data.net_cash_due !== 131.25
        ? Math.max(0, data.net_cash_due)
        : Math.max(0, cashInHand - totalPayout);
    const isLocked = netDue >= MAX_UNREMITTED_CASH_LIMIT;
    const lockout_reason = isLocked
      ? "Cash-in-Hand limit of ₹500 exceeded. Remit pending cash via UPI to unlock order claiming."
      : undefined;
    const excess_amount = isLocked
      ? Math.max(0, Number((netDue - MAX_UNREMITTED_CASH_LIMIT).toFixed(2)))
      : 0;

    return {
      ...data,
      cash_in_hand: cashInHand,
      total_payout_earned: totalPayout,
      net_cash_due: netDue,
      isLocked,
      is_locked: isLocked,
      lockout_reason,
      excess_amount,
      max_limit: MAX_UNREMITTED_CASH_LIMIT,
    };
  } catch (err) {
    const isLocked = cih.net_cash_due >= MAX_UNREMITTED_CASH_LIMIT;
    const lockout_reason = isLocked
      ? "Cash-in-Hand limit of ₹500 exceeded. Remit pending cash via UPI to unlock order claiming."
      : undefined;
    const excess_amount = isLocked
      ? Math.max(0, Number((cih.net_cash_due - MAX_UNREMITTED_CASH_LIMIT).toFixed(2)))
      : 0;

    return {
      phone,
      pending: 0,
      completed: cih.completed_deliveries ?? 0,
      earnings: cih.total_payout_earned,
      rating: 5.0,
      cash_in_hand: cih.cash_in_hand,
      total_payout_earned: cih.total_payout_earned,
      net_cash_due: cih.net_cash_due,
      isLocked,
      is_locked: isLocked,
      lockout_reason,
      excess_amount,
      max_limit: MAX_UNREMITTED_CASH_LIMIT,
      assigned_orders: 0,
      picked_up_orders: 0,
      delivered_today: cih.completed_deliveries ?? 0,
      earnings_today: cih.total_payout_earned,
      total_deliveries: cih.completed_deliveries ?? 0,
      recent_assigned_orders: [],
      is_verified: getDeliveryPartnerSession()?.is_verified,
      verification_status: getDeliveryPartnerSession()?.verification_status,
      is_active: getDeliveryPartnerSession()?.is_active,
      is_on_duty: getDeliveryPartnerSession()?.is_on_duty,
    };
  }
}

/**
 * Checks if an error corresponds to a 404 (Not Found) or missing order.
 */
export function isOrderNotFoundError(err: unknown): boolean {
  if (!err) return false;
  if (typeof err === "object" && err !== null) {
    const status =
      (err as { status?: number; statusCode?: number }).status ??
      (err as { statusCode?: number }).statusCode;
    if (status === 404) return true;
    const msg = String((err as { message?: string }).message || "").toLowerCase();
    if (msg.includes("404") || msg.includes("not found")) return true;
  }
  return false;
}

/**
 * Immediately purges any ghost active run from localStorage, sessionStorage, and in-memory caches,
 * displays an admin removal toast, dispatches synchronization events,
 * and routes the courier cleanly to Available Runs (/courier/runs).
 */
export function purgeGhostActiveRun(orderId?: string): void {
  if (typeof window === "undefined") return;

  try {
    const keysToPurge = [
      "active_run",
      "active_runs",
      "cb_active_run",
      "cb_active_runs",
      "cb_courier_active_runs",
      "cb_active_order",
      "cb_active_order_id",
      "cb_last_order",
      "cb_courier_orders",
      "cb_active_orders",
    ];
    for (const k of keysToPurge) {
      localStorage.removeItem(k);
    }
    sessionStorage.clear();

    const partner = JSON.parse(
      localStorage.getItem("cb_delivery_partner") || "null"
    );
    const phone = partner?.phone;
    if (phone) {
      const phoneKey = `cb_my_deliveries_${phone}`;
      const raw = localStorage.getItem(phoneKey);
      if (raw) {
        try {
          const list = JSON.parse(raw);
          if (Array.isArray(list)) {
            const filtered = orderId
              ? list.filter((o: { _id?: string; id?: string }) => (o._id || o.id) !== orderId)
              : list.filter((o: { status?: string }) => {
                  const s = String(o.status || "").toLowerCase().trim();
                  return s === "delivered" || s === "completed";
                });
            localStorage.setItem(phoneKey, JSON.stringify(filtered));
          }
        } catch {}
      }
    }

    const globalRaw = localStorage.getItem("cb_accepted_deliveries");
    if (globalRaw) {
      try {
        const list = JSON.parse(globalRaw);
        if (Array.isArray(list)) {
          const filtered = orderId
            ? list.filter((o: { _id?: string; id?: string }) => (o._id || o.id) !== orderId)
            : list.filter((o: { status?: string }) => {
                const s = String(o.status || "").toLowerCase().trim();
                return s === "delivered" || s === "completed";
              });
          localStorage.setItem("cb_accepted_deliveries", JSON.stringify(filtered));
        }
      } catch {}
    }

    for (const orderKey of ["cb_orders", "orders"]) {
      const raw = localStorage.getItem(orderKey);
      if (raw) {
        try {
          const list = JSON.parse(raw);
          if (Array.isArray(list) && orderId) {
            const filtered = list.filter((o: { _id?: string; id?: string }) => (o._id || o.id) !== orderId);
            localStorage.setItem(orderKey, JSON.stringify(filtered));
          }
        } catch {}
      }
    }

    if (orderId) {
      removeInMemoryOrder(orderId);
    }

    toast.error("This order was removed or cancelled by Admin.");
    window.dispatchEvent(new Event("delivery_state_changed"));
    window.dispatchEvent(
      new CustomEvent("order_purged", { detail: { orderId } })
    );

    // Route cleanly to Available Runs tab
    setTimeout(() => {
      window.location.href = "/courier/runs";
    }, 350);
  } catch (e) {
    console.error("Failed to purge ghost active run:", e);
  }
}

/**
 * Forces a cache flush of any local/session stored runs and synchronizes
 * directly with backend active run endpoints.
 * If backend returns 404 or active_run is null/empty, clears local ghost runs
 * and triggers navigation to Available Runs.
 */
export async function syncCourierActiveRuns(): Promise<{
  active_run: DeliveryDashboardOrder | null;
  orders: DeliveryDashboardOrder[];
  status: string;
}> {
  if (typeof window === "undefined") {
    return { active_run: null, orders: [], status: "idle" };
  }

  // 1. Force flush local cached run keys & sessionStorage
  const keysToPurge = [
    "active_run",
    "active_runs",
    "cb_active_run",
    "cb_active_runs",
    "cb_courier_active_runs",
    "cb_active_order",
    "cb_active_order_id",
    "cb_last_order",
    "cb_courier_orders",
    "cb_active_orders",
  ];
  for (const k of keysToPurge) {
    try {
      localStorage.removeItem(k);
    } catch {}
  }
  try {
    sessionStorage.clear();
  } catch {}

  try {
    const res = await authJson<{
      active_run?: DeliveryDashboardOrder | null;
      orders?: DeliveryDashboardOrder[];
      status?: string;
      success?: boolean;
    }>("/delivery-dashboard/active-run", {
      role: "delivery_partner",
      redirectOnAuthError: false,
    });

    const activeRun = res?.active_run || null;
    const orders = Array.isArray(res?.orders)
      ? res.orders
      : (activeRun ? [activeRun] : []);

    if (!activeRun || orders.length === 0) {
      const partner = JSON.parse(
        localStorage.getItem("cb_delivery_partner") || "null"
      );
      const phone = partner?.phone;
      if (phone) {
        localStorage.removeItem(`cb_my_deliveries_${phone}`);
      }
      localStorage.removeItem("cb_accepted_deliveries");
      localStorage.removeItem("active_run");
      sessionStorage.clear();

      window.dispatchEvent(new Event("delivery_state_changed"));
      window.dispatchEvent(new CustomEvent("order_purged", { detail: {} }));
      toast.info("Sync complete: No active runs assigned.");
      return { active_run: null, orders: [], status: "idle" };
    }

    localStorage.setItem("active_run", JSON.stringify(activeRun));
    window.dispatchEvent(new Event("delivery_state_changed"));
    toast.success("Active runs synchronized successfully!");
    return {
      active_run: activeRun,
      orders,
      status: res?.status || activeRun.status || "assigned",
    };
  } catch (err) {
    if (isOrderNotFoundError(err)) {
      purgeGhostActiveRun();
      return { active_run: null, orders: [], status: "idle" };
    }

    try {
      const courierRes = await authJson<{
        success?: boolean;
        orders?: DeliveryDashboardOrder[];
        active_run?: DeliveryDashboardOrder | null;
      }>("/courier/orders/active", {
        role: "delivery_partner",
        redirectOnAuthError: false,
      });

      const orders = Array.isArray(courierRes?.orders) ? courierRes.orders : [];
      const activeRun = courierRes?.active_run || (orders.length > 0 ? orders[0] : null);

      if (!activeRun || orders.length === 0) {
        localStorage.removeItem("active_run");
        sessionStorage.clear();
        window.dispatchEvent(new Event("delivery_state_changed"));
        window.dispatchEvent(new CustomEvent("order_purged", { detail: {} }));
        toast.info("Sync complete: No active runs found.");
        return { active_run: null, orders: [], status: "idle" };
      }

      localStorage.setItem("active_run", JSON.stringify(activeRun));
      window.dispatchEvent(new Event("delivery_state_changed"));
      toast.success("Active runs synchronized successfully!");
      return {
        active_run: activeRun,
        orders,
        status: activeRun.status || "assigned",
      };
    } catch {
      localStorage.removeItem("active_run");
      sessionStorage.clear();
      window.dispatchEvent(new Event("delivery_state_changed"));
      return { active_run: null, orders: [], status: "idle" };
    }
  }
}

