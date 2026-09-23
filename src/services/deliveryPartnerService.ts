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

export function getRiderCashReconciliation(phone?: string): RiderCashReconciliation {
  if (typeof window === "undefined") {
    return { cash_in_hand: 0, total_payout_earned: 0, net_cash_due: 0 };
  }
  const key = phone ? `cb_cih_${phone}` : "cb_cih_default";
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      const cash_in_hand = Number(parsed.cash_in_hand || 0);
      const total_payout_earned = Number(parsed.total_payout_earned || 0);
      const net_cash_due = Number((cash_in_hand - total_payout_earned).toFixed(2));
      return { cash_in_hand, total_payout_earned, net_cash_due };
    }
  } catch (_) {}
  return { cash_in_hand: 0, total_payout_earned: 0, net_cash_due: 0 };
}

export function recordDeliveredOrderCash(
  order: { total?: number; payment_method?: string; tip_amount?: number },
  phone?: string
): RiderCashReconciliation {
  const current = getRiderCashReconciliation(phone);
  const paymentMethod = String(order.payment_method || "").toLowerCase().trim();
  const isCod = paymentMethod.includes("cod") || paymentMethod.includes("cash");

  const orderCash = isCod ? Number(order.total || 0) : 0;
  const payout = RIDER_BASE_PAYOUT + Number(order.tip_amount || 0);

  const updated: RiderCashReconciliation = {
    cash_in_hand: Number((current.cash_in_hand + orderCash).toFixed(2)),
    total_payout_earned: Number((current.total_payout_earned + payout).toFixed(2)),
    net_cash_due: Number(((current.cash_in_hand + orderCash) - (current.total_payout_earned + payout)).toFixed(2)),
  };

  if (typeof window !== "undefined") {
    const key = phone ? `cb_cih_${phone}` : "cb_cih_default";
    try {
      localStorage.setItem(key, JSON.stringify(updated));
    } catch (_) {}
  }

  return updated;
}

export function remitRiderDues(
  phone?: string,
  amountRemitted?: number
): RiderCashReconciliation {
  const current = getRiderCashReconciliation(phone);
  const remitted = amountRemitted !== undefined ? amountRemitted : Math.max(0, current.net_cash_due);
  const updated: RiderCashReconciliation = {
    cash_in_hand: Math.max(0, Number((current.cash_in_hand - remitted).toFixed(2))),
    total_payout_earned: current.total_payout_earned,
    net_cash_due: Number((Math.max(0, current.cash_in_hand - remitted) - current.total_payout_earned).toFixed(2)),
  };

  if (typeof window !== "undefined") {
    const key = phone ? `cb_cih_${phone}` : "cb_cih_default";
    try {
      localStorage.setItem(key, JSON.stringify(updated));
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

    return {
      ...data,
      cash_in_hand: data.cash_in_hand ?? cih.cash_in_hand,
      total_payout_earned: data.total_payout_earned ?? (data.earnings || cih.total_payout_earned),
      net_cash_due: data.net_cash_due ?? Number(((data.cash_in_hand ?? cih.cash_in_hand) - (data.total_payout_earned ?? (data.earnings || cih.total_payout_earned))).toFixed(2)),
    };
  } catch (err) {
    return {
      phone,
      pending: 0,
      completed: 0,
      earnings: cih.total_payout_earned,
      rating: 5.0,
      cash_in_hand: cih.cash_in_hand,
      total_payout_earned: cih.total_payout_earned,
      net_cash_due: cih.net_cash_due,
      assigned_orders: 0,
      picked_up_orders: 0,
      delivered_today: 0,
      earnings_today: 0,
      total_deliveries: 0,
      recent_assigned_orders: [],
    };
  }
}
