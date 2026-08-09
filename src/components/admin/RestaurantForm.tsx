"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  addRestaurant,
  updateRestaurant,
} from "@/services/adminService";

type Props = {
  initialData?: any;
};

export default function RestaurantForm({
  initialData,
}: Props) {
  const router = useRouter();

  const isEdit = !!initialData;

  const [form, setForm] = useState(
    initialData || {
      slug: "",
      name: "",
      email: "",
      cuisine: "",
      rating: 4.5,
      delivery_time: "30 min",
      distance: "2 km",
      image: "/images/restaurants/default.jpg",
    }
  );

  async function handleSubmit(
    e: React.FormEvent
  ) {
    e.preventDefault();

    try {
      if (
        !form.name ||
        !form.email ||
        !form.slug ||
        !form.cuisine
      ) {
        alert("Please fill all required fields.");
        return;
      }

      if (isEdit) {
        await updateRestaurant(
          initialData._id,
          form
        );

        alert(
          "Restaurant Updated Successfully!"
        );
      } else {
        await addRestaurant(form);

        alert(
          "Restaurant Added Successfully!"
        );
      }

      router.push("/admin/restaurants");
      router.refresh();
    } catch (error) {
      console.error(error);

      alert(
        "Failed to save restaurant. Please try again."
      );
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-5 rounded-2xl bg-white p-8 shadow"
    >
      {/* Restaurant Name */}

      <div>
        <label className="mb-2 block font-medium">
          Restaurant Name
        </label>

        <input
          className="w-full rounded-lg border p-3"
          placeholder="Pizza Palace"
          value={form.name}
          onChange={(e) =>
            setForm({
              ...form,
              name: e.target.value,
            })
          }
          required
        />
      </div>

      {/* Restaurant Email */}

      <div>
        <label className="mb-2 block font-medium">
          Restaurant Owner Email
        </label>

        <input
          type="email"
          className="w-full rounded-lg border p-3"
          placeholder="owner@test.com"
          value={form.email}
          onChange={(e) =>
            setForm({
              ...form,
              email: e.target.value,
            })
          }
          required
        />

        <p className="mt-1 text-sm text-gray-500">
          This email connects the restaurant with
          its menu items.
        </p>
      </div>

      {/* Slug */}

      <div>
        <label className="mb-2 block font-medium">
          Slug
        </label>

        <input
          className="w-full rounded-lg border p-3"
          placeholder="pizza-palace"
          value={form.slug}
          onChange={(e) =>
            setForm({
              ...form,
              slug: e.target.value,
            })
          }
          required
        />
      </div>

      {/* Cuisine */}

      <div>
        <label className="mb-2 block font-medium">
          Cuisine
        </label>

        <input
          className="w-full rounded-lg border p-3"
          placeholder="Pizza, Italian"
          value={form.cuisine}
          onChange={(e) =>
            setForm({
              ...form,
              cuisine: e.target.value,
            })
          }
          required
        />
      </div>

      {/* Rating */}

      <div>
        <label className="mb-2 block font-medium">
          Rating
        </label>

        <input
          type="number"
          min="0"
          max="5"
          step="0.1"
          className="w-full rounded-lg border p-3"
          value={form.rating}
          onChange={(e) =>
            setForm({
              ...form,
              rating: Number(e.target.value),
            })
          }
        />
      </div>

      {/* Delivery Time */}

      <div>
        <label className="mb-2 block font-medium">
          Delivery Time
        </label>

        <input
          className="w-full rounded-lg border p-3"
          value={form.delivery_time}
          onChange={(e) =>
            setForm({
              ...form,
              delivery_time: e.target.value,
            })
          }
        />
      </div>

      {/* Distance */}

      <div>
        <label className="mb-2 block font-medium">
          Distance
        </label>

        <input
          className="w-full rounded-lg border p-3"
          value={form.distance}
          onChange={(e) =>
            setForm({
              ...form,
              distance: e.target.value,
            })
          }
        />
      </div>

      {/* Image */}

      <div>
        <label className="mb-2 block font-medium">
          Restaurant Image URL
        </label>

        <input
          className="w-full rounded-lg border p-3"
          value={form.image}
          onChange={(e) =>
            setForm({
              ...form,
              image: e.target.value,
            })
          }
        />
      </div>

      <button
        type="submit"
        className="rounded-xl bg-orange-600 px-8 py-3 font-semibold text-white hover:bg-orange-700"
      >
        {isEdit
          ? "Update Restaurant"
          : "Add Restaurant"}
      </button>
    </form>
  );
}