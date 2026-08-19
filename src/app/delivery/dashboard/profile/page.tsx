"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { useDeliveryProfile } from "@/hooks/delivery/useDeliveryProfile";
import { DeliveryProfileForm } from "@/components/delivery/DeliveryProfileForm";

function ProfileSkeleton() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Skeleton className="h-10 w-64" />
      <Skeleton className="h-[36rem] w-full rounded-2xl" />
    </div>
  );
}

export default function DeliveryProfilePage() {
  const {
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
  } = useDeliveryProfile();

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

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-4xl font-bold">Profile</h1>
        <p className="mt-2 text-gray-500">
          Update your delivery partner details and availability.
        </p>
      </div>

      <DeliveryProfileForm
        profile={profile}
        form={form}
        setForm={setForm}
        saving={saving}
        toggling={toggling}
        error={error}
        imageError={imageError}
        setImageError={setImageError}
        isDirty={isDirty}
        onToggleOnline={() => void handleToggleOnline()}
        onCancel={handleCancel}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
