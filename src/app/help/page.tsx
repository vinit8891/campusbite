import Link from "next/link";
import { Mail, Clock, MapPin, ShieldCheck, PhoneCall, MessageCircle, HelpCircle } from "lucide-react";

function InstagramIcon({ className = "h-3 w-3" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  );
}

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
        <p className="text-xs text-zinc-500 mt-1">
          Founder &amp; CEO: Vinit Awathare • CampusBite — Built for Zeal College of Engineering &amp; Research, Pune
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-xs flex flex-col justify-between">
          <div>
            <Mail className="h-6 w-6 text-orange-600 mb-3" />
            <h2 className="font-bold text-zinc-900 text-base mb-1">Email &amp; Inquiries</h2>
            <p className="text-xs text-zinc-500 mb-3">For order issues, partner onboarding &amp; refund queries.</p>
            <div className="space-y-1">
              <a
                href="mailto:campusbites.co.in@gmail.com"
                className="text-xs font-bold text-orange-600 hover:text-orange-700 underline block break-all"
              >
                campusbites.co.in@gmail.com
              </a>
              <a
                href="https://instagram.com/campusbites.co.in"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-pink-600 hover:underline flex items-center gap-1 pt-1 font-medium"
              >
                <InstagramIcon className="h-3 w-3" />
                <span>@campusbites.co.in</span>
              </a>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-xs flex flex-col justify-between">
          <div>
            <PhoneCall className="h-6 w-6 text-emerald-600 mb-3" />
            <h2 className="font-bold text-zinc-900 text-base mb-1">Call &amp; WhatsApp</h2>
            <p className="text-xs text-zinc-500 mb-3">Direct campus hotline and WhatsApp help desk.</p>
            <div className="space-y-1.5">
              <a
                href="tel:9404125117"
                className="text-xs font-bold text-zinc-900 hover:text-orange-600 flex items-center gap-1"
              >
                <span>Call: +91 9404125117</span>
              </a>
              <a
                href="https://wa.me/919024197988"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-bold text-emerald-700 hover:underline flex items-center gap-1"
              >
                <MessageCircle className="h-3.5 w-3.5 text-emerald-600" />
                <span>WhatsApp: +91 9024197988</span>
              </a>
            </div>
          </div>
          <p className="text-[11px] text-zinc-400 mt-3">Operating Hours: 8:00 AM – 2:00 AM</p>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-xs flex flex-col justify-between">
          <div>
            <MapPin className="h-6 w-6 text-amber-600 mb-3" />
            <h2 className="font-bold text-zinc-900 text-base mb-1">Zeal Campus Hub</h2>
            <p className="text-xs text-zinc-500 mb-3">Physical runner coordination &amp; canteen dispatch.</p>
            <p className="text-xs font-semibold text-zinc-800">Near Zeal College, Narhe, Pune</p>
          </div>
          <div className="mt-3 pt-2 border-t border-zinc-100">
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>Verified Campus Food Aggregator</span>
            </span>
          </div>
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
              Contact us immediately at <a href="mailto:campusbites.co.in@gmail.com" className="text-orange-600 underline">campusbites.co.in@gmail.com</a> or WhatsApp <a href="https://wa.me/919024197988" className="text-emerald-700 underline font-semibold">+91 9024197988</a> with your Order ID.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
