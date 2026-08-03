"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";

export default function ProfilePage() {
  const router = useRouter();

  const {
    user,
    logout,
    isLoggedIn,
  } = useAuth();

  useEffect(() => {
    if (!isLoggedIn) {
      router.replace("/login");
    }
  }, [isLoggedIn, router]);

  if (!isLoggedIn || !user) {
    return null;
  }

  return (
    <main className="mx-auto max-w-4xl px-6 py-12">

      <h1 className="mb-10 text-4xl font-bold">
        My Profile
      </h1>

      <div className="rounded-3xl border bg-white p-8 shadow-sm">

        <div className="mb-8 flex items-center gap-5">

          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-orange-500 text-3xl font-bold text-white">
            {user.name.charAt(0).toUpperCase()}
          </div>

          <div>

            <h2 className="text-2xl font-bold">
              {user.name}
            </h2>

            <p className="text-gray-500">
              {user.email}
            </p>

          </div>

        </div>

        <hr className="mb-8" />

        <div className="space-y-5">

          <Button
            variant="outline"
            className="w-full justify-start"
          >
            📍 Saved Addresses
          </Button>

          <Button
            variant="outline"
            className="w-full justify-start"
          >
            ❤️ Favorite Restaurants
          </Button>

          <Button
            variant="outline"
            className="w-full justify-start"
          >
            ⚙️ Account Settings
          </Button>

          <Button
            variant="destructive"
            className="w-full"
            onClick={() => {
              logout();
              router.push("/");
            }}
          >
            Logout
          </Button>

        </div>

      </div>

    </main>
  );
}