import { authJson, publicJson } from "@/services/authFetch";
import { asPaginated, type Paginated } from "@/lib/pagination";
import { withQuery } from "@/lib/formatters";
import { getAllInMemoryOrders } from "@/lib/inMemoryOrders";
import type {
  BackendMenuItem,
  BackendRestaurant,
  CanteenDailySettlement,
  Order,
  RestaurantsQuery,
} from "@/types";

export type {
  BackendMenuItem,
  BackendRestaurant,
  CanteenDailySettlement,
  RestaurantsQuery,
};

export interface RestaurantSettlementOverview {
  today: CanteenDailySettlement;
  history: CanteenDailySettlement[];
  liveOrders: Order[];
}

export async function getRestaurantsPage(
  filters: RestaurantsQuery = {}
): Promise<Paginated<BackendRestaurant>> {
  const path = withQuery("/restaurants/", {
    page: filters.page ?? 1,
    limit: filters.limit ?? 20,
    q: filters.q,
    category: filters.category,
    email: filters.email,
    slug: filters.slug,
    include_menu: filters.include_menu,
    only_verified: filters.only_verified,
  });

  const data = await publicJson<unknown>(path, { cache: "no-store" });
  return asPaginated<BackendRestaurant>(data);
}

/**
 * Convenience: first page items (legacy callers).
 */
export async function getRestaurants(
  filters: RestaurantsQuery = {}
): Promise<BackendRestaurant[]> {
  const page = await getRestaurantsPage({
    page: filters.page ?? 1,
    limit: filters.limit ?? 50,
    q: filters.q,
    category: filters.category,
    email: filters.email,
    slug: filters.slug,
    include_menu: filters.include_menu,
    only_verified: filters.only_verified,
  });

  return page.items;
}

export async function getRestaurantBySlug(
  slug: string
): Promise<BackendRestaurant | null> {
  const cleanSlug = (slug || "").trim();
  if (!cleanSlug) return null;

  const page = await getRestaurantsPage({
    slug: cleanSlug,
    page: 1,
    limit: 1,
    include_menu: true,
  });

  if (page.items[0]) {
    return page.items[0];
  }

  // Fallback: If slug is an ID or not matched by slug parameter, try getRestaurantById
  return await getRestaurantById(cleanSlug);
}

export async function getRestaurantById(
  id: string
): Promise<BackendRestaurant | null> {
  if (!id?.trim()) return null;

  try {
    return await publicJson<BackendRestaurant>(
      `/restaurants/${encodeURIComponent(id.trim())}?include_menu=true`,
      { cache: "no-store" }
    );
  } catch {
    return null;
  }
}

export async function getRestaurantByEmail(
  email: string
): Promise<BackendRestaurant | null> {
  const clean = (email || "").trim().toLowerCase();
  if (!clean) return null;

  try {
    const page = await getRestaurantsPage({
      email: clean,
      page: 1,
      limit: 1,
      include_menu: true,
      only_verified: false,
    });

    const matching = page.items.find(
      (item) =>
        (item.email || "").toLowerCase() === clean ||
        ((item as { owner_email?: string }).owner_email || "").toLowerCase() === clean
    );
    return matching || null;
  } catch {
    return null;
  }
}

export type RegisterRestaurantOwnerInput = {
  owner_name: string;
  restaurant_name: string;
  email: string;
  phone: string;
  password: string;
  restaurant_type: string;
  address: string;
  city: string;
  pincode: string;
};

export async function registerRestaurantOwner(
  data: RegisterRestaurantOwnerInput
) {
  return publicJson<{ message?: string; restaurant_owner?: unknown }>(
    "/restaurant-owner/register",
    {
      method: "POST",
      body: JSON.stringify(data),
    }
  );
}

/**
 * Fetches today's live settlement tally and historical settlement ledger for a restaurant partner.
 */
