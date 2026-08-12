"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { AuthHttpError, deleteRestaurant } from "@/services/adminService";

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
    <Button
      type="button"
      variant="outline"
      onClick={() => void handleDelete()}
      disabled={loading}
      className="h-9 border-red-200 bg-red-500 text-white hover:bg-red-600 hover:text-white"
    >
      {loading ? "Deleting..." : "Delete"}
    </Button>
  );
}
