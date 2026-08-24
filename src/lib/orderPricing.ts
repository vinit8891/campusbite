/**
 * Canonical pricing, statutory GST, and fee calculations for CampusBite orders.
 */

export const FOOD_GST_RATE = 0.05;
export const PLATFORM_FEE_LOW = 3.00;
export const PLATFORM_FEE_HIGH = 5.00;
export const DELIVERY_FEE_HOSTEL_BATCH = 15.00;
export const DELIVERY_FEE_STANDARD = 40.00;
export const BUDGET_MEAL_COMMISSION_RATE = 0.05;
export const STANDARD_COMMISSION_RATE = 0.10;
export const ONLINE_PG_FEE_RATE = 0.0236;
export const DELIVERY_PARTNER_SHARE_RATE = 0.85;

export type DeliveryType = "HOSTEL_BATCH" | "STANDARD";

export interface PricingItem {
  price: number;
  quantity: number;
  is_budget_meal?: boolean;
}

export interface OrderPricingBreakdown {
  food_subtotal: number;
  restaurant_gst: number;
  platform_fee: number;
  platform_fee_base: number;
  platform_fee_gst: number;
  delivery_fee: number;
  delivery_type: DeliveryType;
  tip_amount: number;
  total_payable: number;
  commission_amount: number;
  pg_fee: number;
  net_restaurant_payout: number;
  delivery_partner_earning: number;
  net_platform_profit: number;
}

/**
 * Calculates complete order pricing including statutory GST, platform tech fee,
 * batch/standard delivery fees, rider tips, and partner splits.
 */
export function calculateOrderPricing(
  items: PricingItem[],
  deliveryType: DeliveryType = "HOSTEL_BATCH",
  tipAmount: number = 0,
  paymentMethod: string = "COD"
): OrderPricingBreakdown {
  const food_subtotal = Number(
    items
      .reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0), 0)
      .toFixed(2)
  );

  // 5% Restaurant GST
  const restaurant_gst = Number((FOOD_GST_RATE * food_subtotal).toFixed(2));

  // Platform Tech Fee: ₹3 if subtotal <= 100 else ₹5
  const platform_fee = food_subtotal > 0 && food_subtotal <= 100.0 ? PLATFORM_FEE_LOW : (food_subtotal > 0 ? PLATFORM_FEE_HIGH : 0);
  const platform_fee_base = Number((platform_fee / 1.18).toFixed(2));
  const platform_fee_gst = Number((platform_fee - platform_fee_base).toFixed(2));

  // Delivery Fee
  const isBatch = deliveryType === "HOSTEL_BATCH";
  const delivery_fee = food_subtotal > 0 ? (isBatch ? DELIVERY_FEE_HOSTEL_BATCH : DELIVERY_FEE_STANDARD) : 0;

  const valid_tip = Number(Math.max(0, Number(tipAmount || 0)).toFixed(2));

  const total_payable = Number(
    (food_subtotal + restaurant_gst + delivery_fee + platform_fee + valid_tip).toFixed(2)
  );

  // Commission splits
  const commission_amount = Number(
    items
      .reduce((sum, item) => {
        const itemTotal = Number(item.price || 0) * Number(item.quantity || 0);
        const rate = item.is_budget_meal ? BUDGET_MEAL_COMMISSION_RATE : STANDARD_COMMISSION_RATE;
        return sum + itemTotal * rate;
      }, 0)
      .toFixed(2)
  );

  const isOnline = ["online", "online_payment", "razorpay"].includes(
    String(paymentMethod || "").trim().toLowerCase()
  );
  const pg_fee = isOnline ? Number((ONLINE_PG_FEE_RATE * total_payable).toFixed(2)) : 0;

  const net_restaurant_payout = Number(
    (food_subtotal + restaurant_gst - commission_amount).toFixed(2)
  );

  const delivery_partner_earning = Number(
    (Number((delivery_fee * DELIVERY_PARTNER_SHARE_RATE).toFixed(2)) + valid_tip).toFixed(2)
  );

  const net_platform_profit = Number(
    (
      commission_amount +
      platform_fee +
      (delivery_fee - delivery_partner_earning) -
      pg_fee
    ).toFixed(2)
  );

  return {
    food_subtotal,
    restaurant_gst,
    platform_fee,
    platform_fee_base,
    platform_fee_gst,
    delivery_fee,
    delivery_type: deliveryType,
    tip_amount: valid_tip,
    total_payable,
    commission_amount,
    pg_fee,
    net_restaurant_payout,
    delivery_partner_earning,
    net_platform_profit,
  };
}
