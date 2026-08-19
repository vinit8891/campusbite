"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AUTH_STORAGE_KEYS } from "@/lib/authTokens";
import { ROUTES } from "@/lib/routes";
import { loginRestaurantOwner } from "@/services/authService";

export default function RestaurantLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const queryEmail = searchParams.get("email");
    if (queryEmail) {
      setEmail(queryEmail);
    }
  }, [searchParams]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();

    setLoading(true);
    setError("");

    try {
      const data = await loginRestaurantOwner({
        email,
        password,
      });

      const ownerEmail = data.email || email;

      localStorage.setItem(
        AUTH_STORAGE_KEYS.restaurantToken,
        data.access_token
      );

      localStorage.setItem(
        AUTH_STORAGE_KEYS.restaurantOwner,
        JSON.stringify({
          ownerName: data.owner_name,
          restaurantName: data.restaurant_name,
          email: ownerEmail,
        })
      );

      router.push(ROUTES.RESTAURANT_DASHBOARD);
    } catch (err) {

      setError(
        err instanceof Error ? err.message : "Unable to connect to server."
      );
    } finally {
      setLoading(false);
    }
  }


  return (
    <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-xl">
      <h1 className="mb-2 text-center text-3xl font-bold">
        Restaurant Login 🍽️
      </h1>

      <p className="mb-8 text-center text-gray-500">
        Login to your Restaurant Dashboard
      </p>

      <form onSubmit={handleLogin} className="space-y-5">
        <div>
          <label className="mb-2 block font-medium">Email</label>

          <Input
            type="email"
            placeholder="owner@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="mb-2 block font-medium">Password</label>

          <Input
            type="password"
            placeholder="********"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Logging in..." : "Login"}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-500">
        Don&apos;t have a restaurant owner account?{" "}
        <Link
          href={ROUTES.RESTAURANT_REGISTER}
          className="font-semibold text-orange-600 hover:underline"
        >
          Register Here
        </Link>
      </p>

    </div>
  );
}

