"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AUTH_STORAGE_KEYS,
  getDeliveryPartnerSession,
} from "@/lib/authTokens";
import { AuthHttpError } from "@/services/authFetch";
import {
  getDeliveryPartnerProfile,
  updateDeliveryPartnerProfile,
  updateDeliveryStatus,
  type DeliveryPartnerProfile,
} from "@/services/deliveryPartnerService";

type ProfileForm = {
  name: string;
  vehicle_type: string;
  vehicle_number: string;
  profile_image: string;
  online: boolean;
};

const IMAGE_PATTERN = /^(https?:\/\/|\/).+/i;

function toForm(profile: DeliveryPartnerProfile): ProfileForm {
  return {
    name: profile.name || "",
    vehicle_type: profile.vehicle_type || profile.vehicle || "",
    vehicle_number: profile.vehicle_number || "",
    profile_image: profile.profile_image || "",
    online: Boolean(profile.online),
  };
}

function ProfileSkeleton() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Skeleton className="h-10 w-64" />
      <Skeleton className="h-[36rem] w-full rounded-2xl" />
    </div>
  );
}

function syncSession(profile: DeliveryPartnerProfile) {
  try {
    const current = getDeliveryPartnerSession();
    localStorage.setItem(
      AUTH_STORAGE_KEYS.deliveryPartner,
      JSON.stringify({
        ...(current || {}),
        id: profile.id,
        name: profile.name,
        email: profile.email,
        phone: profile.phone,
        vehicle: profile.vehicle || profile.vehicle_type,
        vehicle_number: profile.vehicle_number,
      })
    );
  } catch {
    // ignore storage errors
  }
}

