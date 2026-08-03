export default function DashboardPage() {
  return (
    <>

      <h1 className="mb-8 text-4xl font-bold">
        Dashboard
      </h1>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">

        <div className="rounded-2xl bg-white p-6 shadow">

          <h2 className="text-lg font-semibold">
            Today's Orders
          </h2>

          <p className="mt-4 text-5xl font-bold text-orange-600">
            0
          </p>

        </div>

        <div className="rounded-2xl bg-white p-6 shadow">

          <h2 className="text-lg font-semibold">
            Revenue
          </h2>

          <p className="mt-4 text-5xl font-bold text-green-600">
            ₹0
          </p>

        </div>

        <div className="rounded-2xl bg-white p-6 shadow">

          <h2 className="text-lg font-semibold">
            Menu Items
          </h2>

          <p className="mt-4 text-5xl font-bold">
            0
          </p>

        </div>

        <div className="rounded-2xl bg-white p-6 shadow">

          <h2 className="text-lg font-semibold">
            Rating
          </h2>

          <p className="mt-4 text-5xl font-bold">
            ⭐ 0.0
          </p>

        </div>

      </div>

    </>
  );
}