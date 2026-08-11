import Link from "next/link";

export default function AdminPage() {
  return (
    <main className="mx-auto max-w-5xl p-10">
      <h1 className="mb-8 text-4xl font-bold">
        Admin Dashboard
      </h1>

      <div className="flex flex-wrap gap-4">
        <Link
          href="/admin/login"
          className="rounded-lg bg-gray-800 px-6 py-3 text-white"
        >
          Admin Login
        </Link>

        <Link
          href="/admin/restaurants"
          className="rounded-lg bg-orange-500 px-6 py-3 text-white"
        >
          Manage Restaurants
        </Link>

        <Link
          href="/admin/add-restaurant"
          className="rounded-lg bg-green-600 px-6 py-3 text-white"
        >
          Add Restaurant
        </Link>
      </div>
    </main>
  );
}