export default function DeliveryProfilePage() {
  const router = useRouter();

  const [profile, setProfile] = useState<DeliveryPartnerProfile | null>(null);
  const [form, setForm] = useState<ProfileForm | null>(null);
  const [initial, setInitial] = useState<ProfileForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toggling, setToggling] = useState(false);
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
        const session = getDeliveryPartnerSession();
        if (!session?.phone) {
          setError("Delivery partner session not found. Please log in again.");
          router.replace("/delivery/login");
          return;
        }

        const data = await getDeliveryPartnerProfile();
        if (cancelled) return;

        const nextForm = toForm(data);
        setProfile(data);
        setForm(nextForm);
        setInitial(nextForm);
        syncSession(data);
        setError("");
      } catch (err) {
        if (cancelled) return;
        console.error(err);
        if (err instanceof AuthHttpError && err.status === 401) return;
        setError(
          err instanceof Error
            ? err.message
            : "Unable to load delivery profile."
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
    if (!values.name.trim()) return "Name is required.";
    if (!values.vehicle_type.trim()) return "Vehicle type is required.";
    if (!values.vehicle_number.trim()) return "Vehicle number is required.";
    if (
      values.profile_image.trim() &&
      !IMAGE_PATTERN.test(values.profile_image.trim())
    ) {
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

  async function handleToggleOnline() {
    if (!form || !profile) return;

    const nextOnline = !form.online;
    setToggling(true);
    setError("");

    try {
      await updateDeliveryStatus(profile.phone, nextOnline);
      const nextForm = { ...form, online: nextOnline };
      setForm(nextForm);
      setInitial({ ...(initial || nextForm), online: nextOnline });
      setProfile({ ...profile, online: nextOnline });
      toast.success(nextOnline ? "You are online" : "You are offline");
    } catch (err) {
      console.error(err);
      if (err instanceof AuthHttpError && err.status === 401) return;
      const message =
        err instanceof Error ? err.message : "Failed to update availability";
      setError(message);
      toast.error(message);
    } finally {
      setToggling(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form || !profile || !initial) return;

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
      const result = await updateDeliveryPartnerProfile({
        name: form.name.trim(),
        vehicle_type: form.vehicle_type.trim(),
        vehicle_number: form.vehicle_number.trim(),
        profile_image: form.profile_image.trim(),
        online: form.online,
      });

      const updated = result.partner;
      const nextForm = toForm(updated);
      setProfile(updated);
      setForm(nextForm);
      setInitial(nextForm);
      syncSession(updated);
      setImageError(false);
      toast.success("Profile updated successfully");
    } catch (err) {
      console.error(err);
      if (err instanceof AuthHttpError && err.status === 401) return;
      const message =
        err instanceof Error ? err.message : "Failed to update profile";
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <ProfileSkeleton />;
  }

  if (!form || !profile) {
    return (
      <div className="mx-auto max-w-3xl rounded-2xl border bg-white p-8 shadow">
        <h1 className="text-2xl font-bold">Delivery Profile</h1>
        <p className="mt-3 text-red-600">
          {error || "Unable to load profile."}
        </p>
      </div>
    );
  }

  const previewSrc = form.profile_image.trim();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-4xl font-bold">Profile</h1>
        <p className="mt-2 text-gray-500">
          Update your delivery partner details and availability.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-6 rounded-3xl border bg-white p-8 shadow"
      >
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
          <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-full bg-orange-100">
            {previewSrc && !imageError ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={previewSrc}
                alt="Profile"
                className="h-full w-full object-cover"
                onError={() => setImageError(true)}
              />
            ) : (
              <span className="text-4xl font-bold text-orange-600">
                {(form.name || "D").charAt(0).toUpperCase()}
              </span>
            )}
          </div>

          <div className="flex-1 space-y-2 text-center sm:text-left">
            <h2 className="text-2xl font-bold">{form.name || "Delivery Partner"}</h2>
            <p className="text-gray-500">{profile.email}</p>
            <p className="text-sm text-gray-500">
              Phone is linked to your account and cannot be changed here.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-orange-50 px-5 py-4">
          <div>
            <p className="font-semibold text-gray-800">Availability</p>
            <p className="text-sm text-gray-500">
              {form.online
                ? "You are online and can receive deliveries."
                : "You are offline."}
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            disabled={toggling}
            onClick={() => void handleToggleOnline()}
            className={
              form.online
                ? "border-green-600 text-green-700"
                : "border-red-500 text-red-600"
            }
          >
            {toggling
              ? "Updating..."
              : form.online
                ? "Online"
                : "Offline"}
          </Button>
        </div>

        {error ? (
          <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2 text-sm">
            <span className="font-medium text-gray-700">Name</span>
            <Input
              value={form.name}
              onChange={(e) =>
                setForm({ ...form, name: e.target.value })
              }
              placeholder="Your full name"
            />
          </label>

          <label className="space-y-2 text-sm">
            <span className="font-medium text-gray-700">Phone</span>
            <Input value={profile.phone} disabled readOnly />
          </label>

          <label className="space-y-2 text-sm">
            <span className="font-medium text-gray-700">Email</span>
            <Input value={profile.email} disabled readOnly />
          </label>

          <label className="space-y-2 text-sm">
            <span className="font-medium text-gray-700">Vehicle Type</span>
            <Input
              value={form.vehicle_type}
              onChange={(e) =>
                setForm({ ...form, vehicle_type: e.target.value })
              }
              placeholder="Bike, Scooter, etc."
            />
          </label>

          <label className="space-y-2 text-sm">
            <span className="font-medium text-gray-700">Vehicle Number</span>
            <Input
              value={form.vehicle_number}
              onChange={(e) =>
                setForm({ ...form, vehicle_number: e.target.value })
              }
              placeholder="MH12AB1234"
            />
          </label>

          <label className="space-y-2 text-sm md:col-span-2">
            <span className="font-medium text-gray-700">
              Profile Image URL (optional)
            </span>
            <Input
              value={form.profile_image}
              onChange={(e) => {
                setImageError(false);
                setForm({ ...form, profile_image: e.target.value });
              }}
              placeholder="https://… or /images/…"
            />
          </label>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button type="submit" disabled={!isDirty || saving}>
            {saving ? "Saving..." : "Save"}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={!isDirty || saving}
            onClick={handleCancel}
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
