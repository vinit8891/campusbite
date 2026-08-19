"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/routes";

export default function SuccessCard() {
  return (
    <div className="w-full max-w-xl rounded-3xl border bg-white p-10 text-center shadow-lg">

      <div className="text-7xl">
        🎉
      </div>

      <h1 className="mt-6 text-4xl font-bold">
        Order Placed Successfully!
      </h1>

      <p className="mt-4 text-gray-500">
        Thank you for ordering with CampusBite.
      </p>

      <p className="mt-2 text-gray-500">
        Your food is being prepared 🍔
      </p>

      <Link href={ROUTES.HOME}>
        <Button className="mt-8 w-full">
          Back to Home
        </Button>
      </Link>


    </div>
  );
}