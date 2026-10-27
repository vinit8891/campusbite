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
    <div className="space-y-2.5 font-sans">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-gray-900">Payment Method</h2>
        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">100% Secure</span>
      </div>

      {configError ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs text-amber-700">
          {configError}
        </div>
      ) : null}

      <div className="space-y-2" role="radiogroup" aria-label="Payment Method Selector">
        {/* Cash on Delivery (COD) Option */}
        <label
          onClick={selectCod}
          className={`flex cursor-pointer items-start justify-between rounded-xl border p-3 transition-all ${
            isCod
              ? "border-orange-500 bg-orange-50/30 shadow-2xs ring-1 ring-orange-500/20"
              : "border-gray-200/80 bg-white hover:border-gray-300"
          }`}
        >
          <div className="flex items-start gap-2.5">
            <input
              type="radio"
              name="payment"
              className="mt-0.5 accent-orange-600 cursor-pointer h-4 w-4"
              checked={isCod}
              onChange={selectCod}
            />
            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-sm">💵</span>
                <h3 className="text-xs sm:text-sm font-bold text-gray-900">
                  Cash on Delivery (COD)
                </h3>
                <span className="rounded-md bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold text-gray-700">
                  Exact Cash
                </span>
              </div>
              {/* Mandatory Note for COD */}
              <div className="mt-1 rounded-md bg-amber-50 border border-amber-200/80 px-2 py-0.5 text-[11px] font-bold text-amber-900 inline-block">
                ⚠️ Note: Keep exact change under ₹500 ready
              </div>
              <p className="mt-0.5 text-[11px] text-gray-500">
                Pay in cash directly to student courier upon arrival at drop spot.
              </p>
            </div>
          </div>
        </label>

        {/* Online Payment Option */}
        <label
          onClick={selectOnline}
          className={`flex cursor-pointer items-start justify-between rounded-xl border p-3 transition-all ${
            isOnline
              ? "border-orange-500 bg-orange-50/30 shadow-2xs ring-1 ring-orange-500/20"
              : "border-gray-200/80 bg-white hover:border-gray-300"
          }`}
        >
          <div className="flex items-start gap-2.5">
            <input
              type="radio"
              name="payment"
              className="mt-0.5 accent-orange-600 cursor-pointer h-4 w-4"
              checked={isOnline}
              onChange={selectOnline}
            />
            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-sm">💳</span>
                <h3 className="text-xs sm:text-sm font-bold text-gray-900">
                  Online Payment (UPI / Cards / Net Banking)
                </h3>
                <span className="rounded-md bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800">
                  Fastest
                </span>
              </div>
              <p className="mt-0.5 text-[11px] text-gray-600 font-medium">
                UPI (GPay, PhonePe, Paytm), Cards &amp; Net Banking
              </p>
              {isOnline && (
                <p className="mt-1 text-[11px] text-emerald-800 font-semibold bg-emerald-50 border border-emerald-200/60 px-2 py-0.5 rounded-md inline-block">
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