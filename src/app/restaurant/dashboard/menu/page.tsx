"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type MenuItem = {
  _id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  image: string;
  available: boolean;
};

export default function MenuPage() {
  const router = useRouter();

  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMenu();
  }, []);

  async function fetchMenu() {
    try {
      const owner = JSON.parse(
        localStorage.getItem("restaurantOwner") || "{}"
      );

      // Temporary email until we store it during login
      const email = owner.email || "owner@test.com";

      const res = await fetch(
        `http://127.0.0.1:8000/menu/${email}`
      );

      const data = await res.json();

      setMenu(data);
    } catch (error) {
      console.error("Failed to fetch menu:", error);
    } finally {
      setLoading(false);
    }
  }

  async function deleteItem(id: string) {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this food item?"
    );

    if (!confirmDelete) return;

    try {
      const res = await fetch(
        `http://127.0.0.1:8000/menu/${id}`,
        {
          method: "DELETE",
        }
      );

      const data = await res.json();

      if (res.ok) {
        alert("Food deleted successfully ✅");
        fetchMenu();
      } else {
        alert(data.message || "Unable to delete item.");
      }
    } catch (error) {
      console.error(error);
      alert("Server Error");
    }
  }

  return (
    <>
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-4xl font-bold">
          Menu
        </h1>

        <Link href="/restaurant/dashboard/menu/add">
          <button className="rounded-xl bg-orange-600 px-6 py-3 font-semibold text-white hover:bg-orange-700">
            + Add Food
          </button>
        </Link>
      </div>

      {loading ? (
        <p className="text-lg">Loading menu...</p>
      ) : menu.length === 0 ? (
        <div className="rounded-xl border bg-white p-10 text-center shadow">
          <h2 className="text-2xl font-semibold">
            No Menu Items Yet
          </h2>

          <p className="mt-3 text-gray-500">
            Click "Add Food" to create your first menu item.
          </p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {menu.map((item) => (
            <div
              key={item._id}
              className="overflow-hidden rounded-2xl border bg-white shadow"
            >
              <img
                src={item.image}
                alt={item.name}
                className="h-52 w-full object-cover"
              />

              <div className="p-5">
                <h2 className="text-xl font-bold">
                  {item.name}
                </h2>

                <p className="mt-2 text-gray-500">
                  {item.description}
                </p>

                <p className="mt-4 text-lg font-bold text-orange-600">
                  ₹{item.price}
                </p>

                <p className="mt-2 text-sm">
                  Category:{" "}
                  <span className="font-medium">
                    {item.category}
                  </span>
                </p>

                <p
                  className={`mt-2 text-sm font-semibold ${
                    item.available
                      ? "text-green-600"
                      : "text-red-600"
                  }`}
                >
                  {item.available
                    ? "🟢 Available"
                    : "🔴 Unavailable"}
                </p>

                <div className="mt-5 flex gap-3">
                  <button
                    onClick={() =>
                      router.push(
                        `/restaurant/dashboard/menu/edit/${item._id}`
                      )
                    }
                    className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
                  >
                    Edit
                  </button>

                  <button
                    onClick={() => deleteItem(item._id)}
                    className="rounded-lg bg-red-600 px-4 py-2 text-white hover:bg-red-700"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}