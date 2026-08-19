import { Suspense } from "react";
import RestaurantLoginForm from "@/components/restaurant/RestaurantLoginForm";

export default function RestaurantLoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-orange-50">
      <Suspense fallback={<div className="text-gray-500">Loading...</div>}>
        <RestaurantLoginForm />
      </Suspense>
    </main>
  );
}