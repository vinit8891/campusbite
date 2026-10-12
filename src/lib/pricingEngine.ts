export const RESTAURANT_COMMISSION_RATE = 0.18;
export const COMMISSION_RATE = 0.18; // 18% Platform Take-Rate
export const GST_RATE = 0.05;         // 5% Food GST

export const PLATFORM_FEE_DELIVERY = 3.00;
export const PLATFORM_FEE_TAKEAWAY = 2.00;
export const PLATFORM_FEE_STANDARD = 3.00;
export const PLATFORM_FEE_SMALL_CART = 3.00;
export const SMALL_CART_THRESHOLD = 50.00;
export const MIN_DELIVERY_SUBTOTAL = 35.00;

export const TECH_FEE_DELIVERY = 3.0; // Streamlined delivery tech fee
export const TECH_FEE_TAKEAWAY = 2.0; // Streamlined takeaway tech fee
export const BATCH_DELIVERY_FEE = 15.0;
export const EXPRESS_DELIVERY_FEE = 15.0; // Flat ₹15
export const MICRO_CART_THRESHOLD = 80.0;

export const SMALL_ORDER_THRESHOLD = 50.00;
export const SMALL_ORDER_FEE = 0.00;

export type DeliveryMode =
  | 'delivery'
  | 'takeaway'
  | 'HOSTEL_BATCH'
  | 'EXPRESS_DOOR'
  | 'COUNTER_TAKEAWAY'
  | 'STANDARD'
  | 'DIRECT_ROOM';

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
 * Calculates checkout pricing breakdown including taxes, streamlined tech fees
 * (₹3 for delivery, ₹2 for takeaway), delivery fees (₹15 for delivery, ₹0 for takeaway),
 * and canteen disbursal. No cart minimum blockers for direct delivery.
 */
export function calculateCheckoutPricing(
  items: CartItemInput[],
  selectedMode: DeliveryMode = 'delivery'
): PricingBreakdown {
  // 1. Calculate Calibrated App Price per item: CounterPrice / (1 - COMMISSION_RATE)
  let appSubtotal = 0;
  let canteenCounterBase = 0;

  for (const item of items) {
    const calibratedUnitPrice = getCalibratedAppPrice(item.counterPrice);
    appSubtotal += calibratedUnitPrice * item.quantity;
    canteenCounterBase += item.counterPrice * item.quantity;
  }

  // 2. Streamlined Fulfillment: No lockout under ₹80
  const isMicroCart = false;
  const amountToUnlockExpress = 0;
  const allowedDeliveryModes: DeliveryMode[] = [
    'delivery',
    'takeaway',
    'HOSTEL_BATCH',
    'EXPRESS_DOOR',
    'COUNTER_TAKEAWAY',
    'STANDARD',
    'DIRECT_ROOM',
  ];

  // 3. Compute Fees & Taxes
  const gstAmount = Number((appSubtotal * GST_RATE).toFixed(2));
  const norm = String(selectedMode || 'delivery').toLowerCase();
  const isTakeaway = norm === 'takeaway' || norm === 'counter_takeaway' || norm === 'pickup';

  // Streamlined Fees:
  // delivery: delivery_fee = 15, platform_fee = 3
  // takeaway: delivery_fee = 0, platform_fee = 2
  const platformTechFee = isTakeaway ? PLATFORM_FEE_TAKEAWAY : PLATFORM_FEE_DELIVERY;
  const deliveryFee = isTakeaway ? 0.00 : (appSubtotal > 0 ? BATCH_DELIVERY_FEE : 0.00);

  // No cart minimum blockers for direct delivery
  const isBelowMinDelivery = false;
  const minDeliveryError = undefined;
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
