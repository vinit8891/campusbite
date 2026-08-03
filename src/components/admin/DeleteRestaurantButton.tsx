"use client";

import { useRouter } from "next/navigation";
import { deleteRestaurant } from "@/services/adminService";

type Props = {
  id: string;
};

export default function DeleteRestaurantButton({ id }: Props) {
  const router = useRouter();

  async function handleDelete() {
    const ok = confirm("Delete this restaurant?");

    if (!ok) return;

    await deleteRestaurant(id);

    alert("Restaurant Deleted");

    router.refresh();
  }

  return (
    <button
      onClick={handleDelete}
      className="rounded bg-red-500 px-4 py-2 text-white hover:bg-red-600"
    >
      Delete
    </button>
  );
}