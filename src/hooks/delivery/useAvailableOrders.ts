"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { paginatedItems } from "@/lib/pagination";
import { getDeliveryPartnerSession } from "@/lib/authTokens";
import { ROUTES } from "@/lib/routes";
import {
  getAvailableOrders,
  acceptDelivery,
  type AvailableOrdersQuery,
} from "@/services/deliveryService";
import { getRiderCashReconciliation } from "@/services/deliveryPartnerService";
import { AuthHttpError } from "@/services/authFetch";
import { getDirectionsUrl } from "@/lib/geolocation";

export type AvailableOrder = {
  _id: string;
  restaurant_email?: string;
  restaurant_name?: string;
  customer_name?: string;
  phone?: string;
  address?: string;
  total?: number;
  food_subtotal?: number;
  subtotal?: number;
  payment_method?: string;
  payment_status?: string;
  status?: string;
  distance?: string | number | null;
  created_at?: string;
  latitude?: number | null;
  longitude?: number | null;
  special_instructions?: string;
  notes?: string;
  runner_fee?: number;
  is_batch_addon?: boolean;
  isBatchAddon?: boolean;
  batch_id?: string;
  calculated_payout?: number;
  tip_amount?: number;
  tip?: number;
  items?: Array<{
    id?: string | number;
    name?: string;
    quantity?: number;
    price?: number;
  }>;
};

export function useAvailableOrders() {
  const [orders, setOrders] = useState<AvailableOrder[]>([]);
  const [restaurantOptions, setRestaurantOptions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [q, setQ] = useState("");
  const [restaurant, setRestaurant] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");

  const filtersRef = useRef({ q, restaurant, paymentMethod, page });

  useEffect(() => {
    filtersRef.current = { q, restaurant, paymentMethod, page };
  }, [q, restaurant, paymentMethod, page]);

  function currentFilters(
    overrides: Partial<AvailableOrdersQuery> = {}
  ): AvailableOrdersQuery {
    const latest = filtersRef.current;
    return {
      q: (overrides.q ?? latest.q).trim() || undefined,
      restaurant:
        (overrides.restaurant ?? latest.restaurant).trim() || undefined,
      payment_method:
        (overrides.payment_method ?? latest.paymentMethod) || undefined,
      page: overrides.page ?? latest.page,
      limit: 20,
    };
  }

  async function loadOrders(
    filters: AvailableOrdersQuery = currentFilters(),
    options: { showLoading?: boolean } = {}
  ) {
    if (options.showLoading) {
      setLoading(true);
    }

    try {
      const data = await getAvailableOrders(filters);
      const items = paginatedItems<AvailableOrder>(data);
      setOrders(items);
      setPage(data.page);
      setPages(data.pages);
      setTotal(data.total);
      setRestaurantOptions((prev) => {
        const next = new Set(prev);
        for (const order of items) {
          if (order.restaurant_email) next.add(order.restaurant_email);
        }
        return Array.from(next).sort();
      });
      setError("");
    } catch (err) {
      console.error(err);
      if (err instanceof AuthHttpError && err.status === 401) return;
      setError(
        err instanceof Error ? err.message : "Unable to load available orders"
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadOrders(currentFilters(), { showLoading: true });
  }, []);

  async function handleAccept(
    orderId: string,
    options?: { silentToast?: boolean }
  ): Promise<boolean> {
    try {
      const partner = getDeliveryPartnerSession();

      if (!partner) {
        toast.error("Please log in as a delivery partner.");
        window.location.assign(ROUTES.DELIVERY_LOGIN);
        return false;
      }

      // 🛑 Live Cash-in-Hand (CIH) Reconciliation COD Limit Guard
      const recon = getRiderCashReconciliation(partner.phone);
      const currentDue = recon?.net_cash_due ?? 0;
      const MAX_COD_LIMIT = 500;

      // Allow claim if net dues are below limit
      if (currentDue >= MAX_COD_LIMIT) {
        toast.error(
          "Cash-in-Hand limit of ₹500 exceeded. Remit pending cash via UPI to unlock order claiming."
        );
        return false;
      }

      setAcceptingId(orderId);

      await acceptDelivery(orderId, {
        name: partner.name,
        phone: partner.phone,
        vehicle: partner.vehicle || "Bike",
      });

      if (!options?.silentToast) {
        toast.success("Delivery accepted", {
          description: "The order is now assigned to your active manifest.",
        });
      }

      await loadOrders(currentFilters());

      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("delivery_state_changed"));
      }
      return true;
    } catch (err) {
      console.error(err);
      if (err instanceof AuthHttpError && err.status === 401) return false;

      const msg = err instanceof Error ? err.message : "Failed to accept order";
      const partner = getDeliveryPartnerSession();

      // Check if this was a false-positive / stale limit error from backend
      if (
        (msg.toLowerCase().includes("limit") ||
          msg.toLowerCase().includes("cod") ||
          msg.toLowerCase().includes("cash-in-hand")) &&
        partner?.phone
      ) {
        const latestRecon = getRiderCashReconciliation(partner.phone);
        const currentDue = latestRecon?.net_cash_due ?? 0;
        if (currentDue < 500) {
          await loadOrders(currentFilters());
          if (typeof window !== "undefined") {
            window.dispatchEvent(new Event("delivery_state_changed"));
          }
          if (!options?.silentToast) {
            toast.success("Delivery accepted", {
              description: "The order is now assigned to your active manifest.",
            });
          }
          return true;
        }
      }

      toast.error(msg);
      return false;
    } finally {
      setAcceptingId(null);
    }
  }

  function openNavigation(order: AvailableOrder) {
    const url = getDirectionsUrl(
      order.latitude,
      order.longitude,
      order.address
    );
    window.open(url, "_blank");
  }

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    void loadOrders(currentFilters({ page: 1 }), { showLoading: true });
  }

  return {
    orders,
    restaurantOptions,
    loading,
    error,
    acceptingId,
    page,
    setPage,
    pages,
    total,
    q,
    setQ,
    restaurant,
    setRestaurant,
    paymentMethod,
    setPaymentMethod,
    loadOrders,
    currentFilters,
    handleAccept,
    openNavigation,
    handleSearchSubmit,
  };
}
