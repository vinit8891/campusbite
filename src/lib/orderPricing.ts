/**
 * Canonical pricing, statutory GST, and fee calculations for CampusBite orders.
 */

export const FOOD_GST_RATE = 0.05;
export const PLATFORM_FEE_STANDARD = 3.00; // Carts >= ₹50
export const PLATFORM_FEE_SMALL_CART = 5.00; // Carts < ₹50
export const SMALL_CART_THRESHOLD = 50.00;
export const MIN_DELIVERY_SUBTOTAL = 35.00;

export const PLATFORM_FEE_TAKEAWAY = 3.00;
export const PLATFORM_FEE_DELIVERY = 5.00;
export const PLATFORM_FEE_LOW = 3.00;
export const PLATFORM_FEE_HIGH = 5.00;
export const DELIVERY_FEE_HOSTEL_BATCH = 15.00;
export const DELIVERY_FEE_STANDARD = 40.00;
export const RESTAURANT_COMMISSION_RATE = 0.18;
export const COMMISSION_RATE = 0.18;
export const BUDGET_MEAL_COMMISSION_RATE = 0.18;
export const STANDARD_COMMISSION_RATE = 0.18;
export const ONLINE_PG_FEE_RATE = 0.0236;
export const RIDER_BASE_PAYOUT = 20.00; // Flat ₹20 per fulfilled order
export const DELIVERY_PARTNER_SHARE_RATE = 0.85; // Legacy / reference rate

export const SMALL_ORDER_THRESHOLD = 50.00;
export const SMALL_ORDER_FEE = 0.00;

export type DeliveryType =
  | "HOSTEL_BATCH"
  | "STANDARD"
  | "EXPRESS_DOOR"
  | "COUNTER_TAKEAWAY"
  | "DELIVERY"
  | "TAKEAWAY"
  | "PICKUP"
  | "DIRECT_ROOM";

export interface PricingItem {
  price: number;
  quantity: number;
  is_budget_meal?: boolean;
}

export interface OrderPricingBreakdown {
  food_subtotal: number;
  restaurant_gst: number;
  platform_fee: number;
  amount?: number;
  fee_name: string;
  platform_fee_base: number;
  platform_fee_gst: number;
  delivery_fee: number;
  small_order_fee: number;
  is_below_min_delivery: boolean;
  min_delivery_error?: string;
  isBelowMinDelivery?: boolean;
  minDeliveryError?: string;
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
 * Calculates complete order pricing including statutory GST, dynamic platform tech fee
 * (₹5 for carts < ₹50, ₹3 for carts >= ₹50), delivery fees, minimum delivery subtotal check,
 * flat rider payout (₹20), tips, and partner splits.
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

  const isTakeaway =
    deliveryType === "COUNTER_TAKEAWAY" ||
    (deliveryType as string) === "TAKEAWAY" ||
    (deliveryType as string) === "PICKUP";
  const isDelivery = !isTakeaway;

  // 5% Restaurant GST
  const restaurant_gst = Number((FOOD_GST_RATE * food_subtotal).toFixed(2));

  // Dynamic Platform Tech Fee: ₹5 for carts < ₹50, ₹3 for carts >= ₹50
  const platform_fee =
    food_subtotal < SMALL_CART_THRESHOLD ? PLATFORM_FEE_SMALL_CART : PLATFORM_FEE_STANDARD;
  const platform_fee_base = Number((platform_fee / 1.18).toFixed(2));
  const platform_fee_gst = Number((platform_fee - platform_fee_base).toFixed(2));
  const fee_name = "Platform Tech Fee";

  // Delivery Fee
  const isBatch = deliveryType === "HOSTEL_BATCH" || (deliveryType as string) === "DELIVERY";
  const delivery_fee = isTakeaway
    ? 0.00
    : food_subtotal > 0
    ? isBatch
      ? DELIVERY_FEE_HOSTEL_BATCH
      : DELIVERY_FEE_STANDARD
    : 0;

  // Minimum cart for delivery
  const is_below_min_delivery = isDelivery && food_subtotal > 0 && food_subtotal < MIN_DELIVERY_SUBTOTAL;
  const min_delivery_error = is_below_min_delivery
    ? "Minimum cart for hostel delivery is ₹35.00. Add items or switch to Counter Takeaway."
    : undefined;

  // Small order fee removed from calculations
  const small_order_fee = 0.00;

  const valid_tip = Number(Math.max(0, Number(tipAmount || 0)).toFixed(2));

  const total_payable = Number(
    (food_subtotal + restaurant_gst + delivery_fee + platform_fee + valid_tip).toFixed(2)
  );

  // Commission splits (Standard 18% Platform Take Rate)
  const commission_amount = Number(
    (food_subtotal * RESTAURANT_COMMISSION_RATE).toFixed(2)
  );

  const isOnline = ["online", "online_payment", "razorpay"].includes(
    String(paymentMethod || "").trim().toLowerCase()
  );
  const pg_fee = isOnline ? Number((ONLINE_PG_FEE_RATE * total_payable).toFixed(2)) : 0;

  const net_restaurant_payout = Number(
    (food_subtotal + restaurant_gst - commission_amount).toFixed(2)
  );

  // Flat ₹20 Base Payout + 100% Customer Tip for Courier (only if delivered)
  const delivery_partner_earning = isTakeaway
    ? 0.00
    : Number((RIDER_BASE_PAYOUT + valid_tip).toFixed(2));

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
    amount: platform_fee,
    fee_name,
    platform_fee_base,
    platform_fee_gst,
    delivery_fee,
    small_order_fee,
    is_below_min_delivery,
    min_delivery_error,
    isBelowMinDelivery: is_below_min_delivery,
    minDeliveryError: min_delivery_error,
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
