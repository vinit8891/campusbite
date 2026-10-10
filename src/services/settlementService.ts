import { authJson } from "./authFetch";
import { withQuery } from "@/lib/formatters";
import type { CanteenDailySettlement } from "@/types";
import {
  getRestaurantSettlements,
  type RestaurantSettlementOverview,
} from "./restaurantService";
import {
  recordCanteenSettlementAdmin,
  getCanteenSettlementsAdmin,
} from "./adminService";

export {
  getRestaurantSettlements,
  type RestaurantSettlementOverview,
  recordCanteenSettlementAdmin,
  getCanteenSettlementsAdmin,
};

/**
 * Fetches daily settlement records for a restaurant/canteen.
 * Supports both /restaurants/settlements and /restaurant/settlements seamlessly.
 */
export async function fetchSettlementList(params?: {
  restaurant_id?: string;
  restaurant_email?: string;
  date?: string;
}): Promise<CanteenDailySettlement[]> {
  const queryParams: Record<string, string> = {};
  if (params?.restaurant_id) queryParams.restaurant_id = params.restaurant_id;
  if (params?.restaurant_email) queryParams.restaurant_email = params.restaurant_email;
  if (params?.date) queryParams.date = params.date;

  try {
    const res = await authJson<{ settlements: CanteenDailySettlement[] }>(
      withQuery("/restaurants/settlements", queryParams),
      { role: "restaurant_owner", cache: "no-store" }
    );
    return res?.settlements || [];
  } catch {
    try {
      const res = await authJson<{ settlements: CanteenDailySettlement[] }>(
        withQuery("/restaurant/settlements", queryParams),
        { role: "restaurant_owner", cache: "no-store" }
      );
      return res?.settlements || [];
    } catch {
      return [];
    }
  }
}

/**
 * Fetches today's live settlement accruals for a canteen.
 */
export async function getRestaurantTodaySettlement(params?: {
  restaurant_id?: string;
  restaurant_email?: string;
  date?: string;
}): Promise<CanteenDailySettlement | null> {
  const queryParams: Record<string, string> = {};
  if (params?.restaurant_id) queryParams.restaurant_id = params.restaurant_id;
  if (params?.restaurant_email) queryParams.restaurant_email = params.restaurant_email;
  if (params?.date) queryParams.date = params.date;

  try {
    return await authJson<CanteenDailySettlement>(
      withQuery("/restaurants/settlements/today", queryParams),
      { role: "restaurant_owner", cache: "no-store" }
    );
  } catch {
    try {
      return await authJson<CanteenDailySettlement>(
        withQuery("/restaurant/settlements/today", queryParams),
        { role: "restaurant_owner", cache: "no-store" }
      );
    } catch {
      return null;
    }
  }
}
