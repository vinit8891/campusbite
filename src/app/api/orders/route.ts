import { NextRequest, NextResponse } from "next/server";
import {
  calculateCheckoutPricing,
  calculateCodRounding,
  type CartItemInput,
  type DeliveryMode,
} from "@/lib/pricingEngine";
import { isCodPayment, COD_PAYMENT_METHOD, ONLINE_PAYMENT_METHOD } from "@/lib/paymentLabels";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (!body || !Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json(
        { error: "Order must include at least one item." },
        { status: 400 }
      );
    }

    if (!body.restaurant_email) {
      return NextResponse.json(
        { error: "restaurant_email is required." },
        { status: 400 }
      );
    }

    // Map the cart items to CartItemInput[] using raw counter price
    const cartItems: CartItemInput[] = body.items.map((item: any) => ({
      id: String(item.id),
      name: item.name,
      counterPrice: Number(item.price),
      quantity: Number(item.quantity),
    }));

    // Normalize delivery mode
    let deliveryMode: DeliveryMode = "HOSTEL_BATCH";
    if (
      body.delivery_type === "EXPRESS_DOOR" ||
      body.delivery_type === "STANDARD" ||
      body.delivery_type === "COUNTER_TAKEAWAY"
    ) {
      deliveryMode = body.delivery_type === "STANDARD" ? "EXPRESS_DOOR" : body.delivery_type;
    }

    // Run authoritative server-side pricing calculation
    const pricing = calculateCheckoutPricing(cartItems, deliveryMode);

    const tipAmount = Number(body.tip_amount || 0);
    const unroundedTotal = Number((pricing.totalStudentPayable + tipAmount).toFixed(2));

    const isCod = isCodPayment(body.payment_method);
    let expectedServerTotal: number;
    let codRounding: { roundedTotal: number; roundOff: number } | undefined;

    if (isCod) {
      const rounding = calculateCodRounding(unroundedTotal);
      codRounding = rounding;
      expectedServerTotal = rounding.roundedTotal;
    } else {
      expectedServerTotal = unroundedTotal;
    }

    // Validate client-submitted total against server calculation with tolerance
    const clientTotal = Number(body.total);
    if (isNaN(clientTotal) || Math.abs(clientTotal - expectedServerTotal) > 0.05) {
      return NextResponse.json(
        {
          error: `Order amount mismatch (client: ${clientTotal}, calculated: ${expectedServerTotal}). Payable amount is calculated server-side and cannot be overridden.`,
        },
        { status: 400 }
      );
    }

    const orderId = `ord_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const fullPricingBreakdown = {
      ...pricing,
      codRounding,
    };

    const orderRecord = {
      _id: orderId,
      id: orderId,
      restaurant_email: body.restaurant_email,
      customer_name: body.customer_name || "Guest",
      phone: body.phone || "",
      address: body.address || "",
      payment_method: isCod ? COD_PAYMENT_METHOD : ONLINE_PAYMENT_METHOD,
      payment_status: "pending",
      total: expectedServerTotal,
      delivery_for: body.delivery_for || "self",
      delivery_type: deliveryMode,
      hostel_block: deliveryMode === "HOSTEL_BATCH" ? body.hostel_block : null,
      tip_amount: tipAmount,
      pricing_breakdown: fullPricingBreakdown,
      status: "Pending",
      items: body.items,
      created_at: new Date().toISOString(),
      latitude: body.latitude ?? null,
      longitude: body.longitude ?? null,
      restaurant_latitude: body.restaurant_latitude ?? 18.52043,
      restaurant_longitude: body.restaurant_longitude ?? 73.856743,
    };

    return NextResponse.json(orderRecord, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to process order.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