export async function getRestaurantSettlements(
  restaurantEmailOrId: string,
  targetDate?: string
): Promise<RestaurantSettlementOverview> {
  const cleanEmail = (restaurantEmailOrId || "").trim().toLowerCase();
  const dateStr = targetDate || new Date().toISOString().split("T")[0];

  // 1. Fetch restaurant info
  let restaurant: BackendRestaurant | null = null;
  try {
    restaurant = await getRestaurantByEmail(cleanEmail);
  } catch (_) {}

  if (!restaurant && typeof window !== "undefined") {
    try {
      const storedOwner = localStorage.getItem("restaurantOwner");
      if (storedOwner) {
        const parsed = JSON.parse(storedOwner);
        if (parsed?.name) {
          restaurant = { name: parsed.name, email: parsed.email || cleanEmail } as BackendRestaurant;
        }
      }
    } catch (_) {}
  }

  let restaurantName =
    restaurant?.name ||
    (cleanEmail
      ? cleanEmail
          .split("@")[0]
          .replace(/[._-]/g, " ")
          .replace(/\b\w/g, (c) => c.toUpperCase())
      : "Campus Canteen");

  const cleanSlug = (restaurant?.slug || restaurant?.name || "canteen")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
  const upiId =
    (restaurant as { upi_id?: string })?.upi_id ||
    `${cleanSlug}.orders@okaxis`;

  // 2. Fetch settled records from backend with local storage fallback
  const settledList: CanteenDailySettlement[] = [];
  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem("cb_canteen_settlements");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          settledList.push(
            ...parsed.filter(
              (s: CanteenDailySettlement) =>
                (s.restaurant_email || "").toLowerCase() === cleanEmail ||
                (s.restaurant_name || "").toLowerCase() ===
                  restaurantName.toLowerCase()
            )
          );
        }
      }
    } catch (_) {}
  }

  try {
    const isEmail = cleanEmail.includes("@");
    const queryParams: Record<string, string> = {};
    if (isEmail) {
      queryParams.restaurant_email = cleanEmail;
    } else if (cleanEmail) {
      queryParams.restaurant_id = cleanEmail;
    }
    if (targetDate) {
      queryParams.date = targetDate;
    }

    let res: { settlements: CanteenDailySettlement[] } | null = null;
    try {
      res = await authJson<{ settlements: CanteenDailySettlement[] }>(
        withQuery("/restaurants/settlements", queryParams),
        { role: "restaurant_owner", cache: "no-store" }
      );
    } catch (_) {
      res = await authJson<{ settlements: CanteenDailySettlement[] }>(
        withQuery("/restaurant/settlements", queryParams),
        { role: "restaurant_owner", cache: "no-store" }
      );
    }

    if (res?.settlements && Array.isArray(res.settlements)) {
      for (const s of res.settlements) {
        if (!settledList.some((x) => x.settlement_date === s.settlement_date)) {
          settledList.push(s);
        }
      }
    }

    try {
      const todayRemote = await authJson<CanteenDailySettlement>(
        withQuery("/restaurant/settlements/today", queryParams),
        { role: "restaurant_owner", cache: "no-store" }
      );
      if (todayRemote && (todayRemote.status?.toLowerCase() === "paid" || todayRemote.status?.toLowerCase() === "settled" || todayRemote.is_settled)) {
        const d = todayRemote.settlement_date || todayRemote.date || dateStr;
        const existingIdx = settledList.findIndex((x) => x.settlement_date === d || x.date === d);
        if (existingIdx >= 0) {
          settledList[existingIdx] = { ...settledList[existingIdx], ...todayRemote, settlement_date: d };
        } else {
          settledList.push({ ...todayRemote, settlement_date: d });
        }
      }
    } catch (_) {}
  } catch (_) {
    // Non-blocking fallback
  }

  // 3. Gather delivered orders for this restaurant
  const allDeliveredOrders: Order[] = [];

  // 3a. Read in-memory orders
  try {
    const memOrders = getAllInMemoryOrders();
    for (const o of memOrders) {
      const matchEmail =
        (o.restaurant_email || "").toLowerCase().trim() === cleanEmail;
      const matchName =
        (o.restaurant_name || "").toLowerCase().trim() ===
        restaurantName.toLowerCase().trim();
      const isDelivered = ["delivered", "completed"].includes(
        String(o.status || "").toLowerCase().trim()
      );
      if ((matchEmail || matchName) && isDelivered) {
        if (o.restaurant_name && (restaurantName === "Campus Canteen" || restaurantName === "Taj")) {
          restaurantName = o.restaurant_name;
        }
        allDeliveredOrders.push(o as unknown as Order);
      }
    }
  } catch (_) {}

  // 3b. Read localStorage orders
  if (typeof window !== "undefined") {
    try {
      const rawKeys = ["cb_orders", "orders"];
      for (const key of rawKeys) {
        const raw = localStorage.getItem(key);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            for (const o of parsed) {
              const matchEmail =
                (o.restaurant_email || "").toLowerCase().trim() === cleanEmail;
              const matchName =
                (o.restaurant_name || "").toLowerCase().trim() ===
                restaurantName.toLowerCase().trim();
              const isDelivered = ["delivered", "completed"].includes(
                String(o.status || "").toLowerCase().trim()
              );
              if (
                (matchEmail || matchName) &&
                isDelivered &&
                !allDeliveredOrders.some((x) => x._id === o._id)
              ) {
                if (o.restaurant_name && (restaurantName === "Campus Canteen" || restaurantName === "Taj")) {
                  restaurantName = o.restaurant_name;
                }
                allDeliveredOrders.push(o);
              }
            }
          }
        }
      }
    } catch (_) {}
  }

  // 3c. Try remote restaurant orders endpoint
  try {
    const remoteOrders = await authJson<Order[]>(
      `/orders/restaurant/${encodeURIComponent(cleanEmail)}?limit=100`,
      { role: "restaurant_owner", cache: "no-store" }
    );
    if (Array.isArray(remoteOrders)) {
      for (const o of remoteOrders) {
        const isDelivered = ["delivered", "completed"].includes(
          String(o.status || "").toLowerCase().trim()
        );
        if (isDelivered && !allDeliveredOrders.some((x) => x._id === o._id)) {
          allDeliveredOrders.push(o);
        }
      }
    }
  } catch (_) {}

  // 4. Calculate today's orders tally
  const todayDeliveredOrders = allDeliveredOrders.filter((o) => {
    const d = o.created_at || (o as { delivered_at?: string }).delivered_at || "";
    return d.startsWith(dateStr) || !d;
  });

  let todayGrossFoodSales = 0;
  let todayCommission = 0;

  for (const o of todayDeliveredOrders) {
    let subtotal = 0;
    if (Array.isArray(o.items) && o.items.length > 0) {
      subtotal = o.items.reduce(
        (sum, item) =>
          sum +
          (Number(item.price) || 0) * (Number(item.quantity) || 1),
        0
      );
    } else {
      const orderExt = o as { food_subtotal?: number; subtotal?: number; total?: number };
      subtotal = Number(orderExt.food_subtotal || orderExt.subtotal || o.total || 0);
    }
    todayGrossFoodSales += subtotal;

    const orderExt = o as { commission_amount?: number };
    const comm = Number(orderExt.commission_amount ?? (subtotal * 0.18));
    todayCommission += comm;
  }

  todayGrossFoodSales = Number(todayGrossFoodSales.toFixed(2));
  todayCommission = Number(todayCommission.toFixed(2));
  const todayGst = Number((0.05 * todayGrossFoodSales).toFixed(2));
  const todayNetPayable = Math.max(
    0,
    Number((todayGrossFoodSales + todayGst - todayCommission).toFixed(2))
  );

  const settledToday = settledList.find((s) => s.settlement_date === dateStr || s.date === dateStr);

  const isTodayPaid =
    settledToday?.status?.toLowerCase() === "paid" ||
    settledToday?.status?.toLowerCase() === "settled" ||
    settledToday?.is_settled === true;

  const todaySettlement: CanteenDailySettlement = settledToday
    ? {
        ...settledToday,
        gross_sales: settledToday.gross_sales ?? settledToday.gross_food_sales ?? todayGrossFoodSales,
        gst: settledToday.gst ?? settledToday.gst_amount ?? todayGst,
        gst_amount: settledToday.gst_amount ?? settledToday.gst ?? todayGst,
        commission: settledToday.commission ?? settledToday.commission_deducted ?? todayCommission,
        commission_deducted: settledToday.commission_deducted ?? settledToday.commission ?? todayCommission,
        net_payable_subtotal: settledToday.net_payable_subtotal || todayNetPayable,
        net_disbursed: settledToday.net_payable_subtotal || todayNetPayable,
        status: settledToday.status || (isTodayPaid ? "paid" : "Pending"),
        is_settled: isTodayPaid,
        utr_number: settledToday.utr_number ?? settledToday.transaction_ref,
      }
    : {
        restaurant_email: cleanEmail,
        restaurant_name: restaurantName,
        upi_id: upiId,
        orders_count: todayDeliveredOrders.length,
        gross_food_sales: todayGrossFoodSales,
        gross_sales: todayGrossFoodSales,
        commission_deducted: todayCommission,
        commission: todayCommission,
        gst_amount: todayGst,
        gst: todayGst,
        net_payable_subtotal: todayNetPayable,
        net_disbursed: todayNetPayable,
        status: "Pending",
        is_settled: false,
        settlement_date: dateStr,
      };

  // 5. Build historical ledger
  const historyMap = new Map<string, CanteenDailySettlement>();
  for (const s of settledList) {
    const isPaid = s.status?.toLowerCase() === "paid" || s.status?.toLowerCase() === "settled" || s.is_settled;
    historyMap.set(s.settlement_date, {
      ...s,
      gross_sales: s.gross_sales ?? s.gross_food_sales,
      gst: s.gst ?? s.gst_amount ?? Number((0.05 * s.gross_food_sales).toFixed(2)),
      gst_amount: s.gst_amount ?? s.gst ?? Number((0.05 * s.gross_food_sales).toFixed(2)),
      commission: s.commission ?? s.commission_deducted,
      commission_deducted: s.commission_deducted ?? s.commission,
      status: s.status || (isPaid ? "paid" : "Pending"),
      is_settled: isPaid,
      utr_number: s.utr_number ?? s.transaction_ref,
      net_disbursed: s.net_payable_subtotal,
    });
  }

  // Include today in history list only if today had delivered orders or was recorded in settlements
  if (settledToday || todayDeliveredOrders.length > 0) {
    if (!historyMap.has(dateStr)) {
      historyMap.set(dateStr, todaySettlement);
    }
  }

  const history = Array.from(historyMap.values()).sort(
    (a, b) =>
      new Date(b.settlement_date).getTime() -
      new Date(a.settlement_date).getTime()
  );

  return {
    today: todaySettlement,
    history,
    liveOrders: todayDeliveredOrders,
  };
}