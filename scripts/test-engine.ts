import {
  calculateCheckoutPricing,
  calculateCodRounding,
  getCalibratedAppPrice,
  CartItemInput,
} from '../src/lib/pricingEngine';

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
    pohaAppPrice === 42,
    'Poha Calibrated App Price is ₹42',
    `Expected: 42, Received: ${pohaAppPrice}`
  );
  assert(
    pohaPricing.appSubtotal === 42,
    'Poha App Subtotal is ₹42',
    `Expected: 42, Received: ${pohaPricing.appSubtotal}`
  );
  assert(
    pohaPricing.gstAmount === 2.10,
    'Poha 5% GST is ₹2.10',
    `Expected: 2.10, Received: ${pohaPricing.gstAmount}`
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
    pohaPricing.totalStudentPayable === 64.10,
    'Poha Total Student Payable is ₹64.10',
    `Expected: 64.10, Received: ${pohaPricing.totalStudentPayable}`
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
    chapatiAppPrice === 71,
    'Chapati Bhaji Calibrated App Price is ₹71',
    `Expected: 71, Received: ${chapatiAppPrice}`
  );
  assert(
    chapatiPricing.totalStudentPayable === 94.55,
    'Chapati Bhaji Total Batch Payable is ₹94.55',
    `Expected: 94.55 (71 + 3.55 GST + 5 Tech + 15 Delivery), Received: ${chapatiPricing.totalStudentPayable}`
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
    riceAppPrice === 95,
    'Rice Plate Calibrated App Price is ₹95',
    `Expected: 95, Received: ${riceAppPrice}`
  );
  assert(
    ricePricing.appSubtotal === 95,
    'Rice Plate Subtotal is ₹95 (>= ₹80 threshold)',
    `Expected: 95, Received: ${ricePricing.appSubtotal}`
  );
  assert(
    ricePricing.deliveryFee === 40.0,
    'Rice Plate Express Delivery Fee is ₹40.00',
    `Expected: 40.00, Received: ${ricePricing.deliveryFee}`
  );
  assert(
    ricePricing.totalStudentPayable === 144.75,
    'Rice Plate Express Door Total Payable is ₹144.75',
    `Expected: 144.75 (95 + 4.75 GST + 5 Tech + 40 Express), Received: ${ricePricing.totalStudentPayable}`
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
    'Express Restriction thrown when testing Poha (₹42 subtotal) with EXPRESS_DOOR'
  );
  console.log('');

  // --- Test 5: COD Whole-Rupee Rounding ---
  console.log('--- Test 5: COD Whole-Rupee Rounding Validation ---');
  const cod1 = calculateCodRounding(64.10);
  assert(
    cod1.roundedTotal === 64 && cod1.roundOff === -0.10,
    'COD rounding down: ₹64.10 -> ₹64 (roundOff: -₹0.10)',
    `Received: roundedTotal=${cod1.roundedTotal}, roundOff=${cod1.roundOff}`
  );

  const cod2 = calculateCodRounding(94.55);
  assert(
    cod2.roundedTotal === 95 && cod2.roundOff === 0.45,
    'COD rounding up: ₹94.55 -> ₹95 (roundOff: +₹0.45)',
    `Received: roundedTotal=${cod2.roundedTotal}, roundOff=${cod2.roundOff}`
  );

  const cod3 = calculateCodRounding(144.75);
  assert(
    cod3.roundedTotal === 145 && cod3.roundOff === 0.25,
    'COD rounding up: ₹144.75 -> ₹145 (roundOff: +₹0.25)',
    `Received: roundedTotal=${cod3.roundedTotal}, roundOff=${cod3.roundOff}`
  );

  const cod4 = calculateCodRounding(80.00);
  assert(
    cod4.roundedTotal === 80 && cod4.roundOff === 0.00,
    'COD exact whole rupee: ₹80.00 -> ₹80 (roundOff: 0)',
    `Received: roundedTotal=${cod4.roundedTotal}, roundOff=${cod4.roundOff}`
  );
  console.log('');

  console.log('====================================================');
  console.log(`🎉 Results: ${passed}/${total} assertions passed successfully!`);
  console.log('====================================================');
}

runTests();
