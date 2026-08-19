"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ROUTES } from "@/lib/routes";

import {
  AuthHttpError,
  addRestaurant,
  updateRestaurant,
  type AdminRestaurantInput,
  type BackendRestaurant,
} from "@/services/adminService";

type Props = {
  initialData?: BackendRestaurant;
};

export default function RestaurantForm({ initialData }: Props) {
  const router = useRouter();
  const isEdit = !!initialData;

  const [form, setForm] = useState<AdminRestaurantInput>({
    slug: initialData?.slug || "",
    name: initialData?.name || "",
    email: initialData?.email || "",
    cuisine: initialData?.cuisine || "",
    rating: initialData?.rating ?? 4.5,
    delivery_time: initialData?.delivery_time || "30 min",
    distance: initialData?.distance || "2 km",
    image: initialData?.image || "/images/restaurants/default.jpg",
    latitude: initialData?.latitude ?? 18.52043,
    longitude: initialData?.longitude ?? 73.856743,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      if (isEdit && initialData?._id) {
        await updateRestaurant(initialData._id, form);
        toast.success("Restaurant updated successfully");
      } else {
        await addRestaurant(form);
        toast.success("Restaurant added successfully");
      }

      router.push(ROUTES.ADMIN_RESTAURANTS);
      router.refresh();
    } catch (err) {
      if (err instanceof AuthHttpError && err.status === 401) {
        return;
      }
      const message =
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again.";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <p className="rounded-xl bg-red-50 p-4 text-sm text-red-600">
          {error}
        </p>
      )}

      <div>
        <label className="mb-2 block font-semibold">Restaurant Name</label>
        <Input
          placeholder="Restaurant Name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          required
          className="h-11"
        />
      </div>

      <div>
        <label className="mb-2 block font-semibold">Restaurant Email</label>
        <Input
          type="email"
          placeholder="owner@example.com"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          required
          className="h-11"
        />
      </div>

      <div>
        <label className="mb-2 block font-semibold">Slug</label>
        <Input
          placeholder="pizza-palace"
          value={form.slug}
          onChange={(e) => setForm({ ...form, slug: e.target.value })}
          required
          className="h-11"
        />
      </div>

      <div>
        <label className="mb-2 block font-semibold">Cuisine</label>
        <Input
          placeholder="Indian, Chinese, Pizza..."
          value={form.cuisine}
          onChange={(e) => setForm({ ...form, cuisine: e.target.value })}
          required
          className="h-11"
        />
      </div>

      <div>
        <label className="mb-2 block font-semibold">Rating</label>
        <Input
          type="number"
          step="0.1"
          min="0"
          max="5"
          value={form.rating}
          onChange={(e) =>
            setForm({ ...form, rating: Number(e.target.value) })
          }
          className="h-11"
        />
      </div>

      <div>
        <label className="mb-2 block font-semibold">Delivery Time</label>
        <Input
          placeholder="30 min"
          value={form.delivery_time}
          onChange={(e) =>
            setForm({ ...form, delivery_time: e.target.value })
          }
          className="h-11"
        />
      </div>

      <div>
        <label className="mb-2 block font-semibold">Distance</label>
        <Input
          placeholder="2 km"
          value={form.distance}
          onChange={(e) => setForm({ ...form, distance: e.target.value })}
          className="h-11"
        />
      </div>

      <div>
        <label className="mb-2 block font-semibold">
          Restaurant Image URL
        </label>
        <Input
          placeholder="https://..."
          value={form.image}
          onChange={(e) => setForm({ ...form, image: e.target.value })}
          className="h-11"
        />
      </div>

      <div className="rounded-xl border bg-orange-50 p-5">
        <h3 className="mb-4 text-lg font-bold">Restaurant Location</h3>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-2 block font-semibold">Latitude</label>
            <Input
              type="number"
              step="any"
              value={form.latitude}
              onChange={(e) =>
                setForm({ ...form, latitude: Number(e.target.value) })
              }
              required
              className="h-11"
            />
          </div>

          <div>
            <label className="mb-2 block font-semibold">Longitude</label>
            <Input
              type="number"
              step="any"
              value={form.longitude}
              onChange={(e) =>
                setForm({ ...form, longitude: Number(e.target.value) })
              }
              required
              className="h-11"
            />
          </div>
        </div>

        <p className="mt-3 text-sm text-gray-600">
          These coordinates will be used for delivery tracking.
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={loading} className="bg-orange-500 hover:bg-orange-600">
          {loading
            ? isEdit
              ? "Updating..."
              : "Adding..."
            : isEdit
              ? "Update Restaurant"
              : "Add Restaurant"}
        </Button>

        <Link
          href={ROUTES.ADMIN_RESTAURANTS}
          className="inline-flex h-10 items-center rounded-lg border px-4 text-sm font-medium hover:bg-gray-50"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
