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
  const key = phone ? `cb_cih_${phone}` : "cb_cih_default";
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      const total_cod_collected = Number(
        parsed.total_cod_collected ?? parsed.cash_in_hand ?? 0
      );
      const total_remitted = Number(parsed.total_remitted ?? 0);
      const completed_deliveries = Number(parsed.completed_deliveries ?? 0);
      const total_payout_earned = Number(
        parsed.total_payout_earned ??
          (completed_deliveries > 0
            ? completed_deliveries * RIDER_BASE_PAYOUT
            : 0)
      );
      const cash_in_hand = Math.max(
        0,
        Number((total_cod_collected - total_remitted).toFixed(2))
      );
      // Canonical net_cash_due = Math.max(0, total_cod_collected - total_payout_earned - total_remitted)
      const net_cash_due = Math.max(
        0,
        Number(
          (total_cod_collected - total_payout_earned - total_remitted).toFixed(2)
        )
      );
      return {
        cash_in_hand,
        total_payout_earned,
        net_cash_due,
        total_cod_collected,
        total_remitted,
        completed_deliveries,
      };
    }
  } catch (_) {}
  return {
    cash_in_hand: 0,
    total_payout_earned: 0,
    net_cash_due: 0,
    total_cod_collected: 0,
    total_remitted: 0,
    completed_deliveries: 0,
  };
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

