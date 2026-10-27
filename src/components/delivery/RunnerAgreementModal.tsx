"use client";

import React, { useState, useEffect } from "react";
import {
  ShieldCheck,
  FileText,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Lock,
  User,
  Phone,
  CreditCard,
  Building,
  GraduationCap,
} from "lucide-react";
import { authJson, publicJson } from "@/services/authFetch";

export interface RunnerAgreementModalProps {
  isOpen: boolean;
  runnerId: string;
  initialFullName?: string;
  initialPhone?: string;
  initialCollegeId?: string;
  initialUpiId?: string;
  initialHostelBlock?: string;
  initialEmergencyContact?: string;
  onSuccess: () => void | Promise<void>;
}

export function RunnerAgreementModal({
  isOpen,
  runnerId,
  initialFullName = "",
  initialPhone = "",
  initialCollegeId = "",
  initialUpiId = "",
  initialHostelBlock = "",
  initialEmergencyContact = "",
  onSuccess,
}: RunnerAgreementModalProps) {
  const [fullName, setFullName] = useState(initialFullName);
  const [phone, setPhone] = useState(initialPhone);
  const [collegeId, setCollegeId] = useState(initialCollegeId);
  const [upiId, setUpiId] = useState(initialUpiId);
  const [hostelBlock, setHostelBlock] = useState(initialHostelBlock);
  const [emergencyContact, setEmergencyContact] = useState(initialEmergencyContact);
  const [consentChecked, setConsentChecked] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync initial props when opened
  useEffect(() => {
    if (initialFullName) setFullName((prev) => prev || initialFullName);
    if (initialPhone) setPhone((prev) => prev || initialPhone);
    if (initialCollegeId) setCollegeId((prev) => prev || initialCollegeId);
    if (initialUpiId) setUpiId((prev) => prev || initialUpiId);
    if (initialHostelBlock) setHostelBlock((prev) => prev || initialHostelBlock);
    if (initialEmergencyContact) setEmergencyContact((prev) => prev || initialEmergencyContact);
  }, [
    initialFullName,
    initialPhone,
    initialCollegeId,
    initialUpiId,
    initialHostelBlock,
    initialEmergencyContact,
  ]);

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
  const isNameValid = fullName.trim().length >= 3;
  const isPhoneValid = /^[6-9]\d{9}$/.test(phone.trim());
  const isEmergencyValid = /^[6-9]\d{9}$/.test(emergencyContact.trim());
  const isCollegeIdValid = collegeId.trim().length >= 4;
  const isUpiValid = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/.test(upiId.trim());
  const isHostelValid = hostelBlock.trim().length >= 1;

  const isFormValid =
    isNameValid &&
    isPhoneValid &&
    isEmergencyValid &&
    isCollegeIdValid &&
    isUpiValid &&
    isHostelValid &&
    consentChecked;

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const clean = e.target.value.replace(/\D/g, "").slice(0, 10);
    setPhone(clean);
  };

  const handleEmergencyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const clean = e.target.value.replace(/\D/g, "").slice(0, 10);
    setEmergencyContact(clean);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid || isSubmitting) return;

    setIsSubmitting(true);
    setError(null);

    const payload = {
      runner_id: runnerId,
      full_name: fullName.trim(),
      phone: phone.trim(),
      emergency_contact: emergencyContact.trim(),
      college_id_or_seat_no: collegeId.trim(),
      hostel_block_or_address: hostelBlock.trim(),
      upi_id: upiId.trim(),
      terms_version: "v1.0_RUNNER_2026_OCT",
      status: "LEGALLY_EXECUTED",
    };
    try {
      let res;
      try {
        res = await authJson<{
          status?: string;
          message?: string;
          detail?: string;
          agreement_hash?: string;
        }>("/api/delivery/accept-agreement", {
          role: "delivery_partner",
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } catch {
        // Fallback to alias endpoint
        res = await publicJson<{
          status?: string;
          message?: string;
          detail?: string;
          agreement_hash?: string;
        }>("/api/delivery/accept-agreement", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      if (res && (res.status === "success" || res.agreement_hash)) {
        if (typeof window !== "undefined") {
          window.dispatchEvent(new Event("delivery_state_changed"));
        }
        await onSuccess();
      } else {
        setError(res?.detail || res?.message || "Failed to record agreement.");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Network error. Please try again.";
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="runner-agreement-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/85 backdrop-blur-md p-3 sm:p-5 overflow-y-auto animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-stone-200 overflow-hidden my-6">
        {/* Header: Branded Green/Orange Gradient */}
        <div className="bg-gradient-to-r from-emerald-800 via-teal-700 to-orange-600 p-6 text-white relative">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-bold text-emerald-100 border border-white/20">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-200" />
                <span>Work-Study Logistics Engagement</span>
              </div>
              <h2
                id="runner-agreement-title"
                className="text-xl sm:text-2xl font-black tracking-tight"
              >
                Campus Runner & Operations Associate Agreement
              </h2>
              <p className="text-xs sm:text-sm text-emerald-100/90 font-medium">
                Electronic Contract pursuant to Section 10A, Information Technology Act, 2000.
              </p>
            </div>
            <div className="p-3 bg-white/15 backdrop-blur-md rounded-2xl border border-white/20 shrink-0">
              <Lock className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        {/* Scrollable Terms & Form Body */}
        <div className="p-5 sm:p-7 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Scrollable Clauses Box */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-stone-600 px-1">
              <span className="flex items-center gap-1.5 text-stone-800 uppercase tracking-wider">
                <FileText className="w-4 h-4 text-emerald-600" />
                Master Terms of Engagement (v1.0_RUNNER_2026_OCT)
              </span>
              <span className="text-[11px] text-stone-500 font-medium">Scroll to review clauses</span>
            </div>

            <div className="max-h-56 overflow-y-auto rounded-2xl bg-stone-50 p-4 border border-stone-200 text-xs text-stone-700 space-y-3 leading-relaxed shadow-inner">
              <div>
                <p className="font-bold text-stone-900 text-xs">
                  1. Independent Associate & Flexible Work-Study Engagement
                </p>
                <p className="text-[11.5px] text-stone-600 mt-0.5">
                  The Runner is onboarded as an Independent Campus Logistics Associate under a peer-to-peer work-study engagement. This agreement does not constitute traditional wage employment, agency, or partnership. The Associate retains full autonomy over their schedule and shift selections via the Mess Shift Roster.
                </p>
              </div>

              <div>
                <p className="font-bold text-stone-900 text-xs">
                  2. Dynamic Payout Model & Bi-Weekly UPI Disbursals
                </p>
                <p className="text-[11.5px] text-stone-600 mt-0.5">
                  Compensation comprises a competitive base fee per completed drop, batch surge bonus (+₹20/drop) for aggregated hostel deliveries, and 100% of customer tips. Disbursals are remitted directly to the Associate&apos;s registered UPI handle on Tuesdays and Fridays (T+2 settlement cycles).
                </p>
              </div>

              <div>
                <p className="font-bold text-stone-900 text-xs">
                  3. Mandatory Gate / Lobby Drop Safety Mandate (Zero Room Entry)
                </p>
                <p className="text-[11.5px] text-stone-600 mt-0.5">
                  Strict Campus Safety Rule: In compliance with campus student safety protocols, all order dropoffs must strictly occur at designated hostel entrance gates, security posts, or ground-floor academic lobbies. Couriers are strictly prohibited from entering individual student hostel rooms or private residential quarters.
                </p>
              </div>

              <div>
                <p className="font-bold text-stone-900 text-xs">
                  4. Cash-on-Delivery (COD) & ₹500 Remittance Ceiling
                </p>
                <p className="text-[11.5px] text-stone-600 mt-0.5">
                  When handling COD orders, the Associate holds cash in fiduciary custody for CampusBite. A strict ₹500 Cash-in-Hand (CIH) ceiling applies. Crossing ₹500 automatically pauses new order claiming until cash is reconciled and remitted via the platform UPI QR code.
                </p>
              </div>

              <div>
                <p className="font-bold text-stone-900 text-xs">
                  5. Code of Conduct, Tamper Seals & Campus Pedestrian Safety
                </p>
                <p className="text-[11.5px] text-stone-600 mt-0.5">
                  All culinary packaging tamper seals must remain fully intact from canteen pickup until 4-digit OTP handover to the customer. Associates must adhere to campus vehicle and pedestrian rules and treat students and staff with respect.
                </p>
              </div>

              <div>
                <p className="font-bold text-stone-900 text-xs">
                  6. Logistics Internship Certificate Milestone (50 Deliveries)
                </p>
                <p className="text-[11.5px] text-stone-600 mt-0.5">
                  Upon completing 50 verified deliveries with an average rating of 4.5+ and zero infractions, the Associate qualifies for an official &quot;Certificate of Startup Operations &amp; Hyperlocal Logistics Internship&quot; issued by CampusBite Leadership.
                </p>
              </div>
            </div>
          </div>

          {/* Associate Execution Form */}
          <form id="runner-agreement-form" onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Full Name */}
              <div className="space-y-1">
                <label
                  htmlFor="runner-agreement-fullname-input"
                  className="block text-xs font-bold text-stone-700"
                >
                  Full Name (As on College ID) *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-400">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    id="runner-agreement-fullname-input"
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Aman Sharma"
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-stone-300 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-medium"
                  />
                </div>
                {!isNameValid && fullName.length > 0 && (
                  <p className="text-[11px] text-rose-600 font-medium">At least 3 characters required.</p>
                )}
              </div>

              {/* College ID / Roll Number */}
              <div className="space-y-1">
                <label
                  htmlFor="runner-agreement-college-id-input"
                  className="block text-xs font-bold text-stone-700"
                >
                  College ID / Roll Number *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-400">
                    <GraduationCap className="w-4 h-4" />
                  </div>
                  <input
                    id="runner-agreement-college-id-input"
                    type="text"
                    required
                    value={collegeId}
                    onChange={(e) => setCollegeId(e.target.value)}
                    placeholder="e.g. 2024CS042 / SEAT102"
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-stone-300 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-medium font-mono uppercase"
                  />
                </div>
                {!isCollegeIdValid && collegeId.length > 0 && (
                  <p className="text-[11px] text-rose-600 font-medium">Min 4 characters required.</p>
                )}
              </div>

              {/* Registered Phone */}
              <div className="space-y-1">
                <label
                  htmlFor="runner-agreement-phone-input"
                  className="block text-xs font-bold text-stone-700"
                >
                  Registered Mobile Number *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-400">
                    <Phone className="w-4 h-4" />
                  </div>
                  <input
                    id="runner-agreement-phone-input"
                    type="tel"
                    required
                    maxLength={10}
                    value={phone}
                    onChange={handlePhoneChange}
                    placeholder="10-digit mobile (e.g. 9876543210)"
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-stone-300 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-medium font-mono"
                  />
                </div>
                {!isPhoneValid && phone.length > 0 && (
                  <p className="text-[11px] text-rose-600 font-medium">10 digits starting with 6-9 required.</p>
                )}
              </div>

              {/* Emergency Contact */}
              <div className="space-y-1">
                <label
                  htmlFor="runner-agreement-emergency-input"
                  className="block text-xs font-bold text-stone-700"
                >
                  Emergency Contact (SOS) *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-400">
                    <Phone className="w-4 h-4 text-amber-500" />
                  </div>
                  <input
                    id="runner-agreement-emergency-input"
                    type="tel"
                    required
                    maxLength={10}
                    value={emergencyContact}
                    onChange={handleEmergencyChange}
                    placeholder="Parent / Guardian phone"
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-stone-300 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-medium font-mono"
                  />
                </div>
                {!isEmergencyValid && emergencyContact.length > 0 && (
                  <p className="text-[11px] text-rose-600 font-medium">10 digits starting with 6-9 required.</p>
                )}
              </div>

              {/* Payout UPI ID */}
              <div className="space-y-1">
                <label
                  htmlFor="runner-agreement-upi-input"
                  className="block text-xs font-bold text-stone-700"
                >
                  Payout UPI Handle *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-400">
                    <CreditCard className="w-4 h-4" />
                  </div>
                  <input
                    id="runner-agreement-upi-input"
                    type="text"
                    required
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                    placeholder="e.g. name@okaxis / number@ybl"
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-stone-300 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-medium font-mono"
                  />
                </div>
                {!isUpiValid && upiId.length > 0 && (
                  <p className="text-[11px] text-rose-600 font-medium">Valid UPI handle required (e.g. user@okhdfcbank).</p>
                )}
              </div>

              {/* Hostel Block / Address */}
              <div className="space-y-1">
                <label
                  htmlFor="runner-agreement-hostel-input"
                  className="block text-xs font-bold text-stone-700"
                >
                  Hostel Block / Campus Address *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-400">
                    <Building className="w-4 h-4" />
                  </div>
                  <input
                    id="runner-agreement-hostel-input"
                    type="text"
                    required
                    value={hostelBlock}
                    onChange={(e) => setHostelBlock(e.target.value)}
                    placeholder="e.g. Aryabhatta Hall Room B-204"
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-stone-300 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-medium"
                  />
                </div>
                {!isHostelValid && hostelBlock.length > 0 && (
                  <p className="text-[11px] text-rose-600 font-medium">Campus location required.</p>
                )}
              </div>
            </div>

            {/* Error Notification */}
            {error && (
              <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Affirmative Consent Checkbox */}
            <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 space-y-2">
              <label className="flex items-start gap-3 cursor-pointer select-none">
                <input
                  id="runner-agreement-consent-checkbox"
                  type="checkbox"
                  checked={consentChecked}
                  onChange={(e) => setConsentChecked(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded-md border-stone-300 text-emerald-600 focus:ring-emerald-500"
                />
                <span className="text-xs font-medium text-stone-800 leading-snug">
                  I agree to the CampusBite Runner Code of Conduct, Gate Drop rules, ₹500 COD remittance limit, and work-study terms.
                </span>
              </label>

              <div className="flex items-center gap-1.5 text-[11px] text-emerald-800 font-semibold pl-7">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Electronic signature binding under Section 10A of the IT Act, 2000.</span>
              </div>
            </div>

            {/* Action Button */}
            <div className="pt-2">
              <button
                id="runner-agreement-submit-btn"
                type="submit"
                disabled={!isFormValid || isSubmitting}
                className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-orange-600 hover:from-emerald-700 hover:to-orange-700 text-white font-extrabold text-sm shadow-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 active:scale-98 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Executing Digital Agreement...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Execute &amp; Accept Associate Agreement</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
