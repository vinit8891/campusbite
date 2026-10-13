import React from "react";
import Link from "next/link";
import {
  FileText,
  ShieldCheck,
  Building2,
  Clock,
  HelpCircle,
  AlertCircle,
  CheckCircle2,
  Scale,
} from "lucide-react";
import { ROUTES } from "@/lib/routes";

export const metadata = {
  title: "Terms of Service | CampusBite - Zeal College Food Network",
  description:
    "Official Terms of Service for CampusBite campus food ordering, delivery runners, and canteen partner network at Zeal College, Pune.",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-stone-50 py-10 sm:py-14">
      <div className="mx-auto max-w-4xl px-4 sm:px-6">
        {/* Header Section */}
        <div className="rounded-3xl border border-stone-200 bg-white p-6 sm:p-10 shadow-xs mb-8">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 pb-6 mb-6">
            <div className="inline-flex items-center gap-2 rounded-full bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-700 border border-orange-200/60">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>RBI &amp; Razorpay Merchant Compliant</span>
            </div>
            <span className="text-xs text-stone-500 font-medium flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-stone-400" />
              Effective: October 2026
            </span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-stone-900">
            Terms of Service
          </h1>
          <p className="mt-3 text-sm sm:text-base text-stone-600 leading-relaxed">
            These Terms of Service (&ldquo;Terms&rdquo;) govern your access to and use of CampusBite
            (&ldquo;Platform&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;, or &ldquo;our&rdquo;), a closed-loop food
            ordering and peer-to-peer campus delivery network operated for students, faculty, and canteens
            at <strong>Zeal College of Engineering &amp; Research, Narhe, Pune - 411041</strong>.
          </p>

          <div className="mt-6 rounded-2xl bg-amber-50/80 border border-amber-200/80 p-4 text-xs text-amber-900 leading-relaxed flex items-start gap-3">
            <AlertCircle className="h-4 w-4 text-amber-700 shrink-0 mt-0.5" />
            <p>
              By accessing CampusBite, registering an account, or placing an order, you agree to be bound
              by these Terms and our complementary policies including the{" "}
              <Link href={ROUTES.PRIVACY} className="font-bold underline text-amber-950 hover:text-orange-700">
                Privacy Policy
              </Link>{" "}
              and{" "}
              <Link href={ROUTES.REFUND_POLICY} className="font-bold underline text-amber-950 hover:text-orange-700">
                Cancellation &amp; Refund Policy
              </Link>.
            </p>
          </div>
        </div>

        {/* Content Sections */}
        <div className="space-y-6 text-sm text-stone-700 leading-relaxed">
          {/* Section 1 */}
          <section className="rounded-2xl border border-stone-200 bg-white p-6 sm:p-8 shadow-xs">
            <h2 className="text-lg font-bold text-stone-900 flex items-center gap-2 mb-3">
              <Building2 className="h-4 w-4 text-orange-600" />
              <span>1. Campus Community Scope &amp; Operating Boundary</span>
            </h2>
            <div className="space-y-3 text-stone-600">
              <p>
                CampusBite operates exclusively within the physical perimeter of Zeal Educational Complex,
                Narhe, Pune. Orders are accepted only for verified on-campus drop-off locations including
                Girls Hostel (Blocks 1 &amp; 2), Boys Hostel (Blocks 1, 2 &amp; 3), Central Library,
                Engineering Building Plazas, and designated student common zones.
              </p>
              <p>
                Deliveries outside the Zeal College campus perimeter are strictly prohibited. The platform
                reserves the right to cancel and refund any order attempted outside authorized campus drop
                zones.
              </p>
            </div>
          </section>

          {/* Section 2 */}
          <section className="rounded-2xl border border-stone-200 bg-white p-6 sm:p-8 shadow-xs">
            <h2 className="text-lg font-bold text-stone-900 flex items-center gap-2 mb-3">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <span>2. User Eligibility &amp; Account Responsibility</span>
            </h2>
            <div className="space-y-3 text-stone-600">
              <p>
                You must be an active student, faculty member, canteen staff, or campus resident with a
                valid phone number and email address to create an account.
              </p>
              <ul className="list-disc pl-5 space-y-1.5">
                <li>You are solely responsible for maintaining the confidentiality of your login credentials.</li>
                <li>You agree not to impersonate any individual or use another student&apos;s phone or hostel details without authorization.</li>
                <li>Accounts found engaging in abusive orders, repeated fake claims, or harassment of delivery runners will face immediate permanent suspension.</li>
              </ul>
            </div>
          </section>

          {/* Section 3 */}
          <section className="rounded-2xl border border-stone-200 bg-white p-6 sm:p-8 shadow-xs">
            <h2 className="text-lg font-bold text-stone-900 flex items-center gap-2 mb-3">
              <Scale className="h-4 w-4 text-blue-600" />
              <span>3. Ordering, Menu Pricing &amp; Counter Parity</span>
            </h2>
            <div className="space-y-3 text-stone-600">
              <p>
                <strong>Counter Price Parity:</strong> CampusBite operates under strict anti-inflation counter
                parity. Canteen partners must offer listed items at prices matching or discounted compared
                to over-the-counter walk-in pricing.
              </p>
              <p>
                <strong>Pricing Transparency:</strong> All item prices, applicable Food GST (standard 5%
                composite restaurant rate), platform handling charges, and delivery fees are explicitly
                itemized before payment confirmation.
              </p>
              <p>
                <strong>Digital Payment Processing:</strong> Online transactions are handled through
                100% RBI-authorized payment aggregators (Razorpay). CampusBite does not store full credit/debit
                card numbers, CVVs, or UPI MPINs.
              </p>
            </div>
          </section>

          {/* Section 4 */}
          <section className="rounded-2xl border border-stone-200 bg-white p-6 sm:p-8 shadow-xs">
            <h2 className="text-lg font-bold text-stone-900 flex items-center gap-2 mb-3">
              <FileText className="h-4 w-4 text-purple-600" />
              <span>4. Campus Delivery Partner &amp; Runner Protocol</span>
            </h2>
            <div className="space-y-3 text-stone-600">
              <p>
                Deliveries are conducted by verified student peer-runners (&ldquo;Couriers&rdquo;).
              </p>
              <ul className="list-disc pl-5 space-y-1.5">
                <li>
                  <strong>Secure Handover with OTP:</strong> Every delivery requires a secure 4-digit OTP
                  provided on the customer&apos;s order tracking screen. The courier cannot mark an order
                  delivered without valid customer verification.
                </li>
                <li>
                  <strong>Campus Safety Protocols:</strong> Student couriers must observe all campus rules,
                  hostel warden curfews, and hostel entry restrictions. Deliveries to hostel blocks terminate
                  at the designated ground lobby entrance.
                </li>
              </ul>
            </div>
          </section>

          {/* Section 5 */}
          <section className="rounded-2xl border border-stone-200 bg-white p-6 sm:p-8 shadow-xs">
            <h2 className="text-lg font-bold text-stone-900 flex items-center gap-2 mb-3">
              <AlertCircle className="h-4 w-4 text-rose-600" />
              <span>5. Cancellations, Quality Disputes &amp; Liability Limits</span>
            </h2>
            <div className="space-y-3 text-stone-600">
              <p>
                Orders may be canceled with instant reversal only before kitchen preparation begins.
                Once an eatery accepts and starts cooking, cancellation is restricted to protect campus vendors
                from unrecoverable food spoilage.
              </p>
              <p>
                In the event of verified order non-delivery, damaged food items, or incorrect menu fulfillment,
                full refunds are returned to the source payment method within 5–7 banking days. Please review
                our comprehensive{" "}
                <Link href={ROUTES.REFUND_POLICY} className="text-orange-600 font-semibold underline">
                  Cancellation &amp; Refund Policy
                </Link>{" "}
                for full claim procedures.
              </p>
              <p>
                <strong>Limitation of Liability:</strong> Under no circumstances shall CampusBite or Zeal
                College management be liable for indirect, incidental, or punitive damages. Our aggregate
                liability for any claim arising from an order is strictly capped at the total amount paid
                by the customer for that specific transaction.
              </p>
            </div>
          </section>

          {/* Section 6 */}
          <section className="rounded-2xl border border-stone-200 bg-white p-6 sm:p-8 shadow-xs">
            <h2 className="text-lg font-bold text-stone-900 flex items-center gap-2 mb-3">
              <HelpCircle className="h-4 w-4 text-emerald-600" />
              <span>6. Grievance Redressal &amp; Governing Law</span>
            </h2>
            <div className="space-y-3 text-stone-600">
              <p>
                These Terms shall be governed by and construed in accordance with the laws of India. Any
                disputes arising hereunder shall be subject to the exclusive jurisdiction of the competent
                courts in Pune, Maharashtra.
              </p>
              <div className="rounded-xl bg-stone-50 p-4 border border-stone-200/80 text-xs text-stone-700 space-y-1">
                <p className="font-semibold text-stone-900">Campus Grievance &amp; Compliance Officer:</p>
                <p>Nodal Officer: CampusBite Operations Team</p>
                <p>Address: Zeal College of Engineering &amp; Research, Narhe, Pune - 411041</p>
                <p>Support Email: <a href="mailto:support@campusbites.co.in" className="text-orange-600 underline font-medium">support@campusbites.co.in</a></p>
                <p>Support Hours: 8:00 AM – 10:00 PM IST (Mon–Sun)</p>
              </div>
            </div>
          </section>
        </div>

        {/* Footer Back Link */}
        <div className="mt-8 text-center text-xs text-stone-500">
          <Link href="/" className="text-orange-600 font-semibold hover:underline">
            &larr; Return to CampusBite Home
          </Link>
        </div>
      </div>
    </div>
  );
}