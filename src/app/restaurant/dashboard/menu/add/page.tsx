"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AddFoodPage() {
  const router = useRouter();

  const [form, setForm] = useState({
    name: "",
    description: "",
    price: "",
    category: "",
    image: "",
    available: true,
  });

  async function handleSubmit(
    e: React.FormEvent
  ) {
    e.preventDefault();

    const owner = JSON.parse(
      localStorage.getItem("restaurantOwner") || "{}"
    );

    const response = await fetch(
      "http://127.0.0.1:8000/menu/",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          restaurant_email: owner.email || "owner@test.com",
          name: form.name,
          description: form.description,
          price: Number(form.price),
          category: form.category,
          image: form.image,
          available: true,
        }),
      }
    );

    if (response.ok) {
      alert("Food Added Successfully ✅");
      router.push("/restaurant/dashboard/menu");
    } else {
      alert("Unable to add food.");
    }
  }

  return (
    <main className="max-w-3xl">

      <h1 className="mb-8 text-4xl font-bold">
        Add Food
      </h1>

      <form
        onSubmit={handleSubmit}
        className="space-y-6 rounded-2xl bg-white p-8 shadow"
      >

        <input
          className="w-full rounded-lg border p-3"
          placeholder="Food Name"
          value={form.name}
          onChange={(e) =>
            setForm({
              ...form,
              name: e.target.value,
            })
          }
          required
        />

        <textarea
          className="w-full rounded-lg border p-3"
          placeholder="Description"
          value={form.description}
          onChange={(e) =>
            setForm({
              ...form,
              description: e.target.value,
            })
          }
          required
        />

        <input
          type="number"
          className="w-full rounded-lg border p-3"
          placeholder="Price"
          value={form.price}
          onChange={(e) =>
            setForm({
              ...form,
              price: e.target.value,
            })
          }
          required
        />

        <input
          className="w-full rounded-lg border p-3"
          placeholder="Category (Pizza, Burger, etc.)"
          value={form.category}
          onChange={(e) =>
            setForm({
              ...form,
              category: e.target.value,
            })
          }
          required
        />

        <input
          className="w-full rounded-lg border p-3"
          placeholder="Image URL"
          value={form.image}
          onChange={(e) =>
            setForm({
              ...form,
              image: e.target.value,
            })
          }
          required
        />

        <button
          className="rounded-xl bg-orange-600 px-8 py-3 font-semibold text-white"
        >
          Save Food
        </button>

      </form>

    </main>
  );
}