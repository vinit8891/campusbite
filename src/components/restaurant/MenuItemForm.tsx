"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getRestaurantOwnerEmail } from "@/lib/authTokens";
import { AuthHttpError, authJson } from "@/services/authFetch";

export type MenuFormValues = {
  name: string;
  description: string;
  price: string;
  category: string;
  image: string;
  available: boolean;
};

type Props = {
  mode: "add" | "edit";
  initialValues?: MenuFormValues;
  itemId?: string;
};

const EMPTY: MenuFormValues = {
  name: "",
  description: "",
  price: "",
  category: "",
  image: "",
  available: true,
};

export default function MenuItemForm({
  mode,
  initialValues,
  itemId,
}: Props) {
  const router = useRouter();
  const [form, setForm] = useState<MenuFormValues>(
    initialValues || EMPTY
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [imageError, setImageError] = useState(false);

  function validate(): string | null {
    if (!form.name.trim()) return "Name is required.";
    if (!form.description.trim()) return "Description is required.";
    if (!form.category.trim()) return "Category is required.";
    if (!form.image.trim()) return "Image URL is required.";

    const price = Number(form.price);
    if (!form.price.trim() || Number.isNaN(price) || price <= 0) {
      return "Enter a valid price greater than 0.";
    }

    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      toast.error(validationError);
      return;
    }

    const email = getRestaurantOwnerEmail();
    if (!email) {
      toast.error("Please log in again.");
      router.replace("/restaurant/login");
      return;
    }

    setLoading(true);

    const payload = {
      restaurant_email: email,
      name: form.name.trim(),
      description: form.description.trim(),
      price: Number(form.price),
      category: form.category.trim(),
      image: form.image.trim(),
      available: form.available,
    };

    try {
      if (mode === "edit") {
        if (!itemId) throw new Error("Missing menu item id.");
        await authJson(`/menu/${itemId}`, {
          role: "restaurant_owner",
          method: "PUT",
          body: JSON.stringify(payload),
        });
        toast.success("Food updated successfully");
      } else {
        await authJson("/menu/", {
          role: "restaurant_owner",
          method: "POST",
          body: JSON.stringify({ ...payload, available: true }),
        });
        toast.success("Food added successfully");
      }

      router.push("/restaurant/dashboard/menu");
      router.refresh();
    } catch (err) {
      if (err instanceof AuthHttpError && err.status === 401) return;
      const message =
        err instanceof Error ? err.message : "Unable to save menu item.";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6 rounded-2xl border bg-white p-6 shadow-sm sm:p-8"
    >
      {error && (
        <p className="rounded-xl bg-red-50 p-4 text-sm text-red-600">
          {error}
        </p>
      )}

      <div>
        <label className="mb-2 block text-sm font-semibold">Food Name</label>
        <Input
          className="h-11"
          placeholder="Food Name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          required
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-semibold">Description</label>
        <textarea
          className="min-h-24 w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          placeholder="Description"
          value={form.description}
          onChange={(e) =>
            setForm({ ...form, description: e.target.value })
          }
          required
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm font-semibold">Price (₹)</label>
          <Input
            type="number"
            min="1"
            step="0.01"
            className="h-11"
            placeholder="Price"
            value={form.price}
            onChange={(e) => setForm({ ...form, price: e.target.value })}
            required
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold">Category</label>
          <Input
            className="h-11"
            placeholder="Pizza, Burger, etc."
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
            required
          />
        </div>
      </div>

      <div>
        <label className="mb-2 block text-sm font-semibold">Image URL</label>
        <Input
          className="h-11"
          placeholder="https://..."
          value={form.image}
          onChange={(e) => {
            setImageError(false);
            setForm({ ...form, image: e.target.value });
          }}
          required
        />
      </div>

      {form.image.trim() && !imageError && (
        <div className="overflow-hidden rounded-xl border bg-gray-50">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={form.image}
            alt="Menu item preview"
            className="h-48 w-full object-cover"
            onError={() => setImageError(true)}
          />
        </div>
      )}

      {imageError && form.image.trim() && (
        <p className="text-sm text-amber-700">
          Preview unavailable — check the image URL.
        </p>
      )}

      {mode === "edit" && (
        <label className="flex items-center gap-3 text-sm font-medium">
          <input
            type="checkbox"
            checked={form.available}
            onChange={(e) =>
              setForm({ ...form, available: e.target.checked })
            }
            className="size-4"
          />
          Available
        </label>
      )}

      <div className="flex flex-wrap gap-3">
        <Button
          type="submit"
          disabled={loading}
          className="bg-orange-600 hover:bg-orange-700"
        >
          {loading
            ? mode === "edit"
              ? "Updating..."
              : "Saving..."
            : mode === "edit"
              ? "Update Food"
              : "Save Food"}
        </Button>

        <Link
          href="/restaurant/dashboard/menu"
          className="inline-flex h-10 items-center rounded-lg border px-4 text-sm font-medium hover:bg-gray-50"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
