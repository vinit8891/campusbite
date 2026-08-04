"use client";

import { Input } from "@/components/ui/input";
import { useCheckout } from "@/context/CheckoutContext";

export default function AddressForm() {
  const { checkout, setCheckout } = useCheckout();

  return (
    <section className="rounded-3xl border bg-white p-8 shadow-sm">
      <h2 className="mb-6 text-2xl font-bold">
        Delivery Address
      </h2>

      <div className="grid gap-5">
        {/* Full Name */}
        <div>
          <label className="mb-2 block font-medium">
            Full Name
          </label>

          <Input
            placeholder="Enter your full name"
            value={checkout.customer_name ?? ""}
            onChange={(e) =>
              setCheckout((prev) => ({
                ...prev,
                customer_name: e.target.value,
              }))
            }
          />
        </div>

        {/* Mobile */}
        <div>
          <label className="mb-2 block font-medium">
            Mobile Number
          </label>

          <Input
            type="tel"
            placeholder="9876543210"
            value={checkout.phone ?? ""}
            onChange={(e) =>
              setCheckout((prev) => ({
                ...prev,
                phone: e.target.value,
              }))
            }
          />
        </div>

        {/* Address */}
        <div>
          <label className="mb-2 block font-medium">
            Address
          </label>

          <Input
            placeholder="Flat, Building, Street"
            value={checkout.address ?? ""}
            onChange={(e) =>
              setCheckout((prev) => ({
                ...prev,
                address: e.target.value,
              }))
            }
          />
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          {/* City */}
          <div>
            <label className="mb-2 block font-medium">
              City
            </label>

            <Input
              placeholder="Pune"
              value={checkout.city ?? ""}
              onChange={(e) =>
                setCheckout((prev) => ({
                  ...prev,
                  city: e.target.value,
                }))
              }
            />
          </div>

          {/* Pincode */}
          <div>
            <label className="mb-2 block font-medium">
              PIN Code
            </label>

            <Input
              placeholder="411041"
              value={checkout.pincode ?? ""}
              onChange={(e) =>
                setCheckout((prev) => ({
                  ...prev,
                  pincode: e.target.value,
                }))
              }
            />
          </div>
        </div>

        {/* Landmark */}
        <div>
          <label className="mb-2 block font-medium">
            Landmark
          </label>

          <Input
            placeholder="Near Zeal College"
            value={checkout.landmark ?? ""}
            onChange={(e) =>
              setCheckout((prev) => ({
                ...prev,
                landmark: e.target.value,
              }))
            }
          />
        </div>
      </div>
    </section>
  );
}