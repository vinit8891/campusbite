"use client";

import { Input } from "@/components/ui/input";

export default function AddressForm() {
  return (
    <section className="rounded-3xl border bg-white p-8 shadow-sm">

      <h2 className="mb-6 text-2xl font-bold">
        Delivery Address
      </h2>

      <div className="grid gap-5">

        <div>
          <label className="mb-2 block font-medium">
            Full Name
          </label>

          <Input
            placeholder="Enter your full name"
          />
        </div>

        <div>
          <label className="mb-2 block font-medium">
            Mobile Number
          </label>

          <Input
            placeholder="9876543210"
          />
        </div>

        <div>
          <label className="mb-2 block font-medium">
            Address
          </label>

          <Input
            placeholder="Flat, Building, Street"
          />
        </div>

        <div className="grid gap-5 md:grid-cols-2">

          <div>
            <label className="mb-2 block font-medium">
              City
            </label>

            <Input
              placeholder="Pune"
            />
          </div>

          <div>
            <label className="mb-2 block font-medium">
              PIN Code
            </label>

            <Input
              placeholder="411041"
            />
          </div>

        </div>

        <div>
          <label className="mb-2 block font-medium">
            Landmark
          </label>

          <Input
            placeholder="Near Zeal College"
          />
        </div>

      </div>

    </section>
  );
}