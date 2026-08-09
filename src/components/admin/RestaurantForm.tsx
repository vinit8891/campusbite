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

      // Restaurant GPS
      latitude: 18.52043,
      longitude: 73.856743,
    }
  );

  async function handleSubmit(
    e: React.FormEvent
  ) {
    e.preventDefault();

    try {
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
        "Something went wrong. Please try again."
      );
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-5"
    >
      {/* Restaurant Name */}

      <div>
        <label className="mb-2 block font-semibold">
          Restaurant Name
        </label>

        <input
          className="w-full rounded border p-3"
          placeholder="Restaurant Name"
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

      {/* Email */}

      <div>
        <label className="mb-2 block font-semibold">
          Restaurant Email
        </label>

        <input
          type="email"
          className="w-full rounded border p-3"
          placeholder="owner@example.com"
          value={form.email}
          onChange={(e) =>
            setForm({
              ...form,
              email: e.target.value,
            })
          }
          required
        />
      </div>

      {/* Slug */}

      <div>
        <label className="mb-2 block font-semibold">
          Slug
        </label>

        <input
          className="w-full rounded border p-3"
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
        <label className="mb-2 block font-semibold">
          Cuisine
        </label>

        <input
          className="w-full rounded border p-3"
          placeholder="Indian, Chinese, Pizza..."
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
        <label className="mb-2 block font-semibold">
          Rating
        </label>

        <input
          type="number"
          step="0.1"
          min="0"
          max="5"
          className="w-full rounded border p-3"
          value={form.rating}
          onChange={(e) =>
            setForm({
              ...form,
              rating: Number(
                e.target.value
              ),
            })
          }
        />
      </div>

      {/* Delivery Time */}

      <div>
        <label className="mb-2 block font-semibold">
          Delivery Time
        </label>

        <input
          className="w-full rounded border p-3"
          placeholder="30 min"
          value={form.delivery_time}
          onChange={(e) =>
            setForm({
              ...form,
              delivery_time:
                e.target.value,
            })
          }
        />
      </div>

      {/* Distance */}

      <div>
        <label className="mb-2 block font-semibold">
          Distance
        </label>

        <input
          className="w-full rounded border p-3"
          placeholder="2 km"
          value={form.distance}
          onChange={(e) =>
            setForm({
              ...form,
              distance:
                e.target.value,
            })
          }
        />
      </div>

      {/* Image */}

      <div>
        <label className="mb-2 block font-semibold">
          Restaurant Image URL
        </label>

        <input
          className="w-full rounded border p-3"
          placeholder="https://..."
          value={form.image}
          onChange={(e) =>
            setForm({
              ...form,
              image: e.target.value,
            })
          }
        />
      </div>

      {/* GPS */}

      <div className="rounded-xl border bg-orange-50 p-5">
        <h3 className="mb-4 text-lg font-bold">
          📍 Restaurant Location
        </h3>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-2 block font-semibold">
              Latitude
            </label>

            <input
              type="number"
              step="any"
              className="w-full rounded border p-3"
              value={form.latitude}
              onChange={(e) =>
                setForm({
                  ...form,
                  latitude: Number(
                    e.target.value
                  ),
                })
              }
              required
            />
          </div>

          <div>
            <label className="mb-2 block font-semibold">
              Longitude
            </label>

            <input
              type="number"
              step="any"
              className="w-full rounded border p-3"
              value={form.longitude}
              onChange={(e) =>
                setForm({
                  ...form,
                  longitude: Number(
                    e.target.value
                  ),
                })
              }
              required
            />
          </div>
        </div>

        <p className="mt-3 text-sm text-gray-600">
          These coordinates will be used for
          delivery tracking.
        </p>
      </div>

      {/* Submit */}

      <button
        type="submit"
        className="rounded bg-orange-500 px-6 py-3 font-semibold text-white hover:bg-orange-600"
      >
        {isEdit
          ? "Update Restaurant"
          : "Add Restaurant"}
      </button>
    </form>
  );
}