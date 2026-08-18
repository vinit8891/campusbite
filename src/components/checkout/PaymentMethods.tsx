"use client";

import { useEffect, useState } from "react";

import { useCheckout } from "@/context/CheckoutContext";
import {
  COD_PAYMENT_METHOD,
  ONLINE_PAYMENT_METHOD,
} from "@/lib/paymentLabels";
import {
  getRazorpayConfig,
  type RazorpayPublicConfig,
} from "@/services/paymentService";

export default function PaymentMethods() {
  const { checkout, setCheckout } = useCheckout();
  const [config, setConfig] = useState<RazorpayPublicConfig | null>(null);
  const [configError, setConfigError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadConfig() {
      try {
        const data = await getRazorpayConfig();
        if (!cancelled) {
          setConfig(data);
          setConfigError("");
        }
      } catch {
        if (!cancelled) {
          setConfig(null);
          setConfigError(
            "Online payment config unavailable. You can still use COD."
          );
        }
      }
    }

    loadConfig();
    return () => {
      cancelled = true;
    };
  }, []);

  const onlineEnabled = Boolean(config?.enabled && config.key_id);
  const isOnline = checkout.payment_method === ONLINE_PAYMENT_METHOD;
  const isCod = checkout.payment_method === COD_PAYMENT_METHOD;

  return (
    <div>
      <h2 className="mb-2 text-2xl font-bold">Payment Method</h2>
      <p className="mb-6 text-sm text-gray-500">
        Choose how you'd like to pay for your order.
        {config?.mode === "mock" && onlineEnabled
          ? " Mock mode is active for local testing."
          : null}
      </p>

      {configError ? (
        <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          {configError}
        </div>
      ) : null}

      <div className="space-y-4">
        <label
          className={`flex cursor-pointer items-start gap-4 rounded-2xl border-2 p-5 transition ${
            isCod
              ? "border-orange-500 bg-orange-50"
              : "border-gray-200 bg-white hover:border-orange-300"
          }`}
        >
          <input
            type="radio"
            name="payment"
            className="sr-only"
            checked={isCod}
            onChange={() =>
              setCheckout((prev) => ({
                ...prev,
                payment_method: COD_PAYMENT_METHOD,
                online_confirmed: false,
              }))
            }
          />

          <div className="text-3xl">💵</div>

          <div>
            <h3 className="font-semibold text-gray-900">
              Cash on Delivery (COD)
            </h3>
            <p className="mt-1 text-sm text-gray-600">
              Pay in cash directly to the delivery partner when your order is
              delivered. Payment stays pending until delivery.
            </p>
          </div>
        </label>

        <label
          className={`flex items-start gap-4 rounded-2xl border-2 p-5 transition ${
            !onlineEnabled
              ? "cursor-not-allowed border-dashed border-gray-200 bg-gray-50 opacity-70"
              : isOnline
                ? "cursor-pointer border-orange-500 bg-orange-50"
                : "cursor-pointer border-gray-200 bg-white hover:border-orange-300"
          }`}
        >
          <input
            type="radio"
            name="payment"
            className="sr-only"
            disabled={!onlineEnabled}
            checked={isOnline}
            onChange={() =>
              setCheckout((prev) => ({
                ...prev,
                payment_method: ONLINE_PAYMENT_METHOD,
                cod_confirmed: false,
              }))
            }
          />

          <div className="text-3xl">💳</div>

          <div>
            <h3
              className={`font-semibold ${
                onlineEnabled ? "text-gray-900" : "text-gray-500"
              }`}
            >
              Online Payment (UPI / Card / Net Banking)
              {onlineEnabled ? (
                <span className="ml-2 rounded-full bg-green-100 px-2 py-1 text-[10px] font-bold text-green-700">
                  Recommended
                </span>
              ) : null}
            </h3>
            <p className="mt-1 text-sm text-gray-600">
              {onlineEnabled
                ? "Pay securely using UPI, Cards, Wallets, or Net Banking via Razorpay. Your order will be confirmed after successful payment verification."
                : "Online payment is not configured yet. Set Razorpay test keys on the server."}
            </p>
            {onlineEnabled && config?.mode === "test" ? (
              <p className="mt-1 text-xs text-green-700">
                Razorpay test mode ready (public key loaded
                {config.webhook_configured
                  ? "; webhook secret configured on server"
                  : "; set RAZORPAY_WEBHOOK_SECRET for webhooks"}
                ).
              </p>
            ) : null}
          </div>
        </label>

        {isCod ? (
          <label className="flex cursor-pointer items-start gap-3 rounded-2xl bg-gray-50 p-4">
            <input
              type="checkbox"
              className="mt-1"
              checked={checkout.cod_confirmed}
              onChange={(e) =>
                setCheckout((prev) => ({
                  ...prev,
                  payment_method: COD_PAYMENT_METHOD,
                  cod_confirmed: e.target.checked,
                }))
              }
            />
            <span className="text-sm text-gray-700">
              I confirm I will pay{" "}
              <strong>Cash on Delivery</strong> when the order arrives.
            </span>
          </label>
        ) : null}

        {isOnline && onlineEnabled ? (
          <label className="flex cursor-pointer items-start gap-3 rounded-2xl bg-gray-50 p-4">
            <input
              type="checkbox"
              className="mt-1"
              checked={checkout.online_confirmed}
              onChange={(e) =>
                setCheckout((prev) => ({
                  ...prev,
                  payment_method: ONLINE_PAYMENT_METHOD,
                  online_confirmed: e.target.checked,
                }))
              }
            />
            <span className="text-sm text-gray-700">
              I understand payment is confirmed only after Razorpay verification
              by CampusBite (not by the checkout popup alone).
            </span>
          </label>
        ) : null}
      </div>
    </div>
  );
}