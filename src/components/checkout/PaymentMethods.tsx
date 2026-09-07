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
    <div className="space-y-3">
      <div>
        <h2 className="text-lg font-bold text-stone-900">Payment Method</h2>
        <p className="text-xs text-stone-500">
          Choose your preferred mode of payment
        </p>
      </div>

      {configError ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
          {configError}
        </div>
      ) : null}

      <div className="space-y-2">
        {/* COD Option */}
        <label
          className={`flex cursor-pointer items-center justify-between rounded-xl border p-3 transition-all ${
            isCod
              ? "border-amber-500 bg-amber-50/60 shadow-2xs ring-1 ring-amber-500/20"
              : "border-stone-200 bg-white hover:border-amber-300"
          }`}
        >
          <div className="flex items-center gap-3">
            <input
              type="radio"
              name="payment"
              className="accent-amber-600"
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
              <div className="flex items-center gap-2">
                <span className="text-base">💵</span>
                <h3 className="text-xs font-bold text-stone-900">
                  Cash on Delivery (COD)
                </h3>
              </div>
              <p className="mt-0.5 text-[11px] text-stone-500">
                Pay in cash directly to student courier on arrival
              </p>
            </div>
          </div>
        </label>

        {/* Online Payment Option */}
        <label
          className={`flex items-center justify-between rounded-xl border p-3 transition-all ${
            !onlineEnabled
              ? "cursor-not-allowed border-dashed border-stone-200 bg-stone-50 opacity-60"
              : isOnline
              ? "cursor-pointer border-amber-500 bg-amber-50/60 shadow-2xs ring-1 ring-amber-500/20"
              : "cursor-pointer border-stone-200 bg-white hover:border-amber-300"
          }`}
        >
          <div className="flex items-center gap-3">
            <input
              type="radio"
              name="payment"
              className="accent-amber-600"
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
              <div className="flex items-center gap-2">
                <span className="text-base">💳</span>
                <h3
                  className={`text-xs font-bold ${
                    onlineEnabled ? "text-stone-900" : "text-stone-500"
                  }`}
                >
                  Online Payment (UPI / Cards / Net Banking)
                </h3>
                {onlineEnabled && (
                  <span className="rounded-md bg-emerald-100 px-1.5 py-0.2 text-[10px] font-bold text-emerald-800">
                    Fastest
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-[11px] text-stone-500">
                {onlineEnabled
                  ? "Instant confirmation via Razorpay UPI / Cards"
                  : "Online payment setup in progress."}
              </p>
            </div>
          </div>
        </label>

        {/* Confirmation Checkboxes */}
        {isCod && (
          <label className="flex cursor-pointer items-start gap-2.5 rounded-xl bg-stone-50 p-2.5 border border-stone-200/80 text-xs">
            <input
              type="checkbox"
              className="mt-0.5 accent-amber-600"
              checked={checkout.cod_confirmed}
              onChange={(e) =>
                setCheckout((prev) => ({
                  ...prev,
                  payment_method: COD_PAYMENT_METHOD,
                  cod_confirmed: e.target.checked,
                }))
              }
            />
            <span className="text-stone-700 text-[11px] leading-tight">
              I confirm I will pay <strong>Cash on Delivery (₹)</strong> upon courier arrival.
            </span>
          </label>
        )}

        {isOnline && onlineEnabled && (
          <label className="flex cursor-pointer items-start gap-2.5 rounded-xl bg-stone-50 p-2.5 border border-stone-200/80 text-xs">
            <input
              type="checkbox"
              className="mt-0.5 accent-amber-600"
              checked={checkout.online_confirmed}
              onChange={(e) =>
                setCheckout((prev) => ({
                  ...prev,
                  payment_method: ONLINE_PAYMENT_METHOD,
                  online_confirmed: e.target.checked,
                }))
              }
            />
            <span className="text-stone-700 text-[11px] leading-tight">
              I confirm I will complete payment securely via Razorpay.
            </span>
          </label>
        )}
      </div>
    </div>
  );
}