import {
  calculateCheckoutPricing,
  calculateCodRounding,
  getCalibratedAppPrice,
  CartItemInput,
} from '../src/lib/pricingEngine';
import {
  calculateOrderPricing,
  RIDER_BASE_PAYOUT,
} from '../src/lib/orderPricing';

function runTests() {
  console.log('====================================================');
  console.log('🚀 Running Pricing Engine Verification Test Suite');
  console.log('====================================================\n');

  let passed = 0;
  let total = 0;

  function assert(condition: boolean, testName: string, details?: string) {
    total++;
    if (condition) {
      console.log(`✅ [PASS] ${testName}`);
      if (details) console.log(`   ${details}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${testName}`);
      if (details) console.error(`   ${details}`);
      process.exitCode = 1;
    }
  }

  // --- Test 1: Poha (Counter ₹35) ---
  console.log('--- Test 1: Poha (Counter ₹35, Batch Delivery) ---');
  const pohaItems: CartItemInput[] = [{ id: 'poha_1', name: 'Poha', counterPrice: 35, quantity: 1 }];
  const pohaAppPrice = getCalibratedAppPrice(35);
  const pohaPricing = calculateCheckoutPricing(pohaItems, 'HOSTEL_BATCH');

  assert(
    pohaAppPrice === 43,
    'Poha Calibrated App Price is ₹43',
    `Expected: 43, Received: ${pohaAppPrice}`
  );
  assert(
    pohaPricing.appSubtotal === 43,
    'Poha App Subtotal is ₹43',
    `Expected: 43, Received: ${pohaPricing.appSubtotal}`
  );
  assert(
    pohaPricing.gstAmount === 2.15,
    'Poha 5% GST is ₹2.15',
    `Expected: 2.15, Received: ${pohaPricing.gstAmount}`
  );
  assert(
    pohaPricing.platformTechFee === 5.0,
    'Poha Tech Fee is ₹5.00',
    `Expected: 5.00, Received: ${pohaPricing.platformTechFee}`
  );
  assert(
    pohaPricing.deliveryFee === 15.0,
    'Poha Hostel Batch Delivery Fee is ₹15.00',
    `Expected: 15.00, Received: ${pohaPricing.deliveryFee}`
  );
  assert(
    pohaPricing.totalStudentPayable === 65.15,
    'Poha Total Student Payable is ₹65.15',
    `Expected: 65.15, Received: ${pohaPricing.totalStudentPayable}`
  );
  assert(
    pohaPricing.canteenPayout.baseFood === 35,
    'Poha Canteen Base Food Payout is ₹35.00',
    `Expected: 35, Received: ${pohaPricing.canteenPayout.baseFood}`
  );
  console.log('');

  // --- Test 2: Chapati Bhaji (Counter ₹60) ---
  console.log('--- Test 2: Chapati Bhaji (Counter ₹60, Batch Delivery) ---');
  const chapatiItems: CartItemInput[] = [{ id: 'cb_1', name: 'Chapati Bhaji', counterPrice: 60, quantity: 1 }];
  const chapatiAppPrice = getCalibratedAppPrice(60);
  const chapatiPricing = calculateCheckoutPricing(chapatiItems, 'HOSTEL_BATCH');

  assert(
    chapatiAppPrice === 74,
    'Chapati Bhaji Calibrated App Price is ₹74',
    `Expected: 74, Received: ${chapatiAppPrice}`
  );
  assert(
    chapatiPricing.totalStudentPayable === 97.70,
    'Chapati Bhaji Total Batch Payable is ₹97.70',
    `Expected: 97.70 (74 + 3.70 GST + 5 Tech + 15 Delivery), Received: ${chapatiPricing.totalStudentPayable}`
  );
  assert(
    chapatiPricing.canteenPayout.baseFood === 60,
    'Chapati Bhaji Canteen Base Food Payout is ₹60.00',
    `Expected: 60, Received: ${chapatiPricing.canteenPayout.baseFood}`
  );
  console.log('');

  // --- Test 3: Rice Plate (Counter ₹80) -> Express Door ---
  console.log('--- Test 3: Rice Plate (Counter ₹80, Express Door Delivery) ---');
  const riceItems: CartItemInput[] = [{ id: 'rp_1', name: 'Rice Plate', counterPrice: 80, quantity: 1 }];
  const riceAppPrice = getCalibratedAppPrice(80);
  const ricePricing = calculateCheckoutPricing(riceItems, 'EXPRESS_DOOR');

  assert(
    riceAppPrice === 98,
    'Rice Plate Calibrated App Price is ₹98',
    `Expected: 98, Received: ${riceAppPrice}`
  );
  assert(
    ricePricing.appSubtotal === 98,
    'Rice Plate Subtotal is ₹98 (>= ₹80 threshold)',
    `Expected: 98, Received: ${ricePricing.appSubtotal}`
  );
  assert(
    ricePricing.deliveryFee === 40.0,
    'Rice Plate Express Delivery Fee is ₹40.00',
    `Expected: 40.00, Received: ${ricePricing.deliveryFee}`
  );
  assert(
    ricePricing.totalStudentPayable === 147.90,
    'Rice Plate Express Door Total Payable is ₹147.90',
    `Expected: 147.90 (98 + 4.90 GST + 5 Tech + 40 Express), Received: ${ricePricing.totalStudentPayable}`
  );
  console.log('');

  // --- Test 4: Micro-Cart Restriction (< ₹80 locks out Express Door) ---
  console.log('--- Test 4: Micro-Cart Express Door Lockout Validation ---');
  let restrictionThrown = false;
  try {
    calculateCheckoutPricing(pohaItems, 'EXPRESS_DOOR');
  } catch (error: any) {
    restrictionThrown = true;
    console.log(`   Caught expected restriction error: "${error.message}"`);
  }

  assert(
    restrictionThrown,
    'Express Restriction thrown when testing Poha (₹43 subtotal) with EXPRESS_DOOR'
  );
  console.log('');

  // --- Test 5: COD Whole-Rupee Rounding ---
  console.log('--- Test 5: COD Whole-Rupee Rounding Validation ---');
  const cod1 = calculateCodRounding(65.15);
  assert(
    cod1.roundedTotal === 65 && cod1.roundOff === -0.15,
    'COD rounding down: ₹65.15 -> ₹65 (roundOff: -₹0.15)',
    `Received: roundedTotal=${cod1.roundedTotal}, roundOff=${cod1.roundOff}`
  );

  const cod2 = calculateCodRounding(97.70);
  assert(
    cod2.roundedTotal === 98 && cod2.roundOff === 0.30,
    'COD rounding up: ₹97.70 -> ₹98 (roundOff: +₹0.30)',
    `Received: roundedTotal=${cod2.roundedTotal}, roundOff=${cod2.roundOff}`
  );

  const cod3 = calculateCodRounding(147.90);
  assert(
    cod3.roundedTotal === 148 && cod3.roundOff === 0.10,
    'COD rounding up: ₹147.90 -> ₹148 (roundOff: +₹0.10)',
    `Received: roundedTotal=${cod3.roundedTotal}, roundOff=${cod3.roundOff}`
  );

  const cod4 = calculateCodRounding(80.00);
  assert(
    cod4.roundedTotal === 80 && cod4.roundOff === 0.00,
    'COD exact whole rupee: ₹80.00 -> ₹80 (roundOff: 0)',
    `Received: roundedTotal=${cod4.roundedTotal}, roundOff=${cod4.roundOff}`
  );
  console.log('');

  // --- Test 6: Flat ₹20 Rider Base Payout & Tip Tracking ---
  console.log('--- Test 6: Flat ₹20 Rider Payout & Tip Validation ---');
  const orderPricingNoTip = calculateOrderPricing(
    [{ price: 43, quantity: 1 }],
    'HOSTEL_BATCH',
    0,
    'COD'
  );
  assert(
    orderPricingNoTip.delivery_partner_earning === 20.00,
    'Rider Flat Base Payout is ₹20.00 (without tip)',
    `Expected: 20.00, Received: ${orderPricingNoTip.delivery_partner_earning}`
  );

  const orderPricingWithTip = calculateOrderPricing(
    [{ price: 43, quantity: 1 }],
    'HOSTEL_BATCH',
    10.00,
    'COD'
  );
  assert(
    orderPricingWithTip.delivery_partner_earning === 30.00,
    'Rider Flat Base Payout with ₹10 tip is ₹30.00 (₹20 base + ₹10 tip)',
    `Expected: 30.00, Received: ${orderPricingWithTip.delivery_partner_earning}`
  );
  console.log('');

  // --- Test 7: Cash-in-Hand (CIH) Reconciliation Arithmetic ---
  console.log('--- Test 7: Cash-in-Hand (CIH) Reconciliation Ledger ---');
  const collectedCodCash = 65.00; // e.g. Poha COD total
  const riderPayout = RIDER_BASE_PAYOUT; // ₹20 flat
  const netDue = Number((collectedCodCash - riderPayout).toFixed(2));

  assert(
    netDue === 45.00,
    'Net Due to CampusBite is ₹45.00 (₹65 cash collected - ₹20 wage earned)',
    `Expected: 45.00, Received: ${netDue}`
  );
  console.log('');

  console.log('====================================================');
  console.log(`🎉 Results: ${passed}/${total} assertions passed successfully!`);
  console.log('====================================================');
}

runTests();
