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
  const [, setConfig] = useState<RazorpayPublicConfig | null>(null);
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
          setConfigError("");
        }
      }
    }

    loadConfig();
    return () => {
      cancelled = true;
    };
  }, []);

  const isOnline = checkout.payment_method === ONLINE_PAYMENT_METHOD;
  const isCod = checkout.payment_method === COD_PAYMENT_METHOD;

  function selectOnline() {
    setCheckout((prev) => ({
      ...prev,
      payment_method: ONLINE_PAYMENT_METHOD,
      online_confirmed: true,
      cod_confirmed: false,
    }));
  }

  function selectCod() {
    setCheckout((prev) => ({
      ...prev,
      payment_method: COD_PAYMENT_METHOD,
      cod_confirmed: true,
      online_confirmed: false,
    }));
  }

  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-lg font-bold text-stone-900">Payment Method</h2>
        <p className="text-xs text-stone-500">
          Direct toggle • Choose instant UPI or Cash on Delivery
        </p>
      </div>

      {configError ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
          {configError}
        </div>
      ) : null}

      <div className="space-y-2.5" role="radiogroup" aria-label="Payment Method Selector">
        {/* Cash on Delivery (COD) Option */}
        <label
          onClick={selectCod}
          className={`flex cursor-pointer items-start justify-between rounded-2xl border p-3.5 transition-all ${
            isCod
              ? "border-amber-500 bg-amber-50/70 shadow-sm ring-1 ring-amber-500/30"
              : "border-stone-200 bg-white hover:border-amber-300"
          }`}
        >
          <div className="flex items-start gap-3">
            <input
              type="radio"
              name="payment"
              className="mt-1 accent-amber-600 cursor-pointer h-4 w-4"
              checked={isCod}
              onChange={selectCod}
            />
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-base">💵</span>
                <h3 className="text-xs sm:text-sm font-bold text-stone-900">
                  Cash on Delivery (COD)
                </h3>
                <span className="rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800">
                  Exact Cash
                </span>
              </div>
              {/* Mandatory Note for COD */}
              <div className="mt-1.5 rounded-lg bg-amber-100/80 border border-amber-300/80 px-2.5 py-1 text-[11px] font-bold text-amber-900">
                ⚠️ Note: Keep exact change under ₹500 ready
              </div>
              <p className="mt-1 text-[11px] text-stone-500">
                Pay in cash directly to student courier upon arrival at your drop spot.
              </p>
            </div>
          </div>
        </label>

        {/* Online Payment Option */}
        <label
          onClick={selectOnline}
          className={`flex cursor-pointer items-start justify-between rounded-2xl border p-3.5 transition-all ${
            isOnline
              ? "border-amber-500 bg-amber-50/70 shadow-sm ring-1 ring-amber-500/30"
              : "border-stone-200 bg-white hover:border-amber-300"
          }`}
        >
          <div className="flex items-start gap-3">
            <input
              type="radio"
              name="payment"
              className="mt-1 accent-amber-600 cursor-pointer h-4 w-4"
              checked={isOnline}
              onChange={selectOnline}
            />
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-base">💳</span>
                <h3 className="text-xs sm:text-sm font-bold text-stone-900">
                  Online Payment (UPI / Cards / Net Banking)
                </h3>
                <span className="rounded-md bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800">
                  Fastest
                </span>
              </div>
              <p className="mt-1 text-[11px] text-stone-600 font-medium">
                UPI (GPay, PhonePe, Paytm), Cards &amp; Net Banking
              </p>
              {isOnline && (
                <p className="mt-1.5 text-[11px] text-amber-800 font-semibold bg-amber-100/70 px-2 py-0.5 rounded-md inline-block">
                  ✓ I confirm I will complete payment securely via Razorpay.
                </p>
              )}
            </div>
          </div>
        </label>
      </div>
    </div>
  );
}