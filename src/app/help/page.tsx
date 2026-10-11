import Link from "next/link";
import { Mail, Clock, MapPin, ShieldCheck, PhoneCall, HelpCircle } from "lucide-react";

export default function HelpPage() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-12 text-zinc-800">
      <div className="mb-10 text-center sm:text-left">
        <div className="inline-flex items-center gap-2 rounded-full bg-orange-100 border border-orange-200 px-3 py-1 text-xs font-bold text-orange-800 mb-3">
          <HelpCircle className="h-3.5 w-3.5 text-orange-600" />
          <span>Campus Assistance &amp; Escalations</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-zinc-900 tracking-tight">
          Zeal Campus Help Desk
        </h1>
        <p className="text-zinc-600 mt-2 max-w-xl text-sm sm:text-base">
          Need help with a live hostel delivery, canteen meal dispute, or runner inquiry? Our on-campus support team is here to assist.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-12">
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-xs">
          <Mail className="h-6 w-6 text-orange-600 mb-3" />
          <h2 className="font-bold text-zinc-900 text-base mb-1">Email Support</h2>
          <p className="text-xs text-zinc-500 mb-3">For order issues, partner onboarding &amp; refund queries.</p>
          <a
            href="mailto:support@campusbite.in"
            className="text-xs font-bold text-orange-600 hover:text-orange-700 underline"
          >
            support@campusbite.in
          </a>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-xs">
          <Clock className="h-6 w-6 text-emerald-600 mb-3" />
          <h2 className="font-bold text-zinc-900 text-base mb-1">Operating Hours</h2>
          <p className="text-xs text-zinc-500 mb-3">Active during canteen opening and night hunger hours.</p>
          <p className="text-xs font-semibold text-zinc-800">Daily: 8:00 AM – 2:00 AM</p>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-xs">
          <MapPin className="h-6 w-6 text-amber-600 mb-3" />
          <h2 className="font-bold text-zinc-900 text-base mb-1">Zeal Campus Hub</h2>
          <p className="text-xs text-zinc-500 mb-3">Physical runner coordination &amp; canteen dispatch.</p>
          <p className="text-xs font-semibold text-zinc-800">Near Zeal College, Narhe, Pune</p>
        </div>
      </div>

      <div className="rounded-3xl border border-zinc-200 bg-zinc-50 p-6 sm:p-8 space-y-4">
        <h2 className="text-lg font-bold text-zinc-900">Frequently Asked Questions</h2>
        <div className="space-y-3 text-sm text-zinc-600">
          <div>
            <h3 className="font-semibold text-zinc-900">How do I track my active hostel delivery?</h3>
            <p className="text-xs text-zinc-500 mt-0.5">
              Visit <Link href="/orders" className="text-orange-600 underline">Live Order Tracking</Link> to view real-time courier movement and grab your handover OTP.
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-zinc-900">What if a canteen item is missing or incorrect?</h3>
            <p className="text-xs text-zinc-500 mt-0.5">
              Contact us immediately at support@campusbite.in with your Order ID or check our{" "}
              <Link href="/terms#refunds" className="text-orange-600 underline">Refunds &amp; Settlement Policy</Link>.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
