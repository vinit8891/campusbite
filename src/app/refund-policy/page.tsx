import React from "react";
import Link from "next/link";
import {
  RotateCcw,
  CheckCircle2,
  XCircle,
  Clock,
  CreditCard,
  AlertTriangle,
  HelpCircle,
  FileCheck2,
  Building2,
  Mail,
} from "lucide-react";
import { ROUTES } from "@/lib/routes";

export const metadata = {
  title: "Cancellation & Refund Policy | CampusBite - Zeal College",
  description:
    "Official Cancellation and Refund Policy for CampusBite. Learn about the pre-preparation cancellation window and 5–7 day source account refund process.",
};

export default function RefundPolicyPage() {
  return (
    <div className="min-h-screen bg-stone-50 py-10 sm:py-14">
      <div className="mx-auto max-w-4xl px-4 sm:px-6">
        {/* Header Section */}
        <div className="rounded-3xl border border-stone-200 bg-white p-6 sm:p-10 shadow-xs mb-8">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 pb-6 mb-6">
            <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-800 border border-blue-200/60">
              <RotateCcw className="h-3.5 w-3.5 text-blue-600" />
              <span>RBI &amp; Razorpay Banking Rails Compliant</span>
            </div>
            <span className="text-xs text-stone-500 font-medium flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-stone-400" />
              Effective: October 2026
            </span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-stone-900">
            Cancellation &amp; Refund Policy
          </h1>
          <p className="mt-3 text-sm sm:text-base text-stone-600 leading-relaxed">
            At CampusBite (Zeal College Food Network), we believe in 100% transparent campus dining.
            This policy outlines our clear cancellation windows, quality dispute resolutions, and automated
            banking refund processes for students and faculty at{" "}
            <strong>Zeal College of Engineering &amp; Research, Narhe, Pune</strong>.
          </p>

          {/* Quick Summary Highlights Box */}
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4">
              <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs uppercase tracking-wider">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span>Pre-Kitchen Cancellation</span>
              </div>
              <p className="mt-1.5 text-xs text-emerald-900/90 leading-relaxed">
                Orders can be canceled with immediate reversal <strong>only before</strong> the canteen
                kitchen begins food preparation.
              </p>
            </div>

            <div className="rounded-2xl border border-blue-200 bg-blue-50/60 p-4">
              <div className="flex items-center gap-2 text-blue-800 font-bold text-xs uppercase tracking-wider">
                <CreditCard className="h-4 w-4 text-blue-600" />
                <span>5–7 Days Source Reversal</span>
              </div>
              <p className="mt-1.5 text-xs text-blue-900/90 leading-relaxed">
                Approved refunds are credited directly to your original source payment method
                (UPI VPA / Netbanking / Card) within <strong>5–7 business days</strong>.
              </p>
            </div>
          </div>
        </div>

        {/* Content Sections */}
        <div className="space-y-6 text-sm text-stone-700 leading-relaxed">
          {/* Section 1: Order Cancellation Window */}
          <section className="rounded-2xl border border-stone-200 bg-white p-6 sm:p-8 shadow-xs">
            <h2 className="text-lg font-bold text-stone-900 flex items-center gap-2 mb-3">
              <Clock className="h-4 w-4 text-orange-600" />
              <span>1. Order Cancellation Window &amp; Rules</span>
            </h2>
            <div className="space-y-4 text-stone-600">
              <p>
                To maintain fair operations for campus canteens and mess tiffin providers who prepare meals
                fresh on demand, the following stage-based cancellation policy applies:
              </p>

              <div className="space-y-3">
                <div className="rounded-xl border border-stone-200 bg-stone-50/80 p-4">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-stone-900 text-xs uppercase tracking-wider">
                      Stage A: Awaiting Confirmation / Pending Acceptance
                    </span>
                    <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-800">
                      Cancellation Allowed
                    </span>
                  </div>
                  <p className="mt-1.5 text-xs text-stone-600">
                    While the order status is &ldquo;Placed&rdquo; and the canteen has not yet accepted the ticket,
                    you can cancel directly from your live tracking screen for an automatic 100% full reversal.
                  </p>
                </div>

                <div className="rounded-xl border border-stone-200 bg-stone-50/80 p-4">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-stone-900 text-xs uppercase tracking-wider">
                      Stage B: Kitchen Preparing &amp; In Cook
                    </span>
                    <span className="inline-flex items-center rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-bold text-rose-800">
                      Cancellation Closed
                    </span>
                  </div>
                  <p className="mt-1.5 text-xs text-stone-600">
                    Once the kitchen confirms the order and transitions status to &ldquo;Preparing&rdquo;, food
                    supplies are irreversibly committed. Self-service cancellation is disabled at this point
                    to prevent food wastage.
                  </p>
                </div>

                <div className="rounded-xl border border-stone-200 bg-stone-50/80 p-4">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-stone-900 text-xs uppercase tracking-wider">
                      Stage C: Out for Delivery / Assigned to Runner
                    </span>
                    <span className="inline-flex items-center rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-bold text-rose-800">
                      Non-Cancellable
                    </span>
                  </div>
                  <p className="mt-1.5 text-xs text-stone-600">
                    Orders in transit with student runners cannot be canceled. Please meet your courier at
                    the designated hostel lobby or campus drop zone and verify with your 4-digit OTP.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Section 2: Quality & Delivery Disputes */}
          <section className="rounded-2xl border border-stone-200 bg-white p-6 sm:p-8 shadow-xs">
            <h2 className="text-lg font-bold text-stone-900 flex items-center gap-2 mb-3">
              <FileCheck2 className="h-4 w-4 text-emerald-600" />
              <span>2. Quality &amp; Delivery Disputes Eligible for Refund</span>
            </h2>
            <div className="space-y-3 text-stone-600">
              <p>You are entitled to a full or partial refund under the following verified circumstances:</p>
              <ul className="list-disc pl-5 space-y-1.5">
                <li>
                  <strong>Missing or Wrong Items:</strong> If any item ordered is missing from the sealed parcel
                  or an incorrect dish was packed by the canteen.
                </li>
                <li>
                  <strong>Food Quality or Hygiene Issues:</strong> If food delivered is spoiled, stale, burnt,
                  spilled, or unfit for consumption. Please report within 60 minutes of delivery with a photo.
                </li>
                <li>
                  <strong>Severe Delivery Delays (&gt;45 min):</strong> If delivery exceeds 45 minutes beyond
                  the estimated campus delivery window due to courier operational failure (excluding campus emergency lockdowns).
                </li>
                <li>
                  <strong>Unfulfilled / Kitchen Stockout:</strong> If a canteen is unable to fulfill an accepted
                  dish due to inventory depletion or emergency kitchen closure.
                </li>
                <li>
                  <strong>Duplicate Debits:</strong> If payment was debited more than once for a single order
                  due to network glitches.
                </li>
              </ul>
            </div>
          </section>

          {/* Section 3: Processing Timeline & Method */}
          <section className="rounded-2xl border border-stone-200 bg-white p-6 sm:p-8 shadow-xs">
            <h2 className="text-lg font-bold text-stone-900 flex items-center gap-2 mb-3">
              <CreditCard className="h-4 w-4 text-blue-600" />
              <span>3. Method of Refund &amp; Banking Timelines (5–7 Business Days)</span>
            </h2>
            <div className="space-y-3 text-stone-600">
              <p>
                In strict adherence to Reserve Bank of India (RBI) directives and standard payment gateway
                protocols:
              </p>
              <div className="rounded-2xl bg-blue-50/50 border border-blue-200/80 p-5 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="h-6 w-6 rounded-lg bg-blue-100 text-blue-800 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    1
                  </div>
                  <div>
                    <h4 className="font-bold text-stone-900 text-xs">Direct Source Account Reversal</h4>
                    <p className="text-xs text-stone-600 mt-0.5">
                      All approved electronic refunds are processed back directly to the source payment method
                      used during checkout. If you paid via UPI (Google Pay, PhonePe, Paytm), the funds return
                      to that specific linked bank account.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="h-6 w-6 rounded-lg bg-blue-100 text-blue-800 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    2
                  </div>
                  <div>
                    <h4 className="font-bold text-stone-900 text-xs">Turnaround Time (5–7 Business Days)</h4>
                    <p className="text-xs text-stone-600 mt-0.5">
                      While CampusBite and Razorpay initiate the refund batch immediately upon approval,
                      banking rails (NPCI / acquiring banks) require <strong>5 to 7 business days</strong> to
                      credit your balance. Weekends and national banking holidays are excluded.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="h-6 w-6 rounded-lg bg-blue-100 text-blue-800 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    3
                  </div>
                  <div>
                    <h4 className="font-bold text-stone-900 text-xs">Cash on Delivery (COD) Claims</h4>
                    <p className="text-xs text-stone-600 mt-0.5">
                      For verified COD orders, approved refunds are transferred directly to the student&apos;s
                      verified UPI VPA or credited as instant store credit upon verification.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Section 4: How to Raise a Refund Claim */}
          <section className="rounded-2xl border border-stone-200 bg-white p-6 sm:p-8 shadow-xs">
            <h2 className="text-lg font-bold text-stone-900 flex items-center gap-2 mb-3">
              <HelpCircle className="h-4 w-4 text-purple-600" />
              <span>4. How to Request a Refund / Dispute Resolution</span>
            </h2>
            <div className="space-y-3 text-stone-600">
              <p>To request a review for an order issue:</p>
              <ol className="list-decimal pl-5 space-y-2 text-xs">
                <li>
                  <strong>Locate Order ID:</strong> Find your 6-digit or 24-character alphanumeric Order ID
                  on your digital receipt or in{" "}
                  <Link href={ROUTES.MY_ORDERS} className="text-orange-600 font-semibold underline">
                    My Orders
                  </Link>.
                </li>
                <li>
                  <strong>Contact Support Desk:</strong> Email{" "}
                  <a href="mailto:support@campusbites.co.in" className="text-orange-600 underline font-semibold">
                    support@campusbites.co.in
                  </a>{" "}
                  or message the campus help desk with your registered phone number, Order ID, and clear
                  photograph of the issue (for damaged or incorrect food items).
                </li>
                <li>
                  <strong>Resolution Verification:</strong> Our campus operations team coordinates directly
                  with the respective eatery within 2 hours during operational hours (8:00 AM – 10:00 PM IST).
                </li>
                <li>
                  <strong>ARN Tracking:</strong> Upon refund approval, a bank Acquirer Reference Number (ARN)
                  is generated which you can use to track the credit with your bank if needed.
                </li>
              </ol>
            </div>
          </section>

          {/* Section 5: Campus Helpdesk Contact */}
          <section className="rounded-2xl border border-stone-200 bg-white p-6 sm:p-8 shadow-xs">
            <h2 className="text-lg font-bold text-stone-900 flex items-center gap-2 mb-3">
              <Building2 className="h-4 w-4 text-stone-700" />
              <span>5. Grievance &amp; Billing Support Contact</span>
            </h2>
            <div className="rounded-xl bg-stone-50 p-4 border border-stone-200/80 text-xs text-stone-700 space-y-1">
              <p className="font-semibold text-stone-900">CampusBite Billing &amp; Settlements Desk</p>
              <p>Entity: CampusBite (Zeal College Food Network)</p>
              <p>Registered Campus Address: Zeal College of Engineering &amp; Research, Narhe, Pune - 411041</p>
              <p>Support Email: <a href="mailto:support@campusbites.co.in" className="text-orange-600 underline font-medium">support@campusbites.co.in</a></p>
              <p>Operating Hours: 8:00 AM – 10:00 PM IST (Monday through Sunday)</p>
            </div>
          </section>
        </div>

        {/* Footer Navigation */}
        <div className="mt-8 flex items-center justify-between text-xs text-stone-500">
          <Link href="/" className="text-orange-600 font-semibold hover:underline">
            &larr; Return to Home
          </Link>
          <Link href={ROUTES.TERMS} className="text-stone-600 font-semibold hover:underline">
            View Terms of Service &rarr;
          </Link>
        </div>
      </div>
    </div>
  );
}
