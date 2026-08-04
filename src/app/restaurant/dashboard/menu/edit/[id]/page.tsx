"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

export default function EditFoodPage() {
  const router = useRouter();
  const params = useParams();

  const id = params.id as string;

  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState({
    name: "",
    description: "",
    price: "",
    category: "",
    image: "",
    available: true,
  });

  useEffect(() => {
    fetchFood();
  }, []);

  async function fetchFood() {
    try {
      const res = await fetch(
        `http://127.0.0.1:8000/menu/item/${id}`
      );

      const data = await res.json();

      setForm({
        name: data.name,
        description: data.description,
        price: String(data.price),
        category: data.category,
        image: data.image,
        available: data.available,
      });

      setLoading(false);
    } catch (err) {
      console.log(err);
    }
  }

  async function updateFood(
    e: React.FormEvent
  ) {
    e.preventDefault();

    const owner = JSON.parse(
      localStorage.getItem("restaurantOwner") || "{}"
    );

    const res = await fetch(
      `http://127.0.0.1:8000/menu/${id}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          restaurant_email:
            owner.email || "owner@test.com",
          name: form.name,
          description: form.description,
          price: Number(form.price),
          category: form.category,
          image: form.image,
          available: form.available,
        }),
      }
    );

    if (res.ok) {
      alert("Food Updated Successfully ✅");
      router.push("/restaurant/dashboard/menu");
    } else {
      alert("Unable to update food");
    }
  }

  if (loading) {
    return (
      <h2 className="text-2xl font-bold">
        Loading...
      </h2>
    );
  }

  return (
    <main className="mx-auto max-w-3xl">

      <h1 className="mb-8 text-4xl font-bold">
        Edit Food
      </h1>

      <form
        onSubmit={updateFood}
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
        />

        <input
          className="w-full rounded-lg border p-3"
          placeholder="Category"
          value={form.category}
          onChange={(e) =>
            setForm({
              ...form,
              category: e.target.value,
            })
          }
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
        />

        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={form.available}
            onChange={(e) =>
              setForm({
                ...form,
                available: e.target.checked,
              })
            }
          />

          Available
        </label>

        <button
          type="submit"
          className="rounded-xl bg-orange-600 px-8 py-3 font-semibold text-white hover:bg-orange-700"
        >
          Update Food
        </button>
      </form>

    </main>
  );
}