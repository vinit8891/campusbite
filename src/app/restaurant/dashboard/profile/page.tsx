"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { getRestaurantOwnerEmail } from "@/lib/authTokens";
import { AuthHttpError, authJson } from "@/services/authFetch";
import {
  getRestaurantByEmail,
  type BackendRestaurant,
} from "@/services/restaurantService";

type ProfileForm = {
  name: string;
  description: string;
  address: string;
  phone: string;
  cuisine: string;
  opening_hours: string;
  closing_hours: string;
  image: string;
};

const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;
const PHONE_PATTERN = /^[6-9]\d{9}$/;
const IMAGE_PATTERN = /^(https?:\/\/|\/).+/i;

function toForm(restaurant: BackendRestaurant): ProfileForm {
  return {
    name: restaurant.name || "",
    description: restaurant.description || "",
    address: restaurant.address || "",
    phone: restaurant.phone || "",
    cuisine: restaurant.cuisine || "",
    opening_hours: restaurant.opening_hours || "",
    closing_hours: restaurant.closing_hours || "",
    image: restaurant.image || "",
  };
}

function ProfileSkeleton() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Skeleton className="h-10 w-64" />
      <Skeleton className="h-[32rem] w-full rounded-2xl" />
    </div>
  );
}

export default function RestaurantProfilePage() {
  const router = useRouter();

  const [restaurant, setRestaurant] = useState<BackendRestaurant | null>(
    null
  );
  const [form, setForm] = useState<ProfileForm | null>(null);
  const [initial, setInitial] = useState<ProfileForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [imageError, setImageError] = useState(false);

  const isDirty = useMemo(() => {
    if (!form || !initial) return false;
    return JSON.stringify(form) !== JSON.stringify(initial);
  }, [form, initial]);

  useEffect(() => {
    let cancelled = false;

    async function loadProfile() {
      try {
        const email = getRestaurantOwnerEmail();
        if (!email) {
          setError("Restaurant owner email not found. Please log in again.");
          router.replace("/restaurant/login");
          return;
        }

        const data = await getRestaurantByEmail(email);
        if (cancelled) return;

        if (!data) {
          setError(
            "No restaurant listing is linked to your account yet. Ask an admin to create it."
          );
          setRestaurant(null);
          setForm(null);
          setInitial(null);
          return;
        }

        const nextForm = toForm(data);
        setRestaurant(data);
        setForm(nextForm);
        setInitial(nextForm);
        setError("");
      } catch (err) {
        if (cancelled) return;
        console.error(err);
        setError(
          err instanceof Error
            ? err.message
            : "Unable to load restaurant profile."
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadProfile();
    return () => {
      cancelled = true;
    };
  }, [router]);

  function validate(values: ProfileForm): string | null {
    if (!values.name.trim()) return "Restaurant name is required.";
    if (!values.cuisine.trim()) return "Cuisine is required.";
    if (!values.address.trim()) return "Address is required.";
    if (!values.phone.trim()) return "Phone number is required.";
    if (!PHONE_PATTERN.test(values.phone.trim())) {
      return "Enter a valid 10-digit Indian mobile number.";
    }
    if (!values.opening_hours.trim() || !values.closing_hours.trim()) {
      return "Opening and closing hours are required.";
    }
    if (
      !TIME_PATTERN.test(values.opening_hours.trim()) ||
      !TIME_PATTERN.test(values.closing_hours.trim())
    ) {
      return "Use 24-hour time format HH:MM (e.g. 09:30).";
    }
    if (!values.image.trim()) return "Restaurant image URL is required.";
    if (!IMAGE_PATTERN.test(values.image.trim())) {
      return "Image must be a valid URL or site path.";
    }
    return null;
  }

  function handleCancel() {
    if (!initial) return;
    setForm(initial);
    setImageError(false);
    setError("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form || !restaurant || !initial) return;

    if (!isDirty) {
      toast.message("No changes to save");
      return;
    }

    const validationError = validate(form);
    if (validationError) {
      setError(validationError);
      toast.error(validationError);
      return;
    }

    setSaving(true);
    setError("");

    try {
      await authJson(`/restaurants/${restaurant._id}`, {
        role: "restaurant_owner",
        method: "PUT",
        body: JSON.stringify({
          // Required by Restaurant schema; immutable fields echoed, ignored for owners
          slug: restaurant.slug,
          email: restaurant.email,
          rating: restaurant.rating ?? 4.5,
          delivery_time: restaurant.delivery_time || "30 min",
          distance: restaurant.distance || "2 km",
          latitude: restaurant.latitude ?? 18.52043,
          longitude: restaurant.longitude ?? 73.856743,
          // Safe profile fields
          name: form.name.trim(),
          description: form.description.trim(),
          address: form.address.trim(),
          phone: form.phone.trim(),
          cuisine: form.cuisine.trim(),
          opening_hours: form.opening_hours.trim(),
          closing_hours: form.closing_hours.trim(),
          image: form.image.trim(),
        }),
      });

      const next = { ...form };
      setInitial(next);
      setRestaurant({
        ...restaurant,
        ...next,
      });
      toast.success("Restaurant profile updated");
    } catch (err) {
      if (err instanceof AuthHttpError && err.status === 401) return;
      const message =
        err instanceof Error
          ? err.message
          : "Unable to update restaurant profile.";
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <ProfileSkeleton />;
  }

  if (!form || !restaurant) {
    return (
      <main className="mx-auto max-w-3xl space-y-4">
        <h1 className="text-4xl font-bold">Restaurant Profile</h1>
        <p className="rounded-xl bg-red-50 p-4 text-sm text-red-600">
          {error || "Restaurant profile unavailable."}
        </p>
        <Link
          href="/restaurant/dashboard"
          className="text-sm font-medium text-orange-600 hover:underline"
        >
          Back to Dashboard
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-4xl font-bold">Restaurant Profile</h1>
        <p className="mt-2 text-gray-500">
          Update your public restaurant listing details
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-5 rounded-2xl border bg-white p-6 shadow-sm sm:p-8"
      >
        {error && (
          <p className="rounded-xl bg-red-50 p-4 text-sm text-red-600">
            {error}
          </p>
        )}

        <div>
          <label className="mb-2 block text-sm font-semibold">
            Restaurant Email
          </label>
          <Input
            value={restaurant.email}
            disabled
            className="h-11 bg-gray-50"
          />
          <p className="mt-1 text-xs text-gray-500">
            Email cannot be changed.
          </p>
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold">
            Restaurant Name
          </label>
          <Input
            className="h-11"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold">
            Description
          </label>
          <textarea
            className="min-h-24 w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            value={form.description}
            onChange={(e) =>
              setForm({ ...form, description: e.target.value })
            }
            placeholder="Tell customers about your restaurant"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold">Address</label>
          <Input
            className="h-11"
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            required
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-semibold">Phone</label>
            <Input
              className="h-11"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="10-digit mobile"
              required
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-semibold">Cuisine</label>
            <Input
              className="h-11"
              value={form.cuisine}
              onChange={(e) => setForm({ ...form, cuisine: e.target.value })}
              required
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-semibold">
              Opening Hours
            </label>
            <Input
              className="h-11"
              value={form.opening_hours}
              onChange={(e) =>
                setForm({ ...form, opening_hours: e.target.value })
              }
              placeholder="09:00"
              required
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-semibold">
              Closing Hours
            </label>
            <Input
              className="h-11"
              value={form.closing_hours}
              onChange={(e) =>
                setForm({ ...form, closing_hours: e.target.value })
              }
              placeholder="22:00"
              required
            />
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold">
            Restaurant Image URL
          </label>
          <Input
            className="h-11"
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
              alt="Restaurant preview"
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

        <div className="flex flex-wrap gap-3 pt-2">
          <Button
            type="submit"
            disabled={saving || !isDirty}
            className="bg-orange-600 hover:bg-orange-700"
          >
            {saving ? "Saving..." : "Save Changes"}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={saving || !isDirty}
            onClick={handleCancel}
          >
            Cancel
          </Button>
          <Link
            href="/restaurant/dashboard"
            className="inline-flex h-10 items-center rounded-lg border px-4 text-sm font-medium hover:bg-gray-50"
          >
            Back to Dashboard
          </Link>
        </div>
      </form>
    </main>
  );
}
