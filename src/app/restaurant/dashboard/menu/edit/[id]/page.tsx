"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import { getRestaurantOwnerEmail } from "@/lib/authTokens";
import { AuthHttpError, authJson, publicFetch } from "@/services/authFetch";

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
      const res = await publicFetch(`/menu/item/${id}`);
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

    const email = getRestaurantOwnerEmail();

    if (!email) {
      alert("Please log in again.");
      router.replace("/restaurant/login");
      return;
    }

    try {
      await authJson(`/menu/${id}`, {
        role: "restaurant_owner",
        method: "PUT",
        body: JSON.stringify({
          restaurant_email: email,
          name: form.name,
          description: form.description,
          price: Number(form.price),
          category: form.category,
          image: form.image,
          available: form.available,
        }),
      });

      alert("Food Updated Successfully ✅");
      router.push("/restaurant/dashboard/menu");
    } catch (err) {
      if (err instanceof AuthHttpError && err.status === 401) return;
      alert(
        err instanceof Error ? err.message : "Unable to update food"
      );
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
          placeholder="Category"
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
          className="rounded-xl bg-orange-600 px-8 py-3 font-semibold text-white"
        >
          Update Food
        </button>

      </form>

    </main>
  );
}
