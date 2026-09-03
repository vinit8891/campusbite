"use client";

import { useAuth } from "@/context/AuthContext";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ROUTES } from "@/lib/routes";
import { loginCustomer } from "@/services/authService";

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();

    setLoading(true);
    setError("");

    try {
      const data = await loginCustomer({ email, password });
      const token = data.access_token;
      const role = "customer";

      // Set cookies with path=/ for Edge middleware authentication
      document.cookie = `cb_token=${token}; path=/; max-age=86400; SameSite=Lax`;
      document.cookie = `cb_role=${role}; path=/; max-age=86400; SameSite=Lax`;
      document.cookie = `token=${token}; path=/; max-age=86400; SameSite=Lax`;

      login(
        {
          name: email.split("@")[0],
          email,
        },
        token
      );

      const redirectParam = searchParams.get("redirect");
      const targetUrl = redirectParam || ROUTES.HOME;

      window.location.href = targetUrl;
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
        Welcome Back 👋
      </h1>

      <p className="mb-8 text-center text-gray-500">
        Login to your CampusBite account
      </p>

      <form onSubmit={handleLogin} className="space-y-5">
        <div>
          <label htmlFor="login-email" className="mb-2 block font-medium">Email</label>
          <Input
            id="login-email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div>
          <label htmlFor="login-password" className="mb-2 block font-medium">Password</label>
          <Input
            id="login-password"
            type="password"
            autoComplete="current-password"
            placeholder="********"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        {error && <p className="text-sm text-red-600" role="alert">{error}</p>}

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Logging in..." : "Login"}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-500">
        Don&apos;t have an account?{" "}
        <Link
          href={ROUTES.REGISTER}
          className="font-semibold text-orange-600 hover:underline"
        >
          Register
        </Link>
      </p>
    </div>
  );
}
