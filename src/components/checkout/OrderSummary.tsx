"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { useCheckout } from "@/context/CheckoutContext";
import { placeOrder } from "@/services/orderService";
import { AuthHttpError } from "@/services/authFetch";
import { ROUTES } from "@/lib/routes";
import { calculateOrderPricing } from "@/lib/orderPricing";
import {
  COD_PAYMENT_METHOD,
  ONLINE_PAYMENT_METHOD,
} from "@/lib/paymentLabels";
import { openRazorpayCheckout } from "@/lib/razorpayCheckout";
import {
  cancelRazorpayPayment,
  createRazorpayPayment,
  getRazorpayConfig,
  mockCompleteRazorpayCheckout,
  verifyRazorpayPayment,
  type CreatePaymentResponse,
} from "@/services/paymentService";

const MockCheckoutModal = dynamic(
  () => import("@/components/checkout/MockCheckoutModal"),
  { ssr: false }
);

type PaymentUiState =
  | "idle"
  | "processing"
  | "success"
  | "failed"
  | "cancelled";

const TIP_OPTIONS = [
  { label: "No Tip", value: 0 },
  { label: "₹10", value: 10 },
  { label: "₹20", value: 20 },
  { label: "₹30", value: 30 },
];

export default function OrderSummary() {
  const router = useRouter();

  const { cart, clearCart } = useCart();
  const { checkout, setCheckout } = useCheckout();
  const { isLoggedIn, user } = useAuth();

  const [loading, setLoading] = useState(false);
  const [paymentState, setPaymentState] = useState<PaymentUiState>("idle");
  const [statusMessage, setStatusMessage] = useState("");
  const [mockOpen, setMockOpen] = useState(false);
  const [mockBusy, setMockBusy] = useState(false);
  const [pendingPayment, setPendingPayment] =
    useState<CreatePaymentResponse | null>(null);

  const pricing = calculateOrderPricing(
    cart,
    checkout.delivery_type,
    checkout.tip_amount,
    checkout.payment_method
  );

  const isCod = checkout.payment_method === COD_PAYMENT_METHOD;
  const isOnline = checkout.payment_method === ONLINE_PAYMENT_METHOD;
  const paymentMethod = isCod ? "cod" : "online";

  const isSubmitting = loading || paymentState === "processing";

  const canSubmit =
    cart.length > 0 &&
    !loading &&
    paymentState !== "processing" &&
    paymentState !== "success" &&
    (isCod ? checkout.cod_confirmed : checkout.online_confirmed);

  function finishSuccess(orderId: string) {
    setPaymentState("success");
    setStatusMessage("Payment Successful");
    toast.success("Order placed successfully", {
      description: "We'll notify you as your order progresses.",
    });
    clearCart();
    router.push(`${ROUTES.ORDER_SUCCESS}?orderId=${orderId}`);
  }

  async function handleVerifiedOnline(orderId: string) {
    setMockOpen(false);
    setPendingPayment(null);
    finishSuccess(orderId);
  }

  async function runMockOutcome(outcome: "success" | "failure" | "dismiss") {
    if (!pendingPayment || mockBusy) return;

    try {
      setMockBusy(true);
      setPaymentState("processing");
      setStatusMessage("Processing Payment");

      const result = await mockCompleteRazorpayCheckout(
        pendingPayment.order_id,
        outcome
      );

      if (outcome === "success" && result.payment_status === "paid") {
        await handleVerifiedOnline(pendingPayment.order_id);
        return;
      }

      if (outcome === "failure") {
        setPaymentState("failed");
        setStatusMessage("Payment Failed");
        setMockOpen(false);
        return;
      }

      setPaymentState("cancelled");
      setStatusMessage("Payment Cancelled");
      setMockOpen(false);
    } catch (error) {
      setPaymentState("failed");
      setStatusMessage(
        error instanceof Error ? error.message : "Payment Failed"
      );
      setMockOpen(false);
    } finally {
      setMockBusy(false);
      setLoading(false);
    }
  }

  async function handlePlaceOrder() {
    if (loading || paymentState === "processing") {
      return;
    }

    if (!isLoggedIn) {
      toast.error("Please log in to place an order.");
      router.push(ROUTES.LOGIN);
      return;
    }

    const effectiveName =
      (checkout.delivery_for === "someone_else"
        ? checkout.customer_name
        : checkout.customer_name || user?.name || "") || "";

    const deliveryPhone =
      (checkout.delivery_for === "someone_else"
        ? checkout.phone
        : checkout.phone || user?.phone || "") || "";

    if (!effectiveName.trim()) {
      toast.error("Please enter the recipient name.");
      return;
    }

    if (!/^[0-9]{10}$/.test(deliveryPhone.replace(/\D/g, ""))) {
      toast.error("Please enter a valid 10-digit mobile number.");
      return;
    }

    if (!checkout.hostel_block?.trim()) {
      toast.error("Please enter your hostel or building name.");
      return;
    }

    if (!checkout.address?.trim()) {
      toast.error("Please enter your room or flat number.");
      return;
    }

    const restaurantEmail =
      checkout.restaurant_email.trim() ||
      cart.find((item) => item.restaurant_email)?.restaurant_email ||
      "";

    if (!restaurantEmail) {
      toast.error(
        "Restaurant information is missing. Please select items from a restaurant."
      );
      return;
    }

    if (isCod && !checkout.cod_confirmed) {
      toast.error("Please confirm Cash on Delivery before placing your order.");
      return;
    }

    if (isOnline && !checkout.online_confirmed) {
      toast.error("Please confirm Online Payment before continuing.");
      return;
    }

    let awaitingCheckoutModal = false;

    try {
      setLoading(true);
      setPaymentState(isOnline ? "processing" : "idle");
      setStatusMessage(isOnline ? "Processing Payment" : "");

      let fullAddress = checkout.address.trim();
      if (checkout.hostel_block) {
        if (
          !fullAddress
            .toLowerCase()
            .includes(checkout.hostel_block.toLowerCase())
        ) {
          fullAddress = `${checkout.hostel_block}, ${fullAddress}`;
        }
      }
      if (checkout.landmark?.trim()) {
        fullAddress += `, Ref: ${checkout.landmark.trim()}`;
      }
      if (checkout.delivery_instructions?.trim()) {
        fullAddress += ` (Note: ${checkout.delivery_instructions.trim()})`;
      }

      const orderData = {
        restaurant_email: restaurantEmail,
        customer_name: effectiveName.trim(),
        phone: deliveryPhone.replace(/\D/g, ""),
        address: fullAddress,
        payment_method: isOnline ? ONLINE_PAYMENT_METHOD : COD_PAYMENT_METHOD,
        items: cart,
        total: pricing.total_payable,
        delivery_for: checkout.delivery_for,
        delivery_type: checkout.delivery_type,
        hostel_block:
          checkout.delivery_type === "HOSTEL_BATCH"
            ? checkout.hostel_block
            : null,
        tip_amount: checkout.tip_amount,
        pricing_breakdown: pricing,
        latitude: checkout.latitude,
        longitude: checkout.longitude,
        restaurant_latitude: checkout.restaurant_latitude,
        restaurant_longitude: checkout.restaurant_longitude,
      };

      const response = await placeOrder(orderData);
      const orderId = response._id || response.id || "";

      if (isCod) {
        clearCart();
        router.push(`${ROUTES.ORDER_SUCCESS}?orderId=${orderId}`);
        return;
      }

      const config = await getRazorpayConfig();
      if (!config.enabled || !config.key_id) {
        throw new Error(
          "Online payment is not configured. Please use COD or try again later."
        );
      }

      const payment = await createRazorpayPayment(
        orderId,
        pricing.total_payable
      );
      setPendingPayment(payment);

      if (
        config.mode === "mock" ||
        config.mock_checkout_available ||
        config.key_id.startsWith("rzp_test_mock")
      ) {
        setMockOpen(true);
        setStatusMessage("Pay Online");
        return;
      }

      awaitingCheckoutModal = true;
      await openRazorpayCheckout({
        keyId: config.key_id,
        payment,
        customerName: orderData.customer_name,
        customerEmail: user?.email,
        customerPhone: deliveryPhone,
        description: `CampusBite order ${orderId}`,
        onSuccess: async (rzp) => {
          try {
            setPaymentState("processing");
            setStatusMessage("Processing Payment");
            const verified = await verifyRazorpayPayment({
              order_id: orderId,
              razorpay_order_id: rzp.razorpay_order_id,
              razorpay_payment_id: rzp.razorpay_payment_id,
              razorpay_signature: rzp.razorpay_signature,
            });

            if (verified.payment_status !== "paid") {
              throw new Error("Payment was not confirmed by CampusBite.");
            }

            await handleVerifiedOnline(orderId);
          } catch (error) {
            setPaymentState("failed");
            setStatusMessage(
              error instanceof Error ? error.message : "Payment Failed"
            );
          } finally {
            setLoading(false);
          }
        },
        onFailure: async (reason) => {
          try {
            await cancelRazorpayPayment(orderId, reason || "payment_failed");
          } catch {
            // Best effort
          }
          setPaymentState("failed");
          setStatusMessage("Payment Failed");
          setPendingPayment(null);
          setLoading(false);
        },
        onDismiss: async () => {
          try {
            await cancelRazorpayPayment(orderId, "checkout_dismissed");
          } catch {
            // Best effort
          }
          setPaymentState("cancelled");
          setStatusMessage("Payment Cancelled");
          setPendingPayment(null);
          setLoading(false);
        },
      });
    } catch (error) {
      if (error instanceof AuthHttpError && error.status === 401) {
        return;
      }

      setPaymentState("failed");
      setStatusMessage(
        error instanceof Error ? error.message : "Payment Failed"
      );

      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to place order. Please check that the backend is running and try again."
      );
    } finally {
      if (!awaitingCheckoutModal) {
        setLoading(false);
      }
    }
  }

  const finalTotal = pricing.total_payable.toFixed(2);

  const ctaButtonText = (() => {
    if (isSubmitting) return "Placing Order...";
    if (paymentState === "success") return "Payment Successful";
    if (paymentState === "failed") {
      return isOnline ? "Retry Online Payment" : "Retry COD Order";
    }
    return `Place ${paymentMethod.toUpperCase()} Order`;
  })();

  return (
    <>
      <section className="rounded-2xl border border-stone-200 bg-white p-4 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-stone-900">Order Summary</h2>
          <span className="text-xs text-stone-500 font-medium">
            {cart.length} {cart.length === 1 ? "item" : "items"}
          </span>
        </div>

        {/* Cart Items List */}
        <div className="space-y-2 border-b border-stone-100 pb-3">
          {cart.map((item) => (
            <div
              key={item.id}
              className="flex justify-between items-center text-xs"
            >
              <span className="text-stone-700 font-medium truncate max-w-[220px]">
                {item.name} × {item.quantity}
              </span>
              <span className="font-semibold text-stone-900">
                ₹{(item.price * item.quantity).toFixed(2)}
              </span>
            </div>
          ))}
        </div>

        {/* Courier Tip Selector - Compact Inline Pills */}
        <div className="rounded-xl border border-amber-100 bg-amber-50/50 p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-stone-800 flex items-center gap-1">
              🛵 Rider Tip
            </span>
            <span className="text-[10px] font-bold text-amber-700">
              100% to student courier
            </span>
          </div>

          <div className="grid grid-cols-4 gap-1.5">
            {TIP_OPTIONS.map((tip) => (
              <button
                key={tip.value}
                type="button"
                onClick={() =>
                  setCheckout((prev) => ({ ...prev, tip_amount: tip.value }))
                }
                className={`py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  checkout.tip_amount === tip.value
                    ? "bg-amber-600 text-white shadow-2xs"
                    : "bg-white text-stone-700 border border-stone-200 hover:border-amber-300"
                }`}
              >
                {tip.label}
              </button>
            ))}
          </div>
        </div>

        {/* Bill Breakdown */}
        <div className="space-y-2 text-xs text-stone-600">
          <div className="flex justify-between">
            <span>Items Total</span>
            <span className="font-semibold text-stone-900">
              ₹{pricing.food_subtotal.toFixed(2)}
            </span>
          </div>

          <div className="flex justify-between">
            <span>Restaurant GST (5%)</span>
            <span className="font-semibold text-stone-900">
              ₹{pricing.restaurant_gst.toFixed(2)}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span>Delivery Fee</span>
              {checkout.delivery_type === "HOSTEL_BATCH" && (
                <span className="rounded-full bg-emerald-100 px-1.5 py-0.2 text-[10px] font-bold text-emerald-700">
                  Saved ₹25
                </span>
              )}
            </div>
            <span className="font-semibold text-stone-900">
              ₹{pricing.delivery_fee.toFixed(2)}
            </span>
          </div>

          <div className="flex justify-between">
            <span>Platform Tech Fee</span>
            <span className="font-semibold text-stone-900">
              ₹{pricing.platform_fee.toFixed(2)}
            </span>
          </div>

          {pricing.tip_amount > 0 && (
            <div className="flex justify-between text-amber-700 font-bold">
              <span>Rider Tip</span>
              <span>+₹{pricing.tip_amount.toFixed(2)}</span>
            </div>
          )}

          <div className="border-t border-stone-100 pt-2.5 flex justify-between items-center text-sm font-black text-stone-900">
            <span>Total Payable</span>
            <span className="text-amber-600 text-base">₹{finalTotal}</span>
          </div>
        </div>

        {/* Destination preview badge */}
        <div className="rounded-xl bg-stone-50 p-2.5 text-[11px] text-stone-600 border border-stone-200/60">
          <div className="flex items-center justify-between font-bold text-stone-800">
            <span>
              {checkout.delivery_type === "HOSTEL_BATCH"
                ? "🏢 Hostel Batch Drop"
                : "🚀 Standard Express Door"}
            </span>
            <span className="text-amber-700">{checkout.hostel_block}</span>
          </div>
          <p className="truncate mt-0.5 text-stone-500">
            {checkout.address || "Room pending"}
            {checkout.landmark ? ` • Ref: ${checkout.landmark}` : ""}
          </p>
        </div>
      </section>

      {/* =========================================================
          5. STICKY MOBILE BOTTOM CTA BAR
      ========================================================== */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-stone-200 p-4 shadow-xl z-50">
        <div className="max-w-lg mx-auto flex items-center justify-between gap-4">
          <div>
            <p className="text-xs text-stone-500 font-medium">To Pay</p>
            <p className="text-xl font-black text-stone-900">₹{finalTotal}</p>
          </div>
          <button
            type="button"
            onClick={handlePlaceOrder}
            disabled={isSubmitting}
            className={`flex-1 py-3.5 px-6 rounded-xl font-bold text-white shadow-md active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer ${
              !canSubmit && !isSubmitting
                ? "bg-amber-600/90 hover:bg-amber-600"
                : "bg-amber-600 hover:bg-amber-700"
            }`}
          >
            {ctaButtonText}
          </button>
        </div>
      </div>

      {mockOpen && pendingPayment ? (
        <MockCheckoutModal
          amount={pendingPayment.amount}
          orderId={pendingPayment.order_id}
          busy={mockBusy}
          onSuccess={() => runMockOutcome("success")}
          onFailure={() => runMockOutcome("failure")}
          onDismiss={() => runMockOutcome("dismiss")}
        />
      ) : null}
    </>
  );
}