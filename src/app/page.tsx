export default function HomePage() {
  return (
    <main className="min-h-screen bg-orange-50">
      <section className="mx-auto flex min-h-screen max-w-7xl flex-col items-center justify-center px-6 text-center">
        <h1 className="text-6xl font-bold text-orange-600">
          CampusBite 🍽️
        </h1>

        <p className="mt-6 max-w-2xl text-lg text-gray-700">
          Student Food & Mess Network
        </p>

        <p className="mt-2 max-w-xl text-gray-500">
          Affordable food delivery, mess subscriptions, and local vendors
          specially built for college students.
        </p>

        <button className="mt-10 rounded-xl bg-orange-500 px-8 py-3 font-semibold text-white transition hover:bg-orange-600">
          Explore Now
        </button>
      </section>
    </main>
  );
}