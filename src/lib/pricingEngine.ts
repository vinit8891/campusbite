export const COMMISSION_RATE = 0.15; // 15% Platform Take-Rate
export const GST_RATE = 0.05;         // 5% Food GST
export const TECH_FEE_DELIVERY = 5.0; // ₹5 for delivered orders
export const TECH_FEE_TAKEAWAY = 3.0; // ₹3 for counter pass
export const BATCH_DELIVERY_FEE = 15.0;
export const EXPRESS_DELIVERY_FEE = 40.0;
export const MICRO_CART_THRESHOLD = 80.0;

export type DeliveryMode = 'HOSTEL_BATCH' | 'EXPRESS_DOOR' | 'COUNTER_TAKEAWAY';

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
  totalStudentPayable: number;
  canteenPayout: {
    baseFood: number;
    gstPassThrough: number;
    totalDisbursal: number;
  };
  allowedDeliveryModes: DeliveryMode[];
}

/**
 * Returns calibrated menu price on the student app based on canteen counter rate
 * ensuring 100% canteen payout post-commission.
 */
export function getCalibratedAppPrice(counterPrice: number): number {
  return Math.ceil(counterPrice / (1 - COMMISSION_RATE));
}

/**
 * Calculates checkout pricing breakdown including taxes, tech fee, delivery fee,
 * micro-cart threshold validations, and canteen disbursal.
 */
export function calculateCheckoutPricing(
  items: CartItemInput[],
  selectedMode: DeliveryMode
): PricingBreakdown {
  // 1. Calculate Calibrated App Price per item: CounterPrice / 0.85
  let appSubtotal = 0;
  let canteenCounterBase = 0;

  for (const item of items) {
    const calibratedUnitPrice = getCalibratedAppPrice(item.counterPrice);
    appSubtotal += calibratedUnitPrice * item.quantity;
    canteenCounterBase += item.counterPrice * item.quantity;
  }

  // 2. Enforce Micro-Cart Threshold (< ₹80 locks out Express)
  const isMicroCart = appSubtotal < MICRO_CART_THRESHOLD;
  const allowedDeliveryModes: DeliveryMode[] = isMicroCart
    ? ['HOSTEL_BATCH', 'COUNTER_TAKEAWAY']
    : ['HOSTEL_BATCH', 'EXPRESS_DOOR', 'COUNTER_TAKEAWAY'];

  if (!allowedDeliveryModes.includes(selectedMode)) {
    throw new Error(
      `Selected mode ${selectedMode} is restricted. Orders under ₹${MICRO_CART_THRESHOLD} require Hostel Batch or Counter Pickup.`
    );
  }

  // 3. Compute Fees & Taxes
  const gstAmount = Number((appSubtotal * GST_RATE).toFixed(2));
  const isTakeaway = selectedMode === 'COUNTER_TAKEAWAY';
  const platformTechFee = isTakeaway ? TECH_FEE_TAKEAWAY : TECH_FEE_DELIVERY;

  let deliveryFee = 0;
  if (selectedMode === 'HOSTEL_BATCH') deliveryFee = BATCH_DELIVERY_FEE;
  if (selectedMode === 'EXPRESS_DOOR') deliveryFee = EXPRESS_DELIVERY_FEE;

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
    totalStudentPayable,
    canteenPayout,
    allowedDeliveryModes,
  };
}
