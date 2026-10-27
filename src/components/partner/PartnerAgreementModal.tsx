"use client";

import React, { useState, useEffect } from "react";
import {
  ShieldCheck,
  FileText,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Lock,
  Building2,
  User,
  Phone,
  FileCheck2,
} from "lucide-react";
import { authJson, publicJson } from "@/services/authFetch";

export interface PartnerAgreementModalProps {
  isOpen: boolean;
  canteenId: string;
  canteenName?: string;
  initialFssai?: string;
  initialPhone?: string;
  initialSignatory?: string;
  onSuccess: () => void | Promise<void>;
}

export function PartnerAgreementModal({
  isOpen,
  canteenId,
  canteenName,
  initialFssai = "",
  initialPhone = "",
  initialSignatory = "",
  onSuccess,
}: PartnerAgreementModalProps) {
  const [signatoryName, setSignatoryName] = useState(initialSignatory);
  const [fssaiNumber, setFssaiNumber] = useState(initialFssai);
  const [phone, setPhone] = useState(initialPhone);
  const [consentChecked, setConsentChecked] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync initial props when opened
  useEffect(() => {
    if (initialSignatory) setSignatoryName((prev) => prev || initialSignatory);
    if (initialFssai) setFssaiNumber((prev) => prev || initialFssai);
    if (initialPhone) setPhone((prev) => prev || initialPhone);
  }, [initialSignatory, initialFssai, initialPhone]);

  // Non-dismissible: intercept Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    window.addEventListener("keydown", handleKeyDown, { capture: true });
    return () => {
      window.removeEventListener("keydown", handleKeyDown, { capture: true });
    };
  }, [isOpen]);

  if (!isOpen) return null;

  // Real-time validations
  const isSignatoryValid = signatoryName.trim().length >= 3;
  const isFssaiValid = /^\d{14}$/.test(fssaiNumber.trim());
  const isPhoneValid = /^[6-9]\d{9}$/.test(phone.trim());
  const isFormValid =
    isSignatoryValid && isFssaiValid && isPhoneValid && consentChecked;

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const clean = e.target.value.replace(/\D/g, "").slice(0, 10);
    setPhone(clean);
  };

  const handleFssaiChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const clean = e.target.value.replace(/\D/g, "").slice(0, 14);
    setFssaiNumber(clean);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid || isSubmitting) return;

    setIsSubmitting(true);
    setError(null);

    const payload = {
      canteen_id: canteenId,
      signatory_name: signatoryName.trim(),
      signatory_designation: "Proprietor",
      signatory_phone: phone.trim(),
      canteen_fssai_number: fssaiNumber.trim(),
      terms_version: "v1.0_2026_OCT",
    };

    try {
      await authJson<{ status: string; message: string }>(
        "/api/partner/accept-agreement",
        {
          role: "restaurant_owner",
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      await onSuccess();
    } catch (err: unknown) {
      // Fallback attempt to alternate alias route in case of proxy path difference
      try {
        await publicJson<{ status: string; message: string }>(
          "/partner/accept-agreement",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          }
        );
        await onSuccess();
      } catch (fallbackErr: unknown) {
        const errorMsg =
          err instanceof Error
            ? err.message
            : fallbackErr instanceof Error
            ? fallbackErr.message
            : "Failed to record merchant agreement. Please verify your inputs.";
        setError(errorMsg);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="partner-agreement-title"
      className="fixed inset-0 z-[100] flex items-center justify-center p-0 sm:p-5 md:p-6 bg-stone-950/80 backdrop-blur-md animate-in fade-in duration-300"
      onClick={(e) => e.stopPropagation()}
    >
      <div
        className="w-full h-[100dvh] sm:h-auto sm:max-h-[90vh] max-w-2xl rounded-none sm:rounded-2xl bg-white shadow-2xl flex flex-col overflow-hidden border border-amber-200/60 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header: Branded Orange Header with Section 10A Legal Notice */}
        <div className="relative bg-gradient-to-r from-orange-600 via-amber-600 to-orange-500 text-white p-5 sm:p-6 shadow-md shrink-0">
          <div className="flex items-start gap-3.5">
            <div className="p-2.5 rounded-2xl bg-white/15 backdrop-blur-md border border-white/25 shrink-0 shadow-xs">
              <ShieldCheck className="w-7 h-7 text-amber-200" />
            </div>
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/20 backdrop-blur-xs text-[11px] font-semibold text-amber-100 tracking-wide">
                <Lock className="w-3 h-3 text-amber-200" />
                <span>Electronic Agreement pursuant to Section 10A, IT Act 2000</span>
              </div>
              <h2
                id="partner-agreement-title"
                className="text-lg sm:text-xl md:text-2xl font-black tracking-tight text-white"
              >
                CampusBite Canteen Merchant Agreement
              </h2>
              {canteenName && (
                <p className="text-xs sm:text-sm text-amber-100/90 font-medium flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5" />
                  <span>Establishment: {canteenName}</span>
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-5 sm:p-6 space-y-5 overflow-y-auto overscroll-contain flex-1">
          {/* Scrollable Terms & Clauses Container */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-bold text-stone-700 px-0.5">
              <span className="flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-orange-600" />
                <span>Merchant Master Terms & Operating Clauses (v1.0_2026_OCT)</span>
              </span>
              <span className="text-[11px] font-medium text-stone-500">
                Scroll to review all clauses
              </span>
            </div>

            <div
              id="agreement-terms-scroll-box"
              tabIndex={0}
              className="max-h-60 overflow-y-auto rounded-2xl p-4 sm:p-5 bg-stone-50 border border-stone-200/90 text-xs text-stone-700 space-y-3 font-normal shadow-inner leading-relaxed focus:outline-hidden focus:ring-2 focus:ring-orange-500/20"
            >
              <div className="p-2.5 rounded-xl bg-orange-100/60 border border-orange-200/70 text-orange-950 font-medium">
                <strong>Important Legal Mandate:</strong> This electronic click-wrap agreement is mandatory for all merchant partners operating culinary counters on CampusBite. Access to orders, KDS kitchen display, and menu updates remains locked until affirmed.
              </div>

              <div>
                <h4 className="font-bold text-stone-900 text-xs mb-1">
                  1. Commercial Terms & Platform Take-Rate
                </h4>
                <p>
                  The Merchant agrees to a platform commission (take-rate) of <strong>18% (eighteen percent)</strong> on the gross order value (food subtotal) of all customer orders processed via CampusBite. Statutory GST, TCS, and TDS under Section 194-O shall be deducted in accordance with prevailing Indian tax rules.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-stone-900 text-xs mb-1">
                  2. Settlement Cycle & Payout Schedule
                </h4>
                <p>
                  Reconciliation accrues daily with a <strong>9:00 PM IST End-of-Day (EOD) ledger cutoff</strong>. Payouts are automatically scheduled on a T+2 business day cycle, disbursed twice weekly on <strong>Tuesday and Friday</strong> directly to the Merchant’s verified bank account or UPI VPA.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-stone-900 text-xs mb-1">
                  3. Food Safety, Quality & FSSAI Sole Liability
                </h4>
                <p>
                  The Merchant warrants holding a valid, active <strong>14-digit FSSAI registration/license</strong>. The Merchant assumes <strong>100% sole civil, criminal, and regulatory liability</strong> for food hygiene, freshness, accurate dietary labels (veg/non-veg), contamination, and customer safety. The Merchant indemnifies CampusBite from all consumer or regulatory claims.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-stone-900 text-xs mb-1">
                  4. Intermediary Safe Harbour under IT Act Section 79
                </h4>
                <p>
                  CampusBite operates exclusively as a digital platform intermediary connecting campus diners with independent kitchen operators. Pursuant to <strong>Section 79 of the Information Technology Act, 2000</strong>, CampusBite is not the producer, packager, or vendor of food items.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-stone-900 text-xs mb-1">
                  5. Digital Click-Wrap Audit Trail & Cryptographic Hashing
                </h4>
                <p>
                  Upon affirmative execution, an immutable audit record containing the authorized signatory name, 10-digit mobile number, 14-digit FSSAI license, SHA-256 agreement hash, client IP address, and server timestamp is permanently logged in MongoDB collection <code>merchant_agreements</code>.
                </p>
              </div>
            </div>
          </div>

          {/* Error Banner */}
          {error && (
            <div
              id="agreement-error-banner"
              className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5 animate-in fade-in"
            >
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium">{error}</div>
            </div>
          )}

          {/* Signatory Form Inputs */}
          <form id="partner-agreement-form" onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Signatory Name */}
              <div className="sm:col-span-2 space-y-1">
                <label
                  htmlFor="signatory-name-input"
                  className="block text-xs font-bold text-stone-700"
                >
                  Authorized Signatory Full Name <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-400">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    id="signatory-name-input"
                    type="text"
                    required
                    placeholder="e.g. Rajesh Kumar Sharma"
                    value={signatoryName}
                    onChange={(e) => setSignatoryName(e.target.value)}
                    className="w-full min-h-[44px] h-11 pl-9 pr-8 py-2.5 rounded-xl border border-stone-200 text-xs sm:text-sm text-stone-900 placeholder:text-stone-400 focus:outline-hidden focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
                  />
                  {isSignatoryValid && (
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center text-emerald-600">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                  )}
                </div>
                <p className="text-[10px] text-stone-500">
                  Minimum 3 characters (e.g. Proprietor / Managing Partner).
                </p>
              </div>

              {/* FSSAI Number */}
              <div className="space-y-1">
                <label
                  htmlFor="canteen-fssai-input"
                  className="block text-xs font-bold text-stone-700"
                >
                  Canteen FSSAI Number (14 Digits) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-400">
                    <FileCheck2 className="w-4 h-4" />
                  </div>
                  <input
                    id="canteen-fssai-input"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    autoCapitalize="none"
                    autoCorrect="off"
                    maxLength={14}
                    required
                    placeholder="14-digit numeric license"
                    value={fssaiNumber}
                    onChange={handleFssaiChange}
                    className="w-full min-h-[44px] h-11 pl-9 pr-8 py-2.5 rounded-xl border border-stone-200 text-xs sm:text-sm text-stone-900 placeholder:text-stone-400 focus:outline-hidden focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 font-mono transition-all"
                  />
                  {isFssaiValid && (
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center text-emerald-600">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                  )}
                </div>
                <div className="flex justify-between text-[10px] text-stone-500 font-medium">
                  <span>Numeric only</span>
                  <span className={fssaiNumber.length === 14 ? "text-emerald-600 font-bold" : ""}>
                    {fssaiNumber.length}/14
                  </span>
                </div>
              </div>

              {/* Registered Mobile Number */}
              <div className="space-y-1">
                <label
                  htmlFor="signatory-phone-input"
                  className="block text-xs font-bold text-stone-700"
                >
                  Registered Mobile Number <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-400">
                    <Phone className="w-4 h-4" />
                  </div>
                  <input
                    id="signatory-phone-input"
                    type="tel"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    autoComplete="tel"
                    maxLength={10}
                    required
                    placeholder="10-digit Indian mobile"
                    value={phone}
                    onChange={handlePhoneChange}
                    className="w-full min-h-[44px] h-11 pl-9 pr-8 py-2.5 rounded-xl border border-stone-200 text-xs sm:text-sm text-stone-900 placeholder:text-stone-400 focus:outline-hidden focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 font-mono transition-all"
                  />
                  {isPhoneValid && (
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center text-emerald-600">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                  )}
                </div>
                <div className="flex justify-between text-[10px] text-stone-500 font-medium">
                  <span>10 digits starting with 6-9</span>
                  <span className={phone.length === 10 ? "text-emerald-600 font-bold" : ""}>
                    {phone.length}/10
                  </span>
                </div>
              </div>
            </div>

            {/* Affirmative Consent Checkbox (Starts Unchecked) */}
            <div className="pt-2">
              <label
                htmlFor="partner-agreement-consent-checkbox"
                className="flex items-start gap-3 min-h-[44px] active:bg-gray-100 transition rounded-lg p-2 bg-amber-50/60 border border-amber-200/80 cursor-pointer hover:bg-amber-100/50 select-none"
              >
                <input
                  id="partner-agreement-consent-checkbox"
                  type="checkbox"
                  checked={consentChecked}
                  onChange={(e) => setConsentChecked(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded-md border-amber-400 text-orange-600 focus:ring-orange-500 shrink-0 cursor-pointer"
                />
                <span className="text-xs text-stone-800 leading-snug font-medium select-none">
                  I, as the authorized representative, declare the information is true and agree to the CampusBite Merchant Terms, 18% commission rate, and settlement cycle.
                </span>
              </label>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                id="partner-agreement-submit-btn"
                type="submit"
                disabled={!isFormValid || isSubmitting}
                className={`w-full min-h-[44px] h-12 py-3.5 px-6 rounded-2xl font-bold text-sm text-white shadow-md flex items-center justify-center gap-2 transition-all ${
                  isFormValid && !isSubmitting
                    ? "bg-gradient-to-r from-orange-600 via-amber-600 to-orange-500 hover:from-orange-700 hover:to-orange-600 hover:shadow-lg active:scale-[0.99] cursor-pointer"
                    : "bg-stone-300 text-stone-500 cursor-not-allowed opacity-80"
                }`}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Executing & Recording Immutable Audit Log...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Execute & Accept Master Agreement</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Footer Note */}
        <div className="p-3.5 bg-stone-100 border-t border-stone-200/80 text-center text-[11px] text-stone-500 shrink-0">
          🔒 Section 10A Compliant • Non-dismissible mandatory click-wrap execution
        </div>
      </div>
    </div>
  );
}

export default PartnerAgreementModal;
