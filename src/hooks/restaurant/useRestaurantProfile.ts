"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { getRestaurantOwnerEmail } from "@/lib/authTokens";
import { ROUTES } from "@/lib/routes";
import { AuthHttpError, authJson } from "@/services/authFetch";
import {
  getRestaurantByEmail,
  type BackendRestaurant,
} from "@/services/restaurantService";

export type ProfileForm = {
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
const IMAGE_PATTERN = /^(https?:\/\/|\/|data:image\/).+/i;


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

export function useRestaurantProfile() {
  const router = useRouter();

  const [restaurant, setRestaurant] = useState<BackendRestaurant | null>(null);
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
          router.replace(ROUTES.RESTAURANT_LOGIN);
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
          slug: restaurant.slug,
          email: restaurant.email,
          rating: restaurant.rating ?? 4.5,
          delivery_time: restaurant.delivery_time || "30 min",
          distance: restaurant.distance || "2 km",
          latitude: restaurant.latitude ?? 18.52043,
          longitude: restaurant.longitude ?? 73.856743,
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

  return {
    restaurant,
    form,
    setForm,
    loading,
    saving,
    error,
    imageError,
    setImageError,
    isDirty,
    handleCancel,
    handleSubmit,
  };
}
