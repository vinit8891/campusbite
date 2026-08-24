"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ROUTES } from "@/lib/routes";
import { resetPassword } from "@/services/authService";

const resetPasswordSchema = z
  .object({
    password: z.string().min(8, "Password must be at least 8 characters long"),
    confirmPassword: z.string().min(8, "Confirm Password must be at least 8 characters long"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

function getLoginRouteForRole(role: string): string {
  switch (role) {
    case "restaurant_owner":
      return ROUTES.RESTAURANT_LOGIN;
    case "delivery_partner":
      return ROUTES.DELIVERY_LOGIN;
    case "admin":
      return ROUTES.ADMIN_LOGIN;
    default:
      return ROUTES.LOGIN;
  }
}

export default function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const token = searchParams.get("token") || "";
  const role = searchParams.get("role") || "customer";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const loginRoute = getLoginRouteForRole(role);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!token) {
      const msg = "Invalid or missing password reset token. Please request a new link.";
      setError(msg);
      toast.error(msg);
      return;
    }

    const validation = resetPasswordSchema.safeParse({
      password,
      confirmPassword,
    });

    if (!validation.success) {
      const firstError = validation.error.issues[0]?.message || "Invalid password";
      setError(firstError);
      toast.error(firstError);
      return;
    }

    setLoading(true);

    try {
      const res = await resetPassword({
        token,
        new_password: validation.data.password,
        role,
      });

      setSuccess(true);
      toast.success(res.message || "Password reset successfully!");
      setTimeout(() => {
        router.push(loginRoute);
      }, 2500);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unable to reset password.";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-xl text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-100 text-2xl">
          ⚠️
        </div>
        <h1 className="mb-2 text-2xl font-bold text-gray-900">Invalid Reset Link</h1>
        <p className="mb-6 text-sm text-gray-600">
          This password reset link is invalid or incomplete. Please request a new recovery link.
        </p>
        <Link
          href={`/forgot-password?role=${encodeURIComponent(role)}`}
          className="inline-block w-full rounded-xl bg-orange-600 py-3 text-center font-medium text-white shadow transition hover:bg-orange-700"
        >
          Request New Link
        </Link>
      </div>
    );
  }

  if (success) {
    return (
      <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-xl text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-2xl">
          ✅
        </div>
        <h1 className="mb-2 text-2xl font-bold text-gray-900">Password Reset Complete</h1>
        <p className="mb-6 text-sm text-gray-600">
          Your password has been updated successfully. Redirecting you to login...
        </p>
        <Link
          href={loginRoute}
          className="inline-block w-full rounded-xl bg-orange-600 py-3 text-center font-medium text-white shadow transition hover:bg-orange-700"
        >
          Go to Login
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-xl">
      <h1 className="mb-2 text-center text-3xl font-bold">New Password 🔑</h1>
      <p className="mb-6 text-center text-gray-500">
        Enter your new password below (min. 8 characters).
      </p>

      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        <div>
          <label htmlFor="reset-password" className="mb-2 block font-medium">
            New Password
          </label>
          <Input
            id="reset-password"
            type="password"
            autoComplete="new-password"
            aria-label="New Password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
          />
        </div>

        <div>
          <label htmlFor="reset-confirm-password" className="mb-2 block font-medium">
            Confirm New Password
          </label>
          <Input
            id="reset-confirm-password"
            type="password"
            autoComplete="new-password"
            aria-label="Confirm Password"
            placeholder="••••••••"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            minLength={8}
          />
        </div>

        {error && (
          <p className="text-sm text-red-600" role="alert">
            {error}
          </p>
        )}

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Updating password..." : "Update Password"}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-500">
        Remembered your credentials?{" "}
        <Link
          href={loginRoute}
          className="font-semibold text-orange-600 hover:underline"
        >
          Back to Login
        </Link>
      </p>
    </div>
  );
}
