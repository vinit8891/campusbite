"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { AUTH_STORAGE_KEYS } from "@/lib/authTokens";
import { ROUTES } from "@/lib/routes";
import { loginDeliveryPartner } from "@/services/authService";

export default function DeliveryLoginForm() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function handleLogin(
    e: React.FormEvent
  ) {
    e.preventDefault();
    setError("");

    try {
      const data = await loginDeliveryPartner({
        email,
        password,
      });

      if (!data.success) {
        setError(data.message || "Invalid Login");
        return;
      }

      const token = data.access_token || data.token;

      if (!token) {
        setError("Login succeeded but no token was returned.");
        return;
      }

      localStorage.setItem(
        AUTH_STORAGE_KEYS.deliveryToken,
        token
      );

      localStorage.setItem(
        AUTH_STORAGE_KEYS.deliveryPartner,
        JSON.stringify(data.partner)
      );

      router.push(ROUTES.DELIVERY_DASHBOARD);
    } catch (err) {

      setError(
        err instanceof Error ? err.message : "Unable to connect to server."
      );
    }
  }


  return (
    <form
      onSubmit={handleLogin}
      className="w-full max-w-md rounded-3xl bg-white p-8 shadow-xl"
    >
      <h1 className="mb-8 text-center text-3xl font-bold">
        Delivery Partner Login
      </h1>

      <input
        className="mb-5 w-full rounded-lg border p-3"
        placeholder="Email"
        value={email}
        onChange={(e) =>
          setEmail(e.target.value)
        }
      />

      <input
        type="password"
        className="mb-6 w-full rounded-lg border p-3"
        placeholder="Password"
        value={password}
        onChange={(e) =>
          setPassword(e.target.value)
        }
      />

      {error && (
        <p className="mb-4 text-sm text-red-600">
          {error}
        </p>
      )}

      <button className="w-full rounded-xl bg-orange-600 py-3 font-semibold text-white">
        Login
      </button>
    </form>
  );
}
