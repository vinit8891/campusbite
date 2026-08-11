"use client";

import { useAuth } from "@/context/AuthContext";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { publicFetch } from "@/services/authFetch";

function extractError(detail: unknown, fallback: string) {
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail
      .map((item) =>
        typeof item === "object" && item && "msg" in item
          ? String((item as { msg: unknown }).msg)
          : String(item)
      )
      .join(", ");
  }
  return fallback;
}

export default function RegisterForm() {
  const router = useRouter();
  const { login } = useAuth();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const trimmedName = fullName.trim();
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedPhone = phone.trim();

    if (trimmedName.length < 2) {
      setError("Please enter your full name.");
      return;
    }

    if (!/^[0-9]{10}$/.test(trimmedPhone)) {
      setError("Please enter a valid 10-digit mobile number.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const registerRes = await publicFetch("/auth/register", {
        method: "POST",
        body: JSON.stringify({
          full_name: trimmedName,
          email: trimmedEmail,
          phone: trimmedPhone,
          password,
        }),
      });

      const registerData = await registerRes.json().catch(() => null);

      if (!registerRes.ok) {
        setError(
          extractError(
            registerData?.detail,
            "Registration failed. Please try again."
          )
        );
        setLoading(false);
        return;
      }

      // Existing Phase 2 flow: register → login → AuthContext JWT
      const loginRes = await publicFetch("/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email: trimmedEmail,
          password,
        }),
      });

      const loginData = await loginRes.json().catch(() => null);

      if (!loginRes.ok || !loginData?.access_token) {
        setError(
          "Account created. Please log in with your credentials."
        );
        setLoading(false);
        router.push("/login");
        return;
      }

      login(
        {
          name: trimmedName,
          email: trimmedEmail,
          phone: trimmedPhone,
        },
        loginData.access_token
      );

      router.push("/");
    } catch {
      setError("Unable to connect to server.");
    }

    setLoading(false);
  }

  return (
    <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-xl">
      <h1 className="mb-2 text-center text-3xl font-bold">
        Create Account
      </h1>

      <p className="mb-8 text-center text-gray-500">
        Join CampusBite and order from campus restaurants
      </p>

      <form onSubmit={handleRegister} className="space-y-5">
        <div>
          <label className="mb-2 block font-medium">Full Name</label>
          <Input
            type="text"
            placeholder="Your name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="mb-2 block font-medium">Email</label>
          <Input
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="mb-2 block font-medium">Phone</label>
          <Input
            type="tel"
            placeholder="10-digit mobile number"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
            maxLength={10}
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
            minLength={6}
          />
        </div>

        <div>
          <label className="mb-2 block font-medium">
            Confirm Password
          </label>
          <Input
            type="password"
            placeholder="********"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            minLength={6}
          />
        </div>

        {error && (
          <p className="text-sm text-red-600">{error}</p>
        )}

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Creating account..." : "Register"}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-500">
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-semibold text-orange-600 hover:underline"
        >
          Login
        </Link>
      </p>
    </div>
  );
}
