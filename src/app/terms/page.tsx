export default function TermsPage() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-12 text-zinc-800">
      <h1 className="text-3xl font-black mb-4 text-zinc-900 tracking-tight">Terms of Service</h1>
      <p className="text-sm text-zinc-600 mb-8">
        Welcome to CampusBite. These terms govern your use of our closed-campus ordering and delivery network.
      </p>

      <div className="space-y-8 text-sm leading-relaxed">
        <section>
          <h2 className="text-lg font-bold text-zinc-900 mb-2">1. Campus Community Guidelines</h2>
          <p className="text-zinc-600">
            CampusBite operates exclusively within college boundaries. All orders are fulfilled by certified on-campus canteens and student runners. Respect for hostel rules, quiet hours, and campus safety protocols is mandatory for all users.
          </p>
        </section>

        <section id="refunds" className="rounded-2xl border border-orange-200 bg-orange-50/50 p-6">
          <h2 className="text-lg font-bold text-zinc-900 mb-2">2. Refunds &amp; Settlement Policy</h2>
          <p className="text-zinc-600 mb-3">
            Orders cancelled before food preparation commences qualify for instant wallet or UPI reversal. If food received is incorrect, damaged, or delayed past reasonable campus delivery limits, users may request an immediate review via the Zeal Campus Help Desk.
          </p>
          <p className="text-xs text-orange-800 font-medium">
            For rapid resolution, contact <a href="mailto:support@campusbite.in" className="underline font-bold">support@campusbite.in</a> with your Order ID.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-zinc-900 mb-2">3. Digital UPI Payments</h2>
          <p className="text-zinc-600">
            All electronic transactions are processed via 100% encrypted UPI gateways. Cash-on-delivery is available for select hostel locations with verification.
          </p>
        </section>
      </div>
    </main>
  );
}