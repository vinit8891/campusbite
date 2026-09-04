"use client";

import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import { ROUTES } from "@/lib/routes";
import { useRestaurantProfile } from "@/hooks/restaurant/useRestaurantProfile";
import { RestaurantProfileForm } from "@/components/restaurant/RestaurantProfileForm";

function ProfileSkeleton() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Skeleton className="h-10 w-64" />
      <Skeleton className="h-[32rem] w-full rounded-2xl" />
    </div>
  );
}

export default function RestaurantProfilePage() {
  const {
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
  } = useRestaurantProfile();

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
          href={ROUTES.RESTAURANT_DASHBOARD}
          className="text-sm font-medium text-orange-600 hover:underline"
        >
          Back to Dashboard
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl space-y-4 md:space-y-6 pb-32 md:pb-12">
      <div className="hidden md:block">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-stone-900 tracking-tight">
          Restaurant Profile
        </h1>
        <p className="mt-1 text-sm text-stone-500">
          Update your public restaurant listing details and store information
        </p>
      </div>

      <RestaurantProfileForm
        restaurant={restaurant}
        form={form}
        setForm={setForm}
        saving={saving}
        error={error}
        imageError={imageError}
        setImageError={setImageError}
        isDirty={isDirty}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
      />
    </main>
  );
}
