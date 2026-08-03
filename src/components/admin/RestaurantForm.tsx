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
      cuisine: "",
      rating: 4.5,
      delivery_time: "30 min",
      distance: "2 km",
      image: "/images/restaurants/default.jpg",
      menu: [],
    }
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (isEdit) {
      await updateRestaurant(initialData._id, form);
      alert("Restaurant Updated Successfully!");
    } else {
      await addRestaurant(form);
      alert("Restaurant Added Successfully!");
    }

    router.push("/admin/restaurants");
    router.refresh();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mx-auto max-w-xl space-y-4"
    >
      <input
        className="w-full rounded border p-3"
        placeholder="Restaurant Name"
        value={form.name}
        onChange={(e) =>
          setForm({ ...form, name: e.target.value })
        }
      />

      <input
        className="w-full rounded border p-3"
        placeholder="Slug"
        value={form.slug}
        onChange={(e) =>
          setForm({ ...form, slug: e.target.value })
        }
      />

      <input
        className="w-full rounded border p-3"
        placeholder="Cuisine"
        value={form.cuisine}
        onChange={(e) =>
          setForm({ ...form, cuisine: e.target.value })
        }
      />

      <input
        type="number"
        step="0.1"
        className="w-full rounded border p-3"
        value={form.rating}
        onChange={(e) =>
          setForm({
            ...form,
            rating: Number(e.target.value),
          })
        }
      />

      <button className="rounded bg-orange-500 px-6 py-3 text-white">
        {isEdit ? "Update Restaurant" : "Add Restaurant"}
      </button>
    </form>
  );
}