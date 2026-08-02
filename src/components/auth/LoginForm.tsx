"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function LoginForm() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  function handleLogin(e: React.FormEvent) {
    e.preventDefault();

    // Temporary login
    alert("Login Successful!");

    router.push("/");
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
          />
        </div>

        <Button
          type="submit"
          className="w-full"
        >
          Login
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