export const RESTAURANT_COMMISSION_RATE = 0.18;
export const COMMISSION_RATE = 0.18; // 18% Platform Take-Rate
export const GST_RATE = 0.05;         // 5% Food GST

export const PLATFORM_FEE_STANDARD = 3.00; // Carts >= ₹50
export const PLATFORM_FEE_SMALL_CART = 5.00; // Carts < ₹50
export const SMALL_CART_THRESHOLD = 50.00;
export const MIN_DELIVERY_SUBTOTAL = 35.00;

export const TECH_FEE_DELIVERY = 5.0; // Legacy alias
export const TECH_FEE_TAKEAWAY = 3.0; // Legacy alias
export const PLATFORM_FEE_TAKEAWAY = 3.00;
export const PLATFORM_FEE_DELIVERY = 5.00;
export const BATCH_DELIVERY_FEE = 15.0;
export const EXPRESS_DELIVERY_FEE = 40.0;
export const MICRO_CART_THRESHOLD = 80.0;

export const SMALL_ORDER_THRESHOLD = 50.00;
export const SMALL_ORDER_FEE = 0.00;

export type DeliveryMode = 'HOSTEL_BATCH' | 'EXPRESS_DOOR' | 'COUNTER_TAKEAWAY' | 'STANDARD';

export interface CartItemInput {
  id: string;
  name?: string;
  counterPrice: number; // Raw canteen price (e.g. ₹35, ₹60, ₹80)
  quantity: number;
}

export interface PricingBreakdown {
  appSubtotal: number;
  gstAmount: number;
  platformTechFee: number;
  deliveryFee: number;
  smallOrderFee: number;
  small_order_fee: number;
  isBelowMinDelivery: boolean;
  minDeliveryError?: string;
  is_below_min_delivery: boolean;
  min_delivery_error?: string;
  totalStudentPayable: number;
  isMicroCart: boolean;
  amountToUnlockExpress: number;
  canteenPayout: {
    baseFood: number;
    gstPassThrough: number;
    totalDisbursal: number;
  };
  allowedDeliveryModes: DeliveryMode[];
  codRounding?: {
    roundedTotal: number;
    roundOff: number;
  };
}

/**
 * Rounds cash-on-delivery payments to the nearest whole rupee and returns the round-off delta.
 */
export function calculateCodRounding(total: number): { roundedTotal: number; roundOff: number } {
  const roundedTotal = Math.round(total);
  const roundOff = Number((roundedTotal - total).toFixed(2));
  return { roundedTotal, roundOff };
}

/**
 * Returns calibrated menu price on the student app based on canteen counter rate
 * ensuring 100% canteen payout post-commission.
 */
export function getCalibratedAppPrice(counterPrice: number): number {
  return Math.ceil(counterPrice / (1 - COMMISSION_RATE));
}

/**
 * Calculates checkout pricing breakdown including taxes, dynamic tech fee
 * (₹5 for carts < ₹50, ₹3 for carts >= ₹50), delivery fee,
 * min delivery validation, micro-cart threshold validations, and canteen disbursal.
 */
export function calculateCheckoutPricing(
  items: CartItemInput[],
  selectedMode: DeliveryMode = 'HOSTEL_BATCH'
): PricingBreakdown {
  // Normalize STANDARD to EXPRESS_DOOR
  const normalizedMode = selectedMode === 'STANDARD' ? 'EXPRESS_DOOR' : selectedMode;

  // 1. Calculate Calibrated App Price per item: CounterPrice / (1 - COMMISSION_RATE)
  let appSubtotal = 0;
  let canteenCounterBase = 0;

  for (const item of items) {
    const calibratedUnitPrice = getCalibratedAppPrice(item.counterPrice);
    appSubtotal += calibratedUnitPrice * item.quantity;
    canteenCounterBase += item.counterPrice * item.quantity;
  }

  // 2. Enforce Micro-Cart Threshold (< ₹80 locks out Express)
  const isMicroCart = appSubtotal < MICRO_CART_THRESHOLD;
  const amountToUnlockExpress = Math.max(0, Number((MICRO_CART_THRESHOLD - appSubtotal).toFixed(2)));
  const allowedDeliveryModes: DeliveryMode[] = isMicroCart
    ? ['HOSTEL_BATCH', 'COUNTER_TAKEAWAY']
    : ['HOSTEL_BATCH', 'EXPRESS_DOOR', 'COUNTER_TAKEAWAY', 'STANDARD'];

  if (!allowedDeliveryModes.includes(normalizedMode)) {
    throw new Error(
      `Selected mode ${selectedMode} is restricted. Orders under ₹${MICRO_CART_THRESHOLD} require Hostel Batch or Counter Pickup.`
    );
  }

  // 3. Compute Fees & Taxes
  const gstAmount = Number((appSubtotal * GST_RATE).toFixed(2));
  const isTakeaway = normalizedMode === 'COUNTER_TAKEAWAY';
  const isDelivery = !isTakeaway;

  // Dynamic Platform Tech Fee: ₹5 for small carts (< ₹50), ₹3 for carts >= ₹50
  const platformTechFee =
    appSubtotal < SMALL_CART_THRESHOLD ? PLATFORM_FEE_SMALL_CART : PLATFORM_FEE_STANDARD;

  let deliveryFee = 0;
  if (normalizedMode === 'HOSTEL_BATCH') deliveryFee = BATCH_DELIVERY_FEE;
  if (normalizedMode === 'EXPRESS_DOOR') deliveryFee = EXPRESS_DELIVERY_FEE;

  // Minimum delivery subtotal check
  const isBelowMinDelivery = isDelivery && appSubtotal > 0 && appSubtotal < MIN_DELIVERY_SUBTOTAL;
  const minDeliveryError = isBelowMinDelivery
    ? "Minimum cart for hostel delivery is ₹35.00. Add items or switch to Counter Takeaway."
    : undefined;

  // Small order fee removed from calculations
  const smallOrderFee = 0.00;

  const totalStudentPayable = Number(
    (appSubtotal + gstAmount + platformTechFee + deliveryFee).toFixed(2)
  );

  // 4. Guarantee Canteen Receives 100% Counter Rate + GST
  const canteenPayout = {
    baseFood: canteenCounterBase,
    gstPassThrough: gstAmount,
    totalDisbursal: Number((canteenCounterBase + gstAmount).toFixed(2)),
  };

  return {
    appSubtotal,
    gstAmount,
    platformTechFee,
    deliveryFee,
    smallOrderFee,
    small_order_fee: smallOrderFee,
    isBelowMinDelivery,
    minDeliveryError,
    is_below_min_delivery: isBelowMinDelivery,
    min_delivery_error: minDeliveryError,
    totalStudentPayable,
    isMicroCart,
    amountToUnlockExpress,
    canteenPayout,
    allowedDeliveryModes,
  };
}
