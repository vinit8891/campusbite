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
        Choose Cash on Delivery or Online Payment (Razorpay test mode).
        {config?.mode === "mock" && onlineEnabled
          ? " Mock mode is active for local testing."
          : null}
      </p>

      {configError ? (
        <p className="mb-4 text-sm text-amber-700">{configError}</p>
      ) : null}

      <div className="space-y-4">
        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-orange-200 bg-orange-50/60 p-4">
          <input
            type="radio"
            name="payment"
            className="mt-1"
            checked={isCod}
            onChange={() =>
              setCheckout((prev) => ({
                ...prev,
                payment_method: COD_PAYMENT_METHOD,
                online_confirmed: false,
              }))
            }
          />

          <div>
            <h3 className="font-semibold text-gray-900">
              Cash on Delivery (COD)
            </h3>
            <p className="mt-1 text-sm text-gray-600">
              Pay the delivery partner in cash when your order arrives.
              Payment stays pending until delivery.
            </p>
          </div>
        </label>

        <label
          className={`flex items-start gap-3 rounded-xl border p-4 ${
            onlineEnabled
              ? "cursor-pointer border-orange-200 bg-white hover:bg-orange-50/40"
              : "cursor-not-allowed border-dashed border-gray-200 bg-gray-50 opacity-70"
          }`}
        >
          <input
            type="radio"
            name="payment"
            className="mt-1"
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

          <div>
            <h3
              className={`font-semibold ${
                onlineEnabled ? "text-gray-900" : "text-gray-500"
              }`}
            >
              Online Payment (UPI / Card / Net Banking)
            </h3>
            <p className="mt-1 text-sm text-gray-600">
              {onlineEnabled
                ? "Pay securely via Razorpay. Your order is confirmed only after payment is verified by CampusBite."
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
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-gray-200 p-4">
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
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-gray-200 p-4">
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
