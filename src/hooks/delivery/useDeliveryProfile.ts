"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AUTH_STORAGE_KEYS, getDeliveryPartnerSession } from "@/lib/authTokens";
import { ROUTES } from "@/lib/routes";
import { AuthHttpError } from "@/services/authFetch";
import {
  getDeliveryPartnerProfile,
  updateDeliveryPartnerProfile,
  updateDeliveryStatus,
  type DeliveryPartnerProfile,
} from "@/services/deliveryPartnerService";

export type ProfileForm = {
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
    // ignore
  }
}

export function useDeliveryProfile() {
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
          router.replace(ROUTES.DELIVERY_LOGIN);
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
        setError(err instanceof Error ? err.message : "Unable to load delivery profile.");
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
    if (values.profile_image.trim() && !IMAGE_PATTERN.test(values.profile_image.trim())) {
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
      const message = err instanceof Error ? err.message : "Failed to update availability";
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
      const message = err instanceof Error ? err.message : "Failed to update profile";
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  return {
    profile,
    form,
    setForm,
    loading,
    saving,
    toggling,
    error,
    imageError,
    setImageError,
    isDirty,
    handleCancel,
    handleToggleOnline,
    handleSubmit,
  };
}
