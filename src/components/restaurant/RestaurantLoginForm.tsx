"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function RestaurantLoginForm() {
  const router = useRouter();

  const [email, setEmail] = useState("");

  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState("");

  async function handleLogin(
    e: React.FormEvent
  ) {
    e.preventDefault();

    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        "http://127.0.0.1:8000/restaurant-owner/login",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            email,
            password,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setError(
          data.detail || "Login failed"
        );
        setLoading(false);
        return;
      }

      localStorage.setItem(
        "restaurantToken",
        data.access_token
      );

      localStorage.setItem(
        "restaurantOwner",
        JSON.stringify({
          ownerName: data.owner_name,
          restaurantName:
            data.restaurant_name,
        })
      );

      router.push(
        "/restaurant/dashboard"
      );

    } catch {
      setError(
        "Unable to connect to server."
      );
    }

    setLoading(false);
  }

  return (
    <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-xl">

      <h1 className="mb-2 text-center text-3xl font-bold">
        Restaurant Login 🍽️
      </h1>

      <p className="mb-8 text-center text-gray-500">
        Login to your Restaurant Dashboard
      </p>

      <form
        onSubmit={handleLogin}
        className="space-y-5"
      >

        <div>

          <label className="mb-2 block font-medium">
            Email
          </label>

          <Input
            type="email"
            placeholder="owner@example.com"
            value={email}
            onChange={(e) =>
              setEmail(e.target.value)
            }
            required
          />

        </div>

        <div>

          <label className="mb-2 block font-medium">
            Password
          </label>

          <Input
            type="password"
            placeholder="********"
            value={password}
            onChange={(e) =>
              setPassword(e.target.value)
            }
            required
          />

        </div>

        {error && (
          <p className="text-red-600 text-sm">
            {error}
          </p>
        )}

        <Button
          type="submit"
          className="w-full"
          disabled={loading}
        >
          {loading
            ? "Logging in..."
            : "Login"}
        </Button>

      </form>

    </div>
  );
}