"use client";

import { useAuth } from "@/context/AuthContext";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { publicFetch } from "@/services/authFetch";

export default function LoginForm() {
  const router = useRouter();
  const { login } = useAuth();

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
      const response = await publicFetch("/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(
          data.detail || "Login failed"
        );
        setLoading(false);
        return;
      }

      login(
        {
          name: email.split("@")[0],
          email,
        },
        data.access_token
      );

      router.push("/");

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
        Welcome Back 👋
      </h1>

      <p className="mb-8 text-center text-gray-500">
        Login to your CampusBite account
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
            placeholder="you@example.com"
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
          <p className="text-sm text-red-600">
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

      <p className="mt-6 text-center text-sm text-gray-500">
        Don't have an account?{" "}
        <Link
          href="/register"
          className="font-semibold text-orange-600 hover:underline"
        >
          Register
        </Link>
      </p>

    </div>
  );
}
