"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ROUTES } from "@/lib/routes";
import { AUTH_STORAGE_KEYS } from "@/lib/authTokens";
import { loginAdmin } from "@/services/authService";

export default function AdminLoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const data = await loginAdmin({ email, password });
      const token = data.access_token;
      const role = "admin";

      // Set cookies with path=/ for Edge middleware authentication
      document.cookie = `cb_token=${token}; path=/; max-age=86400; SameSite=Lax`;
      document.cookie = `cb_role=${role}; path=/; max-age=86400; SameSite=Lax`;
      document.cookie = `adminToken=${token}; path=/; max-age=86400; SameSite=Lax`;

      localStorage.setItem(
        AUTH_STORAGE_KEYS.adminToken,
        token
      );

      localStorage.setItem(
        AUTH_STORAGE_KEYS.adminUser,
        JSON.stringify({ email })
      );

      window.location.href = ROUTES.ADMIN_ORDERS;
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to connect to server."
      );
    } finally {
      setLoading(false);
    }
  }


  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-xl">
        <h1 className="mb-2 text-center text-3xl font-bold">
          Admin Login
        </h1>
        <p className="mb-8 text-center text-gray-500">
          Sign in to manage CampusBite restaurants
        </p>

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="mb-2 block font-medium">Email</label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="mb-2 block font-medium">Password</label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Logging in..." : "Login"}
          </Button>
        </form>
      </div>
    </main>
  );
}
