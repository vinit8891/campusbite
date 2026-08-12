"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { deleteRestaurant, AuthHttpError } from "@/services/adminService";

type Props = {
  id: string;
  name?: string;
  onDeleted?: () => void;
};

export default function DeleteRestaurantButton({
  id,
  name,
  onDeleted,
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    const label = name ? `"${name}"` : "this restaurant";
    const ok = confirm(`Delete ${label}? This cannot be undone.`);

    if (!ok) return;

    setLoading(true);

    try {
      await deleteRestaurant(id);
      toast.success("Restaurant deleted");
      onDeleted?.();
      router.refresh();
    } catch (err) {
      if (err instanceof AuthHttpError && err.status === 401) {
        return;
      }
      toast.error(
        err instanceof Error
          ? err.message
          : "Failed to delete restaurant"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={() => void handleDelete()}
      disabled={loading}
      className="rounded-lg bg-red-500 px-4 py-2 text-white hover:bg-red-600 disabled:opacity-60"
    >
      {loading ? "Deleting..." : "Delete"}
    </button>
  );
}
