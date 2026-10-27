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
import {
  calculateCheckoutPricing,
  calculateCodRounding,
  getCalibratedAppPrice,
  type DeliveryMode,
  type CartItemInput,
  PLATFORM_FEE_DELIVERY,
  PLATFORM_FEE_TAKEAWAY,
} from "@/lib/pricingEngine";
import {
  COD_PAYMENT_METHOD,
  ONLINE_PAYMENT_METHOD,
} from "@/lib/paymentLabels";
import {
  openRazorpayCheckout,
  type RazorpayCheckoutSuccess,
} from "@/lib/razorpayCheckout";
import {
  cancelRazorpayPayment,
  createRazorpayPayment,
  getRazorpayConfig,
  mockCompleteRazorpayCheckout,
  verifyRazorpayPayment,
  type CreatePaymentResponse,
} from "@/services/paymentService";
import { validateCouponCode } from "@/services/adminService";
import { getRestaurantByEmail } from "@/services/restaurantService";
import { useMemo, useRef } from "react";

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
  const [isSubmittingState, setIsSubmitting] = useState(false);
  const [paymentState, setPaymentState] = useState<PaymentUiState>("idle");
  const [statusMessage, setStatusMessage] = useState("");
  const [mockOpen, setMockOpen] = useState(false);
  const [mockBusy, setMockBusy] = useState(false);
  const [pendingPayment, setPendingPayment] =
    useState<CreatePaymentResponse | null>(null);
  const [currentOrderId, setCurrentOrderId] = useState("");
  const [currentPayableAmount, setCurrentPayableAmount] = useState(0);
  const activeOrderIdRef = useRef("");

  const [couponCodeInput, setCouponCodeInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    discount_amount: number;
    discount_type: string;
    discount_value: number;
  } | null>(null);
  const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);

  async function handleApplyCoupon(e?: React.FormEvent) {
    if (e) e.preventDefault();
    const cleanCode = couponCodeInput.trim().toUpperCase();
    if (!cleanCode) {
      toast.error("Please enter a coupon code.");
      return;
    }
    try {
      setIsValidatingCoupon(true);
      const res = await validateCouponCode(cleanCode, pricing.appSubtotal);
      if (res.valid) {
        setAppliedCoupon({
          code: res.code,
          discount_amount: res.discount_amount,
          discount_type: res.discount_type,
          discount_value: res.discount_value,
        });
        toast.success(res.message || `Coupon ${res.code} applied!`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Invalid coupon code";
      toast.error(msg);
    } finally {
      setIsValidatingCoupon(false);
    }
  }

  function handleRemoveCoupon() {
    setAppliedCoupon(null);
    setCouponCodeInput("");
    toast.info("Coupon removed.");
  }

  const cartInput: CartItemInput[] = useMemo(
    () =>
      cart.map((item) => ({
        id: String(item.id),
        name: item.name,
        counterPrice: item.price,
        quantity: item.quantity,
      })),
    [cart]
  );

  const normType = String(checkout.delivery_type || "delivery").toLowerCase();
  const isTakeaway =
    normType === "takeaway" ||
    normType === "counter_takeaway" ||
    normType === "pickup";
  const effectiveMode: DeliveryMode = isTakeaway ? "COUNTER_TAKEAWAY" : "HOSTEL_BATCH";

  const pricing = useMemo(() => {
    if (cartInput.length === 0) {
      return {
        appSubtotal: 0,
        gstAmount: 0,
        platformTechFee: 0,
        deliveryFee: 0,
        smallOrderFee: 0,
        small_order_fee: 0,
        isBelowMinDelivery: false,
        minDeliveryError: undefined,
        is_below_min_delivery: false,
        min_delivery_error: undefined,
        totalStudentPayable: 0,
        isMicroCart: false,
        amountToUnlockExpress: 0,
        canteenPayout: { baseFood: 0, gstPassThrough: 0, totalDisbursal: 0 },
        allowedDeliveryModes: ["HOSTEL_BATCH", "COUNTER_TAKEAWAY"] as DeliveryMode[],
      };
    }
    return calculateCheckoutPricing(cartInput, effectiveMode);
  }, [cartInput, effectiveMode]);

  const isDelivery = !isTakeaway;
  const isBelowMinDelivery = false;
  const missingToMinDelivery = 0;

  const isCod = checkout.payment_method === COD_PAYMENT_METHOD;
  const isOnline = checkout.payment_method === ONLINE_PAYMENT_METHOD;
  const paymentMethod = isCod ? "cod" : "online";

  const isSubmitting = isSubmittingState || loading || paymentState === "processing";

  const canSubmit =
    cart.length > 0 &&
    !isSubmitting &&
    paymentState !== "success" &&
    (isCod ? checkout.cod_confirmed : checkout.online_confirmed);

  function finishSuccess(orderId: string) {
    setPaymentState("success");
    setStatusMessage("Payment Successful");
    toast.success("Order placed successfully", {
      description: "We'll notify you as your order progresses.",
    });
    clearCart();
    const safeId = orderId && orderId !== "undefined" ? orderId : "";
    router.push(safeId ? `${ROUTES.ORDER_SUCCESS}?orderId=${safeId}` : ROUTES.ORDER_SUCCESS);
  }


  async function handleVerifiedOnline(orderId: string) {
    setMockOpen(false);
    setPendingPayment(null);
    finishSuccess(orderId);
  }

  const handleOnlineSuccess = async (rzp: RazorpayCheckoutSuccess) => {
    const activeId = activeOrderIdRef.current || currentOrderId || pendingPayment?.order_id || "";
    try {
      setPaymentState("processing");
      setStatusMessage("Processing your payment");
      const verified = await verifyRazorpayPayment({
        order_id: activeId,
        razorpay_order_id: rzp.razorpay_order_id,
        razorpay_payment_id: rzp.razorpay_payment_id,
        razorpay_signature: rzp.razorpay_signature,
      });

      if (verified.payment_status !== "paid") {
        throw new Error("Payment was not confirmed by CampusBite.");
      }

      await handleVerifiedOnline(activeId);
    } catch (error) {
      setPaymentState("failed");
      setStatusMessage(
        error instanceof Error ? error.message : "Payment Failed"
      );
    } finally {
      setIsSubmitting(false);
      setLoading(false);
    }
  };

  const handleOnlineFailure = async (reason?: string) => {
    const activeId = activeOrderIdRef.current || currentOrderId || pendingPayment?.order_id || "";
    try {
      if (activeId) {
        await cancelRazorpayPayment(activeId, reason || "payment_failed");
      }
    } catch {
      // Best effort
    }
    setPaymentState("failed");
    setStatusMessage("Payment Failed");
    setPendingPayment(null);
    setIsSubmitting(false);
    setLoading(false);
  };

  const handleOnlineDismiss = async () => {
    setIsSubmitting(false);
    setLoading(false);
    setPaymentState("idle");
    setStatusMessage("");
    setPendingPayment(null);

    const activeId = activeOrderIdRef.current || currentOrderId || pendingPayment?.order_id || "";
    try {
      if (activeId) {
        await cancelRazorpayPayment(activeId, "checkout_dismissed");
      }
    } catch {
      // Best effort
    }
  };

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
    if (isSubmitting) {
      return;
    }

    if (isBelowMinDelivery) {
      toast.error(
        "Minimum cart for hostel delivery is ₹35.00. Add items or switch to Counter Takeaway."
      );
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
      toast.error("Please select a campus delivery spot.");
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

    const hasInactiveItem = cart.some(
      (item) => (item as any).is_accepting_orders === false
    );
    if (hasInactiveItem) {
      toast.error("This canteen is currently not accepting orders.");
      return;
    }

    try {
      const rest = await getRestaurantByEmail(restaurantEmail);
      if (rest && rest.is_accepting_orders === false) {
        toast.error("This canteen is currently not accepting orders.");
        return;
      }
    } catch {
      // Best effort pre-check; backend order placement will enforce
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
      setIsSubmitting(true);
      setLoading(true);
      setPaymentState(isOnline ? "processing" : "idle");
      setStatusMessage(isOnline ? "Processing your payment" : "");

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

      const discountDeduction = appliedCoupon ? appliedCoupon.discount_amount : 0;
      const unroundedPayable = Number(
        Math.max(
          0,
          pricing.totalStudentPayable + Number(checkout.tip_amount || 0) - discountDeduction
        ).toFixed(2)
      );
      const { roundedTotal: codRoundedTotal, roundOff: codRoundOff } =
        calculateCodRounding(unroundedPayable);
      const finalPayableNum = isCod ? codRoundedTotal : unroundedPayable;

      const orderData = {
        restaurant_email: restaurantEmail,
        customer_name: effectiveName.trim(),
        phone: deliveryPhone.replace(/\D/g, ""),
        address: isTakeaway ? "Canteen Counter (Self Pickup)" : fullAddress,
        payment_method: isOnline ? ONLINE_PAYMENT_METHOD : COD_PAYMENT_METHOD,
        items: cart,
        total: finalPayableNum,
        total_amount: finalPayableNum,
        round_off: isCod ? codRoundOff : 0,
        coupon_code: appliedCoupon ? appliedCoupon.code : null,
        discount_amount: discountDeduction,
        fulfillment_mode: isTakeaway ? "takeaway" : "delivery",
        delivery_location: isTakeaway ? "Canteen Counter (Self Pickup)" : fullAddress,
        delivery_for: checkout.delivery_for,
        delivery_type: effectiveMode,
        hostel_block: isTakeaway ? null : checkout.hostel_block,
        tip_amount: isTakeaway ? 0 : checkout.tip_amount,
        pricing_breakdown: {
          ...pricing,
          fulfillment_mode: isTakeaway ? "takeaway" : "delivery",
          codRounding: isCod
            ? { roundedTotal: codRoundedTotal, roundOff: codRoundOff }
            : undefined,
        },
        latitude: checkout.latitude,
        longitude: checkout.longitude,
        restaurant_latitude: checkout.restaurant_latitude,
        restaurant_longitude: checkout.restaurant_longitude,
      };

      const response = await placeOrder(orderData);
      const orderId = response._id || response.id || "";
      activeOrderIdRef.current = orderId;

      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("cb_last_order", JSON.stringify(response));
          if (orderId) {
            localStorage.setItem("cb_active_order_id", orderId);
          }
        } catch {
          // ignore
        }
      }

      if (isCod) {
        clearCart();
        const safeId = orderId && orderId !== "undefined" ? orderId : "";
        router.push(safeId ? `${ROUTES.ORDER_SUCCESS}?orderId=${safeId}` : ROUTES.ORDER_SUCCESS);
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
        finalPayableNum
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

      setCurrentOrderId(orderId);
      setCurrentPayableAmount(finalPayableNum);

      awaitingCheckoutModal = true;
      setStatusMessage("Opening Payment Gateway...");

      await openRazorpayCheckout({
        keyId: config.key_id,
        payment: {
          ...payment,
          razorpayOrder: { id: payment.razorpay_order_id },
        },
        customerName: orderData.customer_name,
        customerEmail: user?.email,
        customerPhone: deliveryPhone,
        description: `CampusBite order ${orderId}`,
        onSuccess: handleOnlineSuccess,
        onFailure: handleOnlineFailure,
        onDismiss: handleOnlineDismiss,
      });
    } catch (error) {
      setIsSubmitting(false);
      setLoading(false);
      awaitingCheckoutModal = false;
      if (error instanceof AuthHttpError && error.status === 401) {
        return;
      }

      setPaymentState("failed");
      const errorMsg = error instanceof Error ? error.message : "Payment Failed";
      setStatusMessage(errorMsg);

      if (errorMsg.toLowerCase().includes("not accepting orders")) {
        toast.error("This canteen is currently not accepting orders.");
      } else {
        toast.error(
          error instanceof Error
            ? error.message
            : "Failed to place order. Please check that the backend is running and try again."
        );
      }
    } finally {
      if (!awaitingCheckoutModal) {
        setIsSubmitting(false);
        setLoading(false);
      }
    }
  }

  const discountDeduction = appliedCoupon ? appliedCoupon.discount_amount : 0;
  const unroundedPayable = Number(
    Math.max(
      0,
      pricing.totalStudentPayable + Number(checkout.tip_amount || 0) - discountDeduction
    ).toFixed(2)
  );

  const { roundedTotal, roundOff } = useMemo(
    () => calculateCodRounding(unroundedPayable),
    [unroundedPayable]
  );

  const formattedFinalTotal = isCod ? `${roundedTotal}` : unroundedPayable.toFixed(2);

  const ctaButtonText = (() => {
    if (isSubmitting) return isOnline ? "Processing your payment..." : "Placing Order...";
    if (paymentState === "success") return "Payment Successful";
    if (paymentState === "failed") {
      return isOnline ? "Retry Online Payment" : "Retry COD Order";
    }
    return `Place Order • ₹${formattedFinalTotal}`;
  })();

  return (
    <>
      <section className="rounded-2xl border border-gray-200/80 bg-white p-3.5 shadow-2xs space-y-3 font-sans">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-gray-900">Order Summary</h2>
          <span className="text-[11px] text-gray-500 font-medium">
            {cart.length} {cart.length === 1 ? "item" : "items"}
          </span>
        </div>

        {/* Segmented Mode Switcher (Delivery vs Takeaway) */}
        <div className="bg-gray-100 p-1 rounded-xl flex gap-1 mb-3" role="group" aria-label="Fulfillment mode">
          <button
            type="button"
            aria-label="Campus Delivery"
            onClick={() =>
              setCheckout((prev) => ({
                ...prev,
                delivery_type: "HOSTEL_BATCH",
                hostel_block:
                  prev.hostel_block === "Zeal Main Canteen Pickup"
                    ? "Boys Hostel 1 Gate"
                    : prev.hostel_block || "Boys Hostel 1 Gate",
              }))
            }
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1.5 cursor-pointer ${
              !isTakeaway
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-800"
            }`}
          >
            <span>🛵</span> Delivery <span className="text-[10px] text-orange-600 font-bold bg-orange-50 px-1.5 py-0.5 rounded">₹15</span>
          </button>

          <button
            type="button"
            aria-label="Takeaway"
            onClick={() =>
              setCheckout((prev) => ({
                ...prev,
                delivery_type: "COUNTER_TAKEAWAY",
                hostel_block: "Zeal Main Canteen Pickup",
              }))
            }
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1.5 cursor-pointer ${
              isTakeaway
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-800"
            }`}
          >
            <span>🥡</span> Takeaway <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-1.5 py-0.5 rounded">FREE</span>
          </button>
        </div>

        {/* Cart Items List */}
        <div className="space-y-1.5 border-b border-gray-100 pb-2.5">
          {cart.map((item) => {
            const calibratedUnit = getCalibratedAppPrice(item.price);
            return (
              <div
                key={item.id}
                className="flex justify-between items-center text-xs"
              >
                <span className="text-gray-700 font-medium truncate max-w-[220px]">
                  {item.name} × {item.quantity}
                </span>
                <span className="font-semibold text-gray-900">
                  ₹{(calibratedUnit * item.quantity).toFixed(2)}
                </span>
              </div>
            );
          })}
        </div>

        {/* Courier Tip Selector - Compact Inline Pills */}
        <div className="rounded-xl border border-orange-100 bg-orange-50/40 p-2.5">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-bold text-gray-800 flex items-center gap-1">
              🛵 Rider Tip
            </span>
            <span className="text-[10px] font-bold text-orange-700">
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
                    ? "bg-orange-600 text-white shadow-2xs"
                    : "bg-white text-gray-700 border border-gray-200/80 hover:border-orange-300"
                }`}
              >
                {tip.label}
              </button>
            ))}
          </div>
        </div>

        {/* Apply Promo / Voucher Coupon Box */}
        <div className="rounded-xl border border-gray-200/80 bg-gray-50/70 p-2.5">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
              <span>🎟️</span> Promo Coupon
            </span>
            {appliedCoupon && (
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                Saved ₹{appliedCoupon.discount_amount.toFixed(2)}
              </span>
            )}
          </div>

          {appliedCoupon ? (
            <div className="flex items-center justify-between bg-white border border-emerald-200 rounded-xl px-3 py-1.5">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-black tracking-wide text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                  {appliedCoupon.code}
                </span>
                <span className="text-xs font-semibold text-emerald-700">
                  -₹{appliedCoupon.discount_amount.toFixed(2)} OFF
                </span>
              </div>
              <button
                type="button"
                onClick={handleRemoveCoupon}
                className="text-xs font-bold text-gray-400 hover:text-rose-600 transition cursor-pointer"
              >
                Remove
              </button>
            </div>
          ) : (
            <form onSubmit={handleApplyCoupon} className="flex gap-2">
              <input
                type="text"
                value={couponCodeInput}
                onChange={(e) => setCouponCodeInput(e.target.value.toUpperCase())}
                placeholder="Enter code (e.g. CAMPUS30)"
                className="flex-1 h-8.5 px-3 rounded-lg border border-gray-200 bg-white text-xs font-mono font-bold uppercase text-gray-900 placeholder:normal-case placeholder:font-normal placeholder:text-gray-400 focus:border-orange-500 focus:outline-none"
              />
              <button
                type="submit"
                disabled={isValidatingCoupon || !couponCodeInput.trim()}
                className="h-8.5 px-3.5 rounded-lg bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold transition disabled:opacity-50 cursor-pointer"
              >
                {isValidatingCoupon ? "Checking..." : "Apply"}
              </button>
            </form>
          )}
        </div>

        {/* Bill Breakdown from pricingEngine */}
        <div className="space-y-1.5 text-xs text-gray-600">
          <div className="flex justify-between">
            <span>Items Subtotal</span>
            <span className="font-semibold text-gray-900">
              ₹{pricing.appSubtotal.toFixed(2)}
            </span>
          </div>

          <div className="flex justify-between">
            <span>Food GST (5%)</span>
            <span className="font-semibold text-gray-900">
              ₹{pricing.gstAmount.toFixed(2)}
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span>Packaging</span>
            <span className="font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded text-[11px]">
              ₹0.00 (Free)
            </span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span>Delivery Fee</span>
              {!isTakeaway ? (
                <span className="rounded-full bg-emerald-100 px-1.5 py-0.2 text-[10px] font-bold text-emerald-700">
                  Campus Delivery (₹15)
                </span>
              ) : (
                <span className="rounded-full bg-blue-100 px-1.5 py-0.2 text-[10px] font-bold text-blue-700">
                  Self Pickup (₹0)
                </span>
              )}
            </div>
            <span className="font-semibold text-gray-900">
              ₹{pricing.deliveryFee.toFixed(2)}
            </span>
          </div>

          <div className="flex justify-between">
            <span>Platform Fee</span>
            <span className="font-semibold text-gray-900">
              ₹{pricing.platformTechFee.toFixed(2)}
            </span>
          </div>

          {Number(checkout.tip_amount || 0) > 0 && !isTakeaway && (
            <div className="flex justify-between text-orange-700 font-bold">
              <span>Rider Tip</span>
              <span>+₹{Number(checkout.tip_amount || 0).toFixed(2)}</span>
            </div>
          )}

          {discountDeduction > 0 && (
            <div className="flex justify-between text-emerald-600 font-bold">
              <span>Coupon Discount ({appliedCoupon?.code})</span>
              <span>-₹{discountDeduction.toFixed(2)}</span>
            </div>
          )}

          {/* COD Round Off Line Item */}
          {isCod && (
            <div className="flex justify-between text-gray-600">
              <div className="flex items-center gap-1">
                <span>Round Off</span>
                <span className="text-[10px] text-gray-400">(Cash Payment)</span>
              </div>
              <span className="font-semibold text-gray-900">
                {roundOff > 0
                  ? `+₹${roundOff.toFixed(2)}`
                  : roundOff < 0
                  ? `-₹${Math.abs(roundOff).toFixed(2)}`
                  : "₹0.00"}
              </span>
            </div>
          )}

          <div className="border-t border-gray-100 pt-2 flex justify-between items-center text-sm font-black text-gray-900">
            <span>Total Payable</span>
            <span className="text-orange-600 text-base">₹{formattedFinalTotal}</span>
          </div>
        </div>

        {/* Destination preview badge */}
        <div className="rounded-xl bg-gray-50 p-2 text-[11px] text-gray-600 border border-gray-200/60">
          <div className="flex items-center justify-between font-bold text-gray-800">
            <span>
              {isTakeaway
                ? "🛍️ Quick Self-Pickup (Takeaway)"
                : "🛵 Campus Delivery"}
            </span>
            <span className="text-orange-700 font-semibold">
              {isTakeaway ? "Canteen Counter" : checkout.hostel_block}
            </span>
          </div>
          <p className="truncate mt-0.5 text-gray-500">
            {isTakeaway
              ? "Skip the counter queue • Pick up when ready"
              : checkout.address || "Hostel Lobby Drop"}
            {!isTakeaway && checkout.landmark ? ` • Ref: ${checkout.landmark}` : ""}
          </p>
        </div>
      </section>

      {/* =========================================================
          5. STICKY MOBILE BOTTOM CTA BAR
      ========================================================== */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-gray-200 p-3 sm:p-4 shadow-xl z-50 font-sans">
        <div className="max-w-lg mx-auto space-y-2">
          {isSubmitting && isOnline && (
            <div className="flex items-center justify-center gap-2 py-1.5 px-3 rounded-xl bg-orange-50 border border-orange-200/80 text-xs font-semibold text-orange-800 animate-pulse">
              <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-orange-600 border-t-transparent" />
              <span>Processing your payment... Please do not refresh.</span>
            </div>
          )}
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">To Pay</p>
              <p className="text-xl font-black text-gray-900">₹{formattedFinalTotal}</p>
            </div>
            <button
              type="button"
              onClick={handlePlaceOrder}
              disabled={isSubmitting || !canSubmit}
              aria-label={`Place ${paymentMethod.toUpperCase()} Order • ₹${formattedFinalTotal}`}
              className={`flex-1 py-3 px-5 rounded-xl font-bold text-white shadow-sm active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer ${
                !canSubmit
                  ? "bg-orange-600/50 cursor-not-allowed text-white/80"
                  : "bg-orange-600 hover:bg-orange-700"
              }`}
            >
              {ctaButtonText}
            </button>
          </div>
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