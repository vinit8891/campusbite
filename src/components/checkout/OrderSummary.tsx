"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
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
  formatPaymentMethod,
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

const TIP_OPTIONS = [0, 10, 20, 30];

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
      alert("Please log in to place an order.");
      router.push(ROUTES.LOGIN);
      return;
    }

    if (!user?.phone) {
      alert("Your account is missing a phone number. Please log in again.");
      return;
    }

    if (cart.length === 0) {
      alert("Your cart is empty.");
      return;
    }

    if (!checkout.customer_name.trim()) {
      alert("Please enter the recipient name.");
      return;
    }

    const deliveryPhone =
      checkout.delivery_for === "someone_else" ? checkout.phone : user.phone;

    if (!/^[0-9]{10}$/.test(deliveryPhone)) {
      alert("Please enter a valid 10-digit mobile number.");
      return;
    }

    if (!checkout.address.trim()) {
      alert("Please enter the delivery address.");
      return;
    }

    const restaurantEmail =
      checkout.restaurant_email.trim() ||
      cart.find((item) => item.restaurant_email)?.restaurant_email ||
      "";

    if (!restaurantEmail) {
      alert("Restaurant information is missing. Please select items from a restaurant.");
      return;
    }

    if (isCod && !checkout.cod_confirmed) {
      alert("Please confirm Cash on Delivery before placing your order.");
      return;
    }

    if (isOnline && !checkout.online_confirmed) {
      alert("Please confirm Online Payment before continuing.");
      return;
    }

    let awaitingCheckoutModal = false;

    try {
      setLoading(true);
      setPaymentState(isOnline ? "processing" : "idle");
      setStatusMessage(isOnline ? "Processing Payment" : "");

      let fullAddress = checkout.address.trim();
      if (checkout.delivery_type === "HOSTEL_BATCH" && checkout.hostel_block) {
        if (!fullAddress.toLowerCase().includes(checkout.hostel_block.toLowerCase())) {
          fullAddress = `${fullAddress}, ${checkout.hostel_block}`;
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
        customer_name:
          checkout.delivery_for === "someone_else"
            ? checkout.customer_name
            : user?.name || checkout.customer_name,
        phone: deliveryPhone,
        address: fullAddress,
        payment_method: isOnline ? ONLINE_PAYMENT_METHOD : COD_PAYMENT_METHOD,
        items: cart,
        total: pricing.total_payable,
        delivery_for: checkout.delivery_for,
        delivery_type: checkout.delivery_type,
        hostel_block:
          checkout.delivery_type === "HOSTEL_BATCH" ? checkout.hostel_block : null,
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

      const payment = await createRazorpayPayment(orderId, pricing.total_payable);
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

      alert(
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

  const buttonLabel = (() => {
    if (paymentState === "processing" || loading) {
      return isOnline ? "Processing Payment…" : "Placing Order…";
    }
    if (paymentState === "success") return "Payment Successful";
    if (paymentState === "failed") {
      return isOnline
        ? `Retry Pay Online • ₹${pricing.total_payable.toFixed(2)}`
        : `Place COD Order • ₹${pricing.total_payable.toFixed(2)}`;
    }
    if (paymentState === "cancelled") {
      return `Pay Online • ₹${pricing.total_payable.toFixed(2)}`;
    }
    if (isOnline) return `Pay Online • ₹${pricing.total_payable.toFixed(2)}`;
    return `Place COD Order • ₹${pricing.total_payable.toFixed(2)}`;
  })();

  return (
    <section className="rounded-2xl border bg-white p-6 shadow-sm">
      <h2 className="mb-5 text-2xl font-bold">Order Summary</h2>

      {/* Cart Items List */}
      <div className="space-y-3">
        {cart.map((item) => (
          <div key={item.id} className="flex justify-between gap-4 text-sm">
            <span className="text-gray-700">
              {item.name} × {item.quantity}
            </span>
            <span className="font-medium">
              ₹{(item.price * item.quantity).toFixed(2)}
            </span>
          </div>
        ))}
      </div>

      <hr className="my-4" />

      {/* Bill Breakdown with Statutory GST & Platform Fee */}
      <div className="space-y-2.5 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-600">Items Total</span>
          <span className="font-medium">₹{pricing.food_subtotal.toFixed(2)}</span>
        </div>

        <div className="flex justify-between">
          <span className="text-gray-600">Restaurant GST (5%)</span>
          <span className="font-medium">₹{pricing.restaurant_gst.toFixed(2)}</span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="text-gray-600">Delivery Fee</span>
            {checkout.delivery_type === "HOSTEL_BATCH" && (
              <span className="rounded-full bg-green-100 px-1.5 py-0.5 text-[10px] font-bold text-green-700">
                Saved ₹25
              </span>
            )}
          </div>
          <span className="font-medium">₹{pricing.delivery_fee.toFixed(2)}</span>
        </div>

        <div className="flex justify-between">
          <span className="text-gray-600">Platform Tech Fee</span>
          <span className="font-medium">₹{pricing.platform_fee.toFixed(2)}</span>
        </div>

        {pricing.tip_amount > 0 && (
          <div className="flex justify-between text-orange-600 font-medium">
            <span>Rider Tip</span>
            <span>+₹{pricing.tip_amount.toFixed(2)}</span>
          </div>
        )}
      </div>

      {/* Rider Tip Selector */}
      <div className="my-4 rounded-xl border border-orange-100 bg-orange-50/60 p-3.5">
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold text-gray-800">Support Student Courier</p>
          <span className="text-[10px] font-semibold text-orange-700">100% tip to rider</span>
        </div>
        <div className="mt-2 grid grid-cols-4 gap-2">
          {TIP_OPTIONS.map((tip) => (
            <button
              key={tip}
              type="button"
              onClick={() => setCheckout((prev) => ({ ...prev, tip_amount: tip }))}
              className={`rounded-lg py-1.5 text-xs font-semibold transition ${
                checkout.tip_amount === tip
                  ? "bg-orange-600 text-white shadow-sm"
                  : "bg-white text-gray-700 border border-gray-200 hover:border-orange-300"
              }`}
            >
              {tip === 0 ? "None" : `₹${tip}`}
            </button>
          ))}
        </div>
      </div>

      <hr className="my-4" />

      {/* Grand Total */}
      <div className="flex justify-between text-xl font-bold">
        <span>To Pay</span>
        <span className="text-orange-600">₹{pricing.total_payable.toFixed(2)}</span>
      </div>

      {/* Delivering to Box */}
      <div className="mt-5 rounded-xl bg-gray-50 p-3.5 text-xs">
        <div className="flex items-center justify-between">
          <p className="font-semibold text-gray-800">
            Delivering via {checkout.delivery_type === "HOSTEL_BATCH" ? "Hostel Batch Drop" : "Standard Express"}
          </p>
          {checkout.delivery_type === "HOSTEL_BATCH" && (
            <span className="font-bold text-orange-600">{checkout.hostel_block}</span>
          )}
        </div>
        <p className="mt-1 text-gray-600">
          {checkout.customer_name || "Recipient"} • {checkout.delivery_for === "self" ? user?.phone : checkout.phone}
        </p>
        <p className="mt-1 text-gray-500 font-medium truncate">
          {checkout.address
            ? `${checkout.address}${
                checkout.delivery_type === "HOSTEL_BATCH" && checkout.hostel_block
                  ? `, ${checkout.hostel_block}`
                  : ""
              }${checkout.landmark?.trim() ? `, ${checkout.landmark.trim()}` : ""}`
            : "Address pending"}
        </p>
        {checkout.delivery_instructions?.trim() && (
          <p className="mt-1 text-[11px] text-orange-700 italic truncate">
            Note: {checkout.delivery_instructions.trim()}
          </p>
        )}
      </div>

      {/* Payment Notice */}
      <div className="mt-3 rounded-xl bg-orange-50 p-3.5 text-xs">
        <p className="font-semibold text-gray-900">{formatPaymentMethod(checkout.payment_method)}</p>
        <p className="mt-0.5 text-gray-600">
          {isOnline
            ? "Pay securely online via Razorpay."
            : "Pay cash to student courier upon arrival."}
        </p>
        {statusMessage && (
          <p className="mt-2 font-semibold text-orange-700">{statusMessage}</p>
        )}
      </div>

      <Button
        className="mt-5 w-full bg-orange-600 hover:bg-orange-700 text-white font-semibold py-2.5"
        disabled={!canSubmit}
        onClick={handlePlaceOrder}
      >
        {buttonLabel}
      </Button>

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
    </section>
  );
}