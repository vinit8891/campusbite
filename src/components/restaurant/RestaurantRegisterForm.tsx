"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ROUTES } from "@/lib/routes";
import { registerRestaurantOwner } from "@/services/restaurantService";


const RESTAURANT_TYPES = [
  "Fast Food",
  "Dine-in",
  "Cafe",
  "Bakery",
  "Cloud Kitchen",
  "North Indian",
  "South Indian",
  "Chinese",
  "Multi-Cuisine",
] as const;

export default function RestaurantRegisterForm() {
  const router = useRouter();

  // Section 1: Account Information
  const [ownerName, setOwnerName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Section 2: Restaurant Information
  const [restaurantName, setRestaurantName] = useState("");
  const [restaurantType, setRestaurantType] = useState<string>(RESTAURANT_TYPES[0]);
  const [customType, setCustomType] = useState("");
  const [useCustomType, setUseCustomType] = useState(false);
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [pincode, setPincode] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const trimmedOwnerName = ownerName.trim();
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedPhone = phone.trim();
    const trimmedRestaurantName = restaurantName.trim();
    const finalType = (useCustomType ? customType : restaurantType).trim();
    const trimmedAddress = address.trim();
    const trimmedCity = city.trim();
    const trimmedPincode = pincode.trim();

    if (!trimmedOwnerName) {
      setError("Please enter owner name.");
      return;
    }

    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setError("Please enter a valid email address.");
      return;
    }

    if (!/^[0-9]{10}$/.test(trimmedPhone)) {
      setError("Please enter a valid 10-digit mobile phone number.");
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

    if (!trimmedRestaurantName) {
      setError("Please enter restaurant name.");
      return;
    }

    if (!finalType) {
      setError("Please specify restaurant type.");
      return;
    }

    if (!trimmedAddress) {
      setError("Please enter restaurant address.");
      return;
    }

    if (!trimmedCity) {
      setError("Please enter city.");
      return;
    }

    if (!/^[0-9]{6}$/.test(trimmedPincode)) {
      setError("Please enter a valid 6-digit PIN code.");
      return;
    }

    setLoading(true);

    try {
      await registerRestaurantOwner({
        owner_name: trimmedOwnerName,
        restaurant_name: trimmedRestaurantName,
        email: trimmedEmail,
        phone: trimmedPhone,
        password,
        restaurant_type: finalType,
        address: trimmedAddress,
        city: trimmedCity,
        pincode: trimmedPincode,
      });

      toast.success("Registration successful! Redirecting to login...");

      setTimeout(() => {
        router.push(
          `${ROUTES.RESTAURANT_LOGIN}?email=${encodeURIComponent(trimmedEmail)}`
        );
      }, 1000);

    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Registration failed. Please try again."
      );
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-2xl rounded-3xl bg-white p-8 shadow-xl">
      <h1 className="mb-2 text-center text-3xl font-bold">
        Partner with CampusBite 🍽️
      </h1>

      <p className="mb-8 text-center text-gray-500">
        Register your restaurant owner account to start receiving campus orders
      </p>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* SECTION 1: Account Information */}
        <section className="space-y-4 rounded-2xl bg-orange-50/50 p-5 border border-orange-100">
          <h2 className="text-lg font-semibold text-orange-900 border-b border-orange-200 pb-2">
            1. Account Information
          </h2>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Owner Full Name *
              </label>
              <Input
                type="text"
                placeholder="e.g. Rahul Sharma"
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Email Address *
              </label>
              <Input
                type="email"
                placeholder="owner@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Phone Number (10 Digits) *
              </label>
              <Input
                type="tel"
                placeholder="9876543210"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                maxLength={10}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Password *
              </label>
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
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Confirm Password *
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
          </div>
        </section>

        {/* SECTION 2: Restaurant Information */}
        <section className="space-y-4 rounded-2xl bg-gray-50 p-5 border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">
            2. Restaurant Information
          </h2>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Restaurant Name *
              </label>
              <Input
                type="text"
                placeholder="e.g. Spice Junction"
                value={restaurantName}
                onChange={(e) => setRestaurantName(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Restaurant Type *
              </label>

              {!useCustomType ? (
                <div className="space-y-2">
                  <select
                    value={restaurantType}
                    onChange={(e) => setRestaurantType(e.target.value)}
                    className="w-full rounded-md border border-gray-300 bg-white p-2 text-sm shadow-sm focus:border-orange-500 focus:outline-none"
                  >
                    {RESTAURANT_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setUseCustomType(true)}
                    className="text-xs text-orange-600 hover:underline"
                  >
                    + Custom Restaurant Type
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <Input
                    type="text"
                    placeholder="Enter custom type"
                    value={customType}
                    onChange={(e) => setCustomType(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setUseCustomType(false)}
                    className="text-xs text-gray-500 hover:underline"
                  >
                    Select from predefined list
                  </button>
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Street Address *
            </label>
            <Input
              type="text"
              placeholder="e.g. Shop 12, Main Campus Gate Road"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                City *
              </label>
              <Input
                type="text"
                placeholder="e.g. Pune"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                PIN Code (6 Digits) *
              </label>
              <Input
                type="text"
                placeholder="411001"
                value={pincode}
                onChange={(e) => setPincode(e.target.value)}
                maxLength={6}
                required
              />
            </div>
          </div>
        </section>

        {error && <p className="text-sm font-medium text-red-600">{error}</p>}

        <Button
          type="submit"
          className="w-full bg-orange-600 hover:bg-orange-700 py-3 text-base font-semibold"
          disabled={loading}
        >
          {loading ? "Registering Account..." : "Register Restaurant Owner"}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-500">
        Already registered?{" "}
        <Link
          href={ROUTES.RESTAURANT_LOGIN}
          className="font-semibold text-orange-600 hover:underline"
        >
          Login to Restaurant Dashboard
        </Link>
      </p>
    </div>
  );
}

