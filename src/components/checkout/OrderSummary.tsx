"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import MockCheckoutModal from "@/components/checkout/MockCheckoutModal";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { useCheckout } from "@/context/CheckoutContext";
import { placeOrder } from "@/services/orderService";
import { AuthHttpError } from "@/services/authFetch";
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

type PaymentUiState =
  | "idle"
  | "processing"
  | "success"
  | "failed"
  | "cancelled";

export default function OrderSummary() {
  const router = useRouter();

  const { cart, clearCart } = useCart();
  const { checkout } = useCheckout();
  const { isLoggedIn, user } = useAuth();

  const [loading, setLoading] = useState(false);
  const [paymentState, setPaymentState] = useState<PaymentUiState>("idle");
  const [statusMessage, setStatusMessage] = useState("");
  const [mockOpen, setMockOpen] = useState(false);
  const [mockBusy, setMockBusy] = useState(false);
  const [pendingPayment, setPendingPayment] =
    useState<CreatePaymentResponse | null>(null);

  const subtotal = cart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );
  const deliveryFee = cart.length > 0 ? 40 : 0;
  const total = subtotal + deliveryFee;

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
    router.push(`/order-success?orderId=${orderId}`);
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
      router.push("/login");
      return;
    }

    if (!user?.phone) {
      alert(
        "Your account is missing a phone number. Please log out and log in again."
      );
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

    if (!checkout.city.trim()) {
      alert("Please enter the city.");
      return;
    }

    if (!/^[0-9]{6}$/.test(checkout.pincode)) {
      alert("Please enter a valid 6-digit PIN code.");
      return;
    }

    const restaurantEmail =
      checkout.restaurant_email.trim() ||
      cart.find((item) => item.restaurant_email)?.restaurant_email ||
      "";

    if (!restaurantEmail) {
      alert(
        "Restaurant information is missing. Please go back to the restaurant and try again."
      );
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

      const fullAddress =
        `${checkout.address}, ${checkout.city} - ${checkout.pincode}` +
        (checkout.landmark.trim() ? `, ${checkout.landmark}` : "");

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
        total,
        latitude: checkout.latitude,
        longitude: checkout.longitude,
        restaurant_latitude: checkout.restaurant_latitude,
        restaurant_longitude: checkout.restaurant_longitude,
        delivery_for: checkout.delivery_for,
      };

      const response = await placeOrder(orderData);
      const orderId = response.id as string;

      if (isCod) {
        clearCart();
        router.push(`/order-success?orderId=${orderId}`);
        return;
      }

      const config = await getRazorpayConfig();
      if (!config.enabled || !config.key_id) {
        throw new Error(
          "Online payment is not configured. Please use COD or try again later."
        );
      }

      const payment = await createRazorpayPayment(orderId, total);
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
            await cancelRazorpayPayment(
              orderId,
              reason || "payment_failed"
            );
          } catch {
            // Best-effort; webhook may still update status.
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
            // Best-effort cancel; order remains unpaid.
          }
          setPaymentState("cancelled");
          setStatusMessage("Payment Cancelled");
          setPendingPayment(null);
          setLoading(false);
        },
      });
    } catch (error) {
      console.error("Place Order Error:", error);

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
        ? `Retry Pay Online • ₹${total.toFixed(2)}`
        : `Place COD Order • ₹${total.toFixed(2)}`;
    }
    if (paymentState === "cancelled") {
      return `Pay Online • ₹${total.toFixed(2)}`;
    }
    if (isOnline) return `Pay Online • ₹${total.toFixed(2)}`;
    return `Place COD Order • ₹${total.toFixed(2)}`;
  })();

  return (
    <section className="rounded-2xl border bg-white p-6 shadow-sm">
      <h2 className="mb-6 text-2xl font-bold">Order Summary</h2>

      <div className="space-y-4">
        {cart.map((item) => (
          <div key={item.id} className="flex justify-between gap-4">
            <span className="text-gray-700">
              {item.name} × {item.quantity}
            </span>
            <span className="font-medium">
              ₹{(item.price * item.quantity).toFixed(2)}
            </span>
          </div>
        ))}
      </div>

      <hr className="my-5" />

      <div className="flex justify-between">
        <span className="text-gray-600">Subtotal</span>
        <span>₹{subtotal.toFixed(2)}</span>
      </div>

      <div className="mt-3 flex justify-between">
        <span className="text-gray-600">Delivery Fee</span>
        <span>₹{deliveryFee.toFixed(2)}</span>
      </div>

      <hr className="my-5" />

      <div className="flex justify-between text-xl font-bold">
        <span>Total</span>
        <span className="text-orange-600">₹{total.toFixed(2)}</span>
      </div>

      <div className="mt-6 rounded-xl bg-gray-50 p-4">
        <p className="text-sm font-semibold text-gray-700">Delivering to</p>
        <p className="mt-1 text-sm font-medium text-gray-900">
          {checkout.customer_name || "Recipient"}
        </p>
        <p className="text-sm text-gray-500">
          {checkout.phone || "Mobile number"}
        </p>
        <p className="mt-2 text-sm text-gray-500">
          {checkout.address
            ? `${checkout.address}, ${checkout.city} - ${checkout.pincode}`
            : "Delivery address not entered"}
        </p>

        {checkout.delivery_for === "someone_else" && (
          <p className="mt-3 text-xs font-semibold text-orange-600">
            Order for someone else
          </p>
        )}

        {checkout.latitude !== null && checkout.longitude !== null ? (
          <p className="mt-2 text-xs font-semibold text-green-600">
            GPS location available
          </p>
        ) : (
          <p className="mt-2 text-xs text-gray-400">GPS location not available</p>
        )}
      </div>

      <div className="mt-4 rounded-xl bg-orange-50 p-4">
        <p className="text-xs font-medium text-orange-700">Payment Method</p>
        <p className="mt-1 font-semibold text-gray-900">
          {formatPaymentMethod(checkout.payment_method)}
        </p>
        <p className="mt-1 text-xs text-gray-600">
          {isOnline
            ? "Pay online via Razorpay. CampusBite confirms payment only after signature verification."
            : "Pay cash to the delivery partner. Payment stays pending until delivery."}
        </p>

        {isCod && !checkout.cod_confirmed ? (
          <p className="mt-2 text-xs font-medium text-red-600">
            Confirm COD in the payment section to place this order.
          </p>
        ) : null}

        {isOnline && !checkout.online_confirmed ? (
          <p className="mt-2 text-xs font-medium text-red-600">
            Confirm online payment in the payment section to continue.
          </p>
        ) : null}

        {statusMessage ? (
          <p
            className={`mt-3 text-sm font-semibold ${
              paymentState === "success"
                ? "text-green-700"
                : paymentState === "failed"
                  ? "text-red-700"
                  : paymentState === "cancelled"
                    ? "text-amber-700"
                    : "text-orange-700"
            }`}
          >
            {statusMessage}
          </p>
        ) : null}
      </div>

      <Button
        className="mt-6 w-full bg-orange-500 hover:bg-orange-600"
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
