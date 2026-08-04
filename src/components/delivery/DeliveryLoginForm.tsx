"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function DeliveryLoginForm() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function handleLogin(
    e: React.FormEvent
  ) {
    e.preventDefault();

    const res = await fetch(
      "http://127.0.0.1:8000/delivery/login",
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

    const data = await res.json();

    if (!data.success) {
      alert("Invalid Login");
      return;
    }

    localStorage.setItem(
      "deliveryPartner",
      JSON.stringify(data.partner)
    );

    router.push("/delivery/dashboard");
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

      <button className="w-full rounded-xl bg-orange-600 py-3 font-semibold text-white">
        Login
      </button>
    </form>
  );
}