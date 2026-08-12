"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import MenuItemForm, {
  type MenuFormValues,
} from "@/components/restaurant/MenuItemForm";
import { Skeleton } from "@/components/ui/skeleton";
import { publicFetch } from "@/services/authFetch";

export default function EditFoodPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [initialValues, setInitialValues] = useState<MenuFormValues | null>(
    null
  );

  useEffect(() => {
    let cancelled = false;

    async function fetchFood() {
      try {
        const res = await publicFetch(`/menu/item/${id}`, {
          cache: "no-store",
        });

        if (!res.ok) {
          throw new Error("Menu item not found.");
        }

        const data = await res.json();
        if (cancelled) return;

        setInitialValues({
          name: data.name || "",
          description: data.description || "",
          price: String(data.price ?? ""),
          category: data.category || "",
          image: data.image || "",
          available: Boolean(data.available),
        });
        setError("");
      } catch (err) {
        if (cancelled) return;
        console.error(err);
        setError(
          err instanceof Error ? err.message : "Unable to load menu item."
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void fetchFood();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) {
    return (
      <main className="mx-auto max-w-3xl space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96 w-full rounded-2xl" />
      </main>
    );
  }

  if (error || !initialValues) {
    return (
      <main className="mx-auto max-w-3xl space-y-4">
        <p className="rounded-xl bg-red-50 p-4 text-sm text-red-600">
          {error || "Unable to load menu item."}
        </p>
        <button
          type="button"
          onClick={() => router.push("/restaurant/dashboard/menu")}
          className="text-sm font-medium text-orange-600 hover:underline"
        >
          Back to Menu
        </button>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link
          href="/restaurant/dashboard/menu"
          className="text-sm text-gray-500 hover:text-gray-800"
        >
          ← Back to Menu
        </Link>
        <h1 className="mt-3 text-4xl font-bold">Edit Food</h1>
        <p className="mt-2 text-gray-500">
          Update details for {initialValues.name}
        </p>
      </div>

      <MenuItemForm mode="edit" itemId={id} initialValues={initialValues} />
    </main>
  );
}
