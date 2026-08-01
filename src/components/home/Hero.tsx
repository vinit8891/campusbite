import Image from "next/image";
import { Button } from "@/components/ui/button";

export default function Hero() {
  return (
    <section className="bg-gradient-to-br from-orange-50 via-white to-red-50">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-12 px-6 py-24 lg:flex-row">

        {/* Left */}

        <div className="max-w-xl">

          <span className="rounded-full bg-orange-100 px-4 py-2 text-sm font-semibold text-orange-600">
            🍽 Student Food Network
          </span>

          <h1 className="mt-6 text-5xl font-bold leading-tight">
            Affordable Food
            <br />
            for Every Student
          </h1>

          <p className="mt-6 text-lg text-gray-600">
            Order delicious meals from nearby restaurants,
            mess and home kitchens at student-friendly prices.
          </p>

          <div className="mt-8 flex gap-4">

            <Button size="lg">
              Order Now
            </Button>

            <Button
              variant="outline"
              size="lg"
            >
              Explore Menu
            </Button>

          </div>

        </div>

        {/* Right */}

        <div className="flex h-[420px] w-[420px] items-center justify-center rounded-full bg-orange-100 shadow-2xl">

        <Image
  src="/images/hero/burger.png"
  alt="CampusBite Burger"
  width={500}
  height={500}
  className="object-contain w-full h-full p-6"
/>

</div>

      </div>
    </section>
  );
}