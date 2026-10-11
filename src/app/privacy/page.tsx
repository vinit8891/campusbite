export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-12 text-zinc-800">
      <h1 className="text-3xl font-black mb-4 text-zinc-900 tracking-tight">Privacy Policy</h1>
      <p className="text-sm text-zinc-600 mb-8">
        Your privacy is paramount. This policy outlines how CampusBite collects, processes, and protects your personal and delivery data across college campuses.
      </p>

      <div className="space-y-6 text-sm leading-relaxed text-zinc-600">
        <section>
          <h2 className="text-lg font-bold text-zinc-900 mb-2">1. Data Collected</h2>
          <p>
            We collect your name, phone number, hostel room/block address, and optional device GPS coordinates exclusively to deliver orders accurately to campus drop-off zones.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-zinc-900 mb-2">2. Campus Data Security</h2>
          <p>
            Student identity documents and payment identifiers are encrypted in transit and at rest. We never sell student data to external third parties or advertisers.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-zinc-900 mb-2">3. Contact Us</h2>
          <p>
            For privacy inquiries or data removal requests, contact the Campus Data Privacy Lead at{" "}
            <a href="mailto:support@campusbite.in" className="text-orange-600 underline font-semibold">
              support@campusbite.in
            </a>.
          </p>
        </section>
      </div>
    </main>
  );
}
