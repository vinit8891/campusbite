"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ROUTES } from "@/lib/routes";
import { requestPasswordReset } from "@/services/authService";
import type { ForgotPasswordPayload } from "@/types";

const ROLES: { id: ForgotPasswordPayload["role"]; label: string; loginRoute: string }[] = [
  { id: "customer", label: "Customer", loginRoute: ROUTES.LOGIN },
  { id: "restaurant_owner", label: "Restaurant", loginRoute: ROUTES.RESTAURANT_LOGIN },
  { id: "delivery_partner", label: "Delivery", loginRoute: ROUTES.DELIVERY_LOGIN },
];

const forgotPasswordSchema = z.object({
  email: z.string().trim().email("Please enter a valid email address"),
  role: z.enum(["customer", "restaurant_owner", "delivery_partner"]),
});

export default function ForgotPasswordForm() {
  const searchParams = useSearchParams();
  const roleParam = searchParams.get("role") as ForgotPasswordPayload["role"] | null;

  const [role, setRole] = useState<ForgotPasswordPayload["role"]>("customer");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (roleParam && (roleParam === "customer" || roleParam === "restaurant_owner" || roleParam === "delivery_partner")) {
      setRole(roleParam);
    }
  }, [roleParam]);

  const activeRoleConfig = ROLES.find((r) => r.id === role) || ROLES[0];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const validation = forgotPasswordSchema.safeParse({ email, role });
    if (!validation.success) {
      const firstError = validation.error.issues[0]?.message || "Invalid input";
      setError(firstError);
      toast.error(firstError);
      return;
    }

    setLoading(true);

    try {
      const res = await requestPasswordReset({
        email: validation.data.email,
        role: validation.data.role,
      });

      setSubmitted(true);
      toast.success(res.message || "Reset link generated if account exists.");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unable to process request.";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-xl text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-2xl">
          ✉️
        </div>
        <h1 className="mb-2 text-2xl font-bold text-gray-900">Check Your Email</h1>
        <p className="mb-6 text-sm text-gray-600">
          If an account exists for <span className="font-semibold text-gray-800">{email}</span> as a{" "}
          <span className="font-semibold text-orange-600">{activeRoleConfig.label}</span>, we have dispatched a password reset link.
        </p>
        <p className="mb-6 text-xs text-gray-400">
          The link will expire in 15 minutes for your security.
        </p>
        <Link
          href={activeRoleConfig.loginRoute}
          className="inline-block w-full rounded-xl bg-orange-600 py-3 text-center font-medium text-white shadow transition hover:bg-orange-700"
        >
          Return to Login
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-xl">
      <h1 className="mb-2 text-center text-3xl font-bold">Reset Password 🔒</h1>
      <p className="mb-6 text-center text-gray-500">
        Enter your registered email to receive a recovery link.
      </p>

      {/* Role Selection */}
      <div className="mb-6">
        <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-gray-500">
          Select Your Role
        </label>
        <div className="grid grid-cols-3 gap-2 rounded-xl bg-gray-100 p-1">
          {ROLES.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => {
                setRole(r.id);
                setError("");
              }}
              className={`rounded-lg py-2 text-xs font-medium transition ${
                role === r.id
                  ? "bg-white text-orange-600 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        <div>
          <label htmlFor="forgot-email" className="mb-2 block font-medium">
            Email Address
          </label>
          <Input
            id="forgot-email"
            type="email"
            autoComplete="email"
            aria-label="Email address"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        {error && (
          <p className="text-sm text-red-600" role="alert">
            {error}
          </p>
        )}

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Sending link..." : "Send Reset Link"}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-500">
        Remember your password?{" "}
        <Link
          href={activeRoleConfig.loginRoute}
          className="font-semibold text-orange-600 hover:underline"
        >
          Back to Login
        </Link>
      </p>
    </div>
  );
}
