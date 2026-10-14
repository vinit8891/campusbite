import React from "react";
import Link from "next/link";
import {
  Building2,
  Mail,
  Phone,
  Clock,
  MapPin,
  ShieldCheck,
  MessageSquare,
  HelpCircle,
  FileText,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { ROUTES } from "@/lib/routes";

export const metadata = {
  title: "Contact Us | CampusBite - Zeal College Food Network",
  description:
    "Official contact information, operational hours, support email, and registered campus address for CampusBite (Zeal College Food Network).",
};

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-stone-50 py-10 sm:py-14">
      <div className="mx-auto max-w-4xl px-4 sm:px-6">
        {/* Header Hero Card */}
        <div className="rounded-3xl border border-stone-200 bg-white p-6 sm:p-10 shadow-xs mb-8">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 pb-6 mb-6">
            <div className="inline-flex items-center gap-2 rounded-full bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-800 border border-orange-200/60">
              <Sparkles className="h-3.5 w-3.5 text-orange-600" />
              <span>Official Merchant &amp; Student Support Desk</span>
            </div>
            <span className="text-xs text-stone-500 font-medium flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-stone-400" />
              Operating Hours: 8:00 AM – 10:00 PM IST
            </span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-stone-900">
            Contact CampusBite
          </h1>
          <p className="mt-3 text-sm sm:text-base text-stone-600 leading-relaxed">
            Have questions about an active meal order, canteen onboarding, or student delivery at Zeal College?
            Our campus support team and grievance desk are here to assist you promptly.
          </p>

          {/* Mandatory Merchant / Entity Details Box */}
          <div className="mt-6 rounded-2xl border border-orange-200 bg-orange-50/50 p-5">
            <div className="flex items-center gap-2 text-orange-900 font-bold text-xs uppercase tracking-wider">
              <ShieldCheck className="h-4 w-4 text-orange-600" />
              <span>Entity &amp; Leadership Disclosure</span>
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 text-xs text-stone-700">
              <div>
                <span className="font-semibold text-stone-900 block">Organization:</span>
                <span className="text-stone-800 font-medium">CampusBite — Built for Zeal College of Engineering &amp; Research, Pune</span>
              </div>
              <div>
                <span className="font-semibold text-stone-900 block">Founder &amp; CEO:</span>
                <span className="text-stone-800 font-medium">Vinit Awathare</span>
              </div>
              <div>
                <span className="font-semibold text-stone-900 block">Direct Calling Support:</span>
                <a href="tel:9404125117" className="text-orange-600 font-bold hover:underline">+91 9404125117</a>
              </div>
              <div>
                <span className="font-semibold text-stone-900 block">Customer Support WhatsApp:</span>
                <a href="https://wa.me/919024197988" target="_blank" rel="noopener noreferrer" className="text-emerald-700 font-bold hover:underline">+91 9024197988</a>
              </div>
              <div>
                <span className="font-semibold text-stone-900 block">Official Support Email:</span>
                <a href="mailto:campusbites.co.in@gmail.com" className="text-orange-600 font-medium hover:underline">campusbites.co.in@gmail.com</a>
              </div>
              <div>
                <span className="font-semibold text-stone-900 block">Official Instagram:</span>
                <a href="https://instagram.com/campusbites.co.in" target="_blank" rel="noopener noreferrer" className="text-pink-600 font-medium hover:underline">@campusbites.co.in</a>
              </div>
              <div className="sm:col-span-2 pt-2 border-t border-orange-200/60">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 text-emerald-800 px-3 py-1 text-[11px] font-bold">
                  <span>Verified Campus Food Aggregator | Zeal Institutes Narhe Campus</span>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 3 Core Contact Information Channels */}
        <div className="grid gap-6 sm:grid-cols-3 mb-8">
          {/* Card 1: Email Support */}
          <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-xs flex flex-col justify-between hover:border-orange-300 transition-colors">
            <div>
              <div className="h-10 w-10 rounded-xl bg-orange-100 flex items-center justify-center text-orange-600 mb-4">
                <Mail className="h-5 w-5" />
              </div>
              <h2 className="text-base font-bold text-stone-900">Email &amp; Direct Support</h2>
              <p className="mt-1 text-xs text-stone-500 leading-relaxed">
                For order inquiries, payments, student refunds, or account support.
              </p>
              <div className="mt-4 space-y-1.5">
                <a
                  href="mailto:campusbites.co.in@gmail.com"
                  className="block text-xs font-bold text-orange-600 hover:text-orange-700 break-all"
                >
                  campusbites.co.in@gmail.com
                </a>
                <a
                  href="tel:9404125117"
                  className="block text-xs text-stone-700 font-medium hover:text-stone-900"
                >
                  Call: +91 9404125117
                </a>
                <a
                  href="https://wa.me/919024197988"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-xs text-emerald-600 font-bold hover:text-emerald-700"
                >
                  WhatsApp: +91 9024197988
                </a>
              </div>
            </div>
            <p className="mt-4 text-[11px] text-stone-400 font-medium">
              Average response time: &lt; 2 hours
            </p>
          </div>

          {/* Card 2: Campus Operating Hours */}
          <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-xs flex flex-col justify-between hover:border-orange-300 transition-colors">
            <div>
              <div className="h-10 w-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600 mb-4">
                <Clock className="h-5 w-5" />
              </div>
              <h2 className="text-base font-bold text-stone-900">Operating Hours</h2>
              <p className="mt-1 text-xs text-stone-500 leading-relaxed">
                Live delivery operations and kitchen coordination across campus.
              </p>
              <div className="mt-4">
                <p className="text-sm font-bold text-stone-800">
                  8:00 AM – 10:00 PM IST
                </p>
                <p className="text-xs text-emerald-700 font-medium mt-1">
                  Active 7 Days a Week
                </p>
              </div>
            </div>
            <p className="mt-4 text-[11px] text-stone-400 font-medium">
              Hostel deliveries active until 2:00 AM on exam cycles
            </p>
          </div>

          {/* Card 3: Registered Campus Address */}
          <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-xs flex flex-col justify-between hover:border-orange-300 transition-colors">
            <div>
              <div className="h-10 w-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600 mb-4">
                <MapPin className="h-5 w-5" />
              </div>
              <h2 className="text-base font-bold text-stone-900">Campus Address</h2>
              <p className="mt-1 text-xs text-stone-500 leading-relaxed">
                Registered on-premise operations and grievance desk location:
              </p>
              <address className="mt-4 not-italic text-xs font-medium text-stone-800 leading-relaxed">
                Zeal College of Engineering &amp; Research,<br />
                Survey No. 39, Narhe,<br />
                Pune, Maharashtra - 411041, India
              </address>
            </div>
            <p className="mt-4 text-[11px] text-stone-400 font-medium">
              Central Canteen Building, Room G-04
            </p>
          </div>
        </div>

        {/* Detailed Sections */}
        <div className="space-y-6">
          {/* Section 1: Grievance & Dispute Redressal */}
          <section className="rounded-3xl border border-stone-200 bg-white p-6 sm:p-8 shadow-xs">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-8 w-8 rounded-lg bg-orange-100 flex items-center justify-center text-orange-600">
                <MessageSquare className="h-4 w-4" />
              </div>
              <h2 className="text-xl font-bold text-stone-900">
                Grievance &amp; Dispute Redressal
              </h2>
            </div>
            <div className="space-y-3 text-xs sm:text-sm text-stone-600 leading-relaxed">
              <p>
                In compliance with the Information Technology (Intermediary Guidelines and Digital Media Ethics Code) Rules
                and RBI digital payment norms, CampusBite provides a designated Grievance Officer for escalated issues:
              </p>
              <div className="rounded-2xl border border-stone-200 bg-stone-50/70 p-4 space-y-1.5 text-xs text-stone-700">
                <p>
                  <strong>Designated Officer:</strong> Grievance Redressal Desk — CampusBite
                </p>
                <p>
                  <strong>Email:</strong>{" "}
                  <a
                    href="mailto:support@campusbites.co.in"
                    className="text-orange-600 font-medium hover:underline"
                  >
                    support@campusbites.co.in
                  </a>
                </p>
                <p>
                  <strong>Address:</strong> Student Welfare &amp; Canteen Affairs, Zeal College of Engineering &amp; Research, Narhe, Pune - 411041.
                </p>
                <p>
                  <strong>Resolution Timeline:</strong> Grievance acknowledgement within 24 hours, and final resolution within 7 working days.
                </p>
              </div>
            </div>
          </section>

          {/* Section 2: Quick Resolution Guides */}
          <section className="rounded-3xl border border-stone-200 bg-white p-6 sm:p-8 shadow-xs">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-8 w-8 rounded-lg bg-stone-100 flex items-center justify-center text-stone-700">
                <HelpCircle className="h-4 w-4" />
              </div>
              <h2 className="text-xl font-bold text-stone-900">
                Common Inquiries &amp; Fast Solutions
              </h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 text-xs text-stone-600">
              <div className="rounded-2xl border border-stone-200 p-4">
                <h3 className="font-bold text-stone-900 text-sm mb-1">
                  1. Order Cancellation &amp; Refunds
                </h3>
                <p className="leading-relaxed">
                  Orders may be canceled in-app before the kitchen starts preparation. Approved refunds are routed
                  directly to your source UPI/bank account within 5–7 business days.
                </p>
                <Link
                  href={ROUTES.REFUND_POLICY}
                  className="inline-flex items-center gap-1 text-orange-600 font-semibold mt-2 hover:underline"
                >
                  View Refund Policy &rarr;
                </Link>
              </div>

              <div className="rounded-2xl border border-stone-200 p-4">
                <h3 className="font-bold text-stone-900 text-sm mb-1">
                  2. Canteen &amp; Mess Vendor Onboarding
                </h3>
                <p className="leading-relaxed">
                  Are you a campus food stall, Zeal tuck shop, or mess operator looking to join the network?
                  Reach out with your FSSAI certificate and campus vendor authorization.
                </p>
                <Link
                  href={ROUTES.RESTAURANT_REGISTER}
                  className="inline-flex items-center gap-1 text-orange-600 font-semibold mt-2 hover:underline"
                >
                  Register Eatery &rarr;
                </Link>
              </div>

              <div className="rounded-2xl border border-stone-200 p-4">
                <h3 className="font-bold text-stone-900 text-sm mb-1">
                  3. Student Delivery Partner Inquiries
                </h3>
                <p className="leading-relaxed">
                  Earn during free campus intervals by delivering meals between college buildings and hostels.
                  Must be an enrolled Zeal student with valid student ID.
                </p>
                <Link
                  href={ROUTES.DELIVERY_REGISTER}
                  className="inline-flex items-center gap-1 text-orange-600 font-semibold mt-2 hover:underline"
                >
                  Become a Courier &rarr;
                </Link>
              </div>

              <div className="rounded-2xl border border-stone-200 p-4">
                <h3 className="font-bold text-stone-900 text-sm mb-1">
                  4. Privacy &amp; Data Rights
                </h3>
                <p className="leading-relaxed">
                  Learn how your student mobile numbers and hostel room delivery notes are protected with TLS 1.3
                  and AES-256 campus-grade encryption.
                </p>
                <Link
                  href={ROUTES.PRIVACY}
                  className="inline-flex items-center gap-1 text-orange-600 font-semibold mt-2 hover:underline"
                >
                  View Privacy Policy &rarr;
                </Link>
              </div>
            </div>
          </section>

          {/* Policy Links Hub */}
          <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-xs flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-stone-900">
                Official Campus Compliance Links
              </h3>
              <p className="text-xs text-stone-500 mt-0.5">
                Review our governing documentation and customer policies.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href={ROUTES.TERMS}
                className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200 bg-stone-50 px-3 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-100 transition-colors"
              >
                <FileText className="h-3.5 w-3.5 text-stone-500" />
                Terms of Service
              </Link>
              <Link
                href={ROUTES.PRIVACY}
                className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200 bg-stone-50 px-3 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-100 transition-colors"
              >
                <ShieldCheck className="h-3.5 w-3.5 text-stone-500" />
                Privacy Policy
              </Link>
              <Link
                href={ROUTES.REFUND_POLICY}
                className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200 bg-stone-50 px-3 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-100 transition-colors"
              >
                <RotateCcw className="h-3.5 w-3.5 text-stone-500" />
                Refund Policy
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}