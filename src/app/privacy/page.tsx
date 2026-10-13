import React from "react";
import Link from "next/link";
import {
  ShieldCheck,
  Lock,
  Phone,
  MapPin,
  Clock,
  EyeOff,
  Database,
  Mail,
  UserCheck,
} from "lucide-react";
import { ROUTES } from "@/lib/routes";

export const metadata = {
  title: "Privacy Policy | CampusBite - Zeal College Food Network",
  description:
    "CampusBite Privacy Policy explaining student phone number, hostel room location, encrypted payment data handling, and DPDPA compliance.",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-stone-50 py-10 sm:py-14">
      <div className="mx-auto max-w-4xl px-4 sm:px-6">
        {/* Header Section */}
        <div className="rounded-3xl border border-stone-200 bg-white p-6 sm:p-10 shadow-xs mb-8">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 pb-6 mb-6">
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800 border border-emerald-200/60">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
              <span>Data Protection &amp; DPDPA 2023 Compliant</span>
            </div>
            <span className="text-xs text-stone-500 font-medium flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-stone-400" />
              Last Updated: October 2026
            </span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-stone-900">
            Privacy Policy
          </h1>
          <p className="mt-3 text-sm sm:text-base text-stone-600 leading-relaxed">
            At CampusBite, protecting the privacy and personal safety of our student community, campus
            faculty, and staff at <strong>Zeal College of Engineering &amp; Research, Narhe, Pune</strong> is our
            foremost commitment. This Privacy Policy details how we collect, process, store, and safeguard
            your information when using our campus food network.
          </p>
        </div>

        {/* Content Sections */}
        <div className="space-y-6 text-sm text-stone-700 leading-relaxed">
          {/* Section 1: Data We Collect */}
          <section className="rounded-2xl border border-stone-200 bg-white p-6 sm:p-8 shadow-xs">
            <h2 className="text-lg font-bold text-stone-900 flex items-center gap-2 mb-3">
              <Phone className="h-4 w-4 text-orange-600" />
              <span>1. Information We Collect &amp; Student Identifiers</span>
            </h2>
            <div className="space-y-3 text-stone-600">
              <p>
                To coordinate deliveries within campus hostel blocks and academic buildings, we collect
                strictly essential information:
              </p>
              <ul className="list-disc pl-5 space-y-2">
                <li>
                  <strong>Student Phone Number:</strong> Used exclusively for secure SMS/WhatsApp order
                  updates, delivery OTP dispatch, and direct contact by your peer-runner during drop-off.
                </li>
                <li>
                  <strong>Hostel Room &amp; Drop-off Location:</strong> Your designated hostel block, wing,
                  room number, or campus building point (e.g., &ldquo;Girls Hostel 1, Room 204&rdquo;) necessary
                  for precise physical handover.
                </li>
                <li>
                  <strong>Name &amp; College Email:</strong> For account verification, order receipts, and
                  customer support communications.
                </li>
                <li>
                  <strong>Transaction Identifiers:</strong> Razorpay order and payment IDs, items purchased,
                  timestamp, and amounts. <em>We do not collect or store credit/debit card numbers, CVV codes,
                  or UPI MPINs on our servers.</em>
                </li>
              </ul>
            </div>
          </section>

          {/* Section 2: Data Usage */}
          <section className="rounded-2xl border border-stone-200 bg-white p-6 sm:p-8 shadow-xs">
            <h2 className="text-lg font-bold text-stone-900 flex items-center gap-2 mb-3">
              <UserCheck className="h-4 w-4 text-blue-600" />
              <span>2. Purpose of Processing &amp; Purpose Limitation</span>
            </h2>
            <div className="space-y-3 text-stone-600">
              <p>Your data is processed strictly for the following operational purposes:</p>
              <ul className="list-disc pl-5 space-y-1.5">
                <li>Transmitting order tickets to canteens for timely preparation.</li>
                <li>Routing deliveries to student couriers and generating 4-digit verification OTPs.</li>
                <li>Issuing electronic receipts, invoices, and settling accounts with canteen vendors.</li>
                <li>Investigating customer support claims, food quality reports, or refund disputes.</li>
                <li>Preventing platform abuse, fraudulent accounts, or safety violations on campus.</li>
              </ul>
            </div>
          </section>

          {/* Section 3: Geolocation */}
          <section className="rounded-2xl border border-stone-200 bg-white p-6 sm:p-8 shadow-xs">
            <h2 className="text-lg font-bold text-stone-900 flex items-center gap-2 mb-3">
              <MapPin className="h-4 w-4 text-emerald-600" />
              <span>3. Campus Location Data Handling</span>
            </h2>
            <div className="space-y-3 text-stone-600">
              <p>
                When you track an active delivery, the courier&apos;s real-time campus coordinates are
                streamed ephemerally to your tracking map to show estimated time of arrival.
              </p>
              <p>
                <strong>No Permanent Location History:</strong> Detailed GPS tracking points are retained only
                for the duration of the active delivery run. Once an order is marked delivered with OTP
                verification, live GPS streams are immediately terminated and purged from active routing buffers.
              </p>
            </div>
          </section>

          {/* Section 4: Security & Encryption */}
          <section className="rounded-2xl border border-stone-200 bg-white p-6 sm:p-8 shadow-xs">
            <h2 className="text-lg font-bold text-stone-900 flex items-center gap-2 mb-3">
              <Lock className="h-4 w-4 text-purple-600" />
              <span>4. Data Security &amp; Encryption Standards</span>
            </h2>
            <div className="space-y-3 text-stone-600">
              <p>We enforce bank-grade security protocols across all infrastructure layers:</p>
              <ul className="list-disc pl-5 space-y-1.5">
                <li>
                  <strong>TLS 1.3 Transport Encryption:</strong> All browser-to-backend communications are
                  enforced over HTTPS with strict HSTS preload and Content Security Policies.
                </li>
                <li>
                  <strong>Database Encryption:</strong> Stored customer profiles, orders, and settlements
                  are encrypted at rest using industry-standard AES-256 protocols.
                </li>
                <li>
                  <strong>Token Integrity &amp; Strict HS256 JWTs:</strong> Session tokens are cryptographically
                  signed with strict signature verification, preventing algorithm tampering.
                </li>
                <li>
                  <strong>Automated Rate Limiting:</strong> SlowAPI edge rate limiters prevent brute-force
                  credential stuffing and unauthorized automated API scraping.
                </li>
              </ul>
            </div>
          </section>

          {/* Section 5: Zero Third-Party Selling */}
          <section className="rounded-2xl border border-stone-200 bg-white p-6 sm:p-8 shadow-xs">
            <h2 className="text-lg font-bold text-stone-900 flex items-center gap-2 mb-3">
              <EyeOff className="h-4 w-4 text-rose-600" />
              <span>5. Non-Disclosure &amp; Zero Third-Party Selling</span>
            </h2>
            <div className="space-y-3 text-stone-600">
              <p className="font-semibold text-stone-900">
                We never sell, rent, monetize, or trade student personal information or phone numbers to
                external third parties, marketing agencies, or data brokers.
              </p>
              <p>
                Information is disclosed only to authorized payment aggregators (Razorpay Software Pvt. Ltd.)
                to complete financial transactions as required by the Reserve Bank of India (RBI), or when
                mandated by Indian law enforcement.
              </p>
            </div>
          </section>

          {/* Section 6: User Rights & Data Retention */}
          <section className="rounded-2xl border border-stone-200 bg-white p-6 sm:p-8 shadow-xs">
            <h2 className="text-lg font-bold text-stone-900 flex items-center gap-2 mb-3">
              <Database className="h-4 w-4 text-amber-600" />
              <span>6. Data Retention &amp; Your Right to Erasure</span>
            </h2>
            <div className="space-y-3 text-stone-600">
              <p>
                In compliance with the Digital Personal Data Protection Act, you have the right to request
                access to your data, correct inaccuracies, or permanently delete your CampusBite account.
              </p>
              <p>
                Upon receiving an account deletion request via our support desk, your personal identifiers
                (phone, email, saved hostel room addresses) will be purged within 30 days, retaining only
                anonymized accounting records required for statutory tax and audit compliance.
              </p>
            </div>
          </section>

          {/* Section 7: Grievance Desk */}
          <section className="rounded-2xl border border-stone-200 bg-white p-6 sm:p-8 shadow-xs">
            <h2 className="text-lg font-bold text-stone-900 flex items-center gap-2 mb-3">
              <Mail className="h-4 w-4 text-stone-700" />
              <span>7. Privacy Inquiries &amp; Grievance Redressal</span>
            </h2>
            <div className="space-y-3 text-stone-600">
              <p>
                For questions regarding this policy, data removal requests, or to report a privacy concern,
                contact our designated Data Protection Officer:
              </p>
              <div className="rounded-xl bg-stone-50 p-4 border border-stone-200/80 text-xs text-stone-700 space-y-1">
                <p className="font-semibold text-stone-900">Data Protection Officer — CampusBite</p>
                <p>Campus Address: Zeal College of Engineering &amp; Research, Narhe, Pune - 411041</p>
                <p>Support Email: <a href="mailto:support@campusbites.co.in" className="text-orange-600 underline font-medium">support@campusbites.co.in</a></p>
                <p>Desk Hours: 8:00 AM – 10:00 PM IST</p>
              </div>
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
