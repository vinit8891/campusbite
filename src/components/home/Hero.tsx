"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { MapPin, ChevronDown, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/routes";
import { useLocation } from "@/context/LocationContext";

export default function Hero() {
  const { fullAddressLabel, openLocationModal } = useLocation();

  return (
    <section className="bg-gradient-to-br from-orange-50/80 via-white to-amber-50/30">
      {/* Mobile Location Top Bar (< md) */}
      <div className="md:hidden px-4 pt-3 pb-1">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-orange-100 text-orange-600 shrink-0">
              <MapPin className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1 text-[10px] font-semibold text-stone-500 uppercase tracking-wider">
                <span>Delivering to</span>
              </div>
              <button
                type="button"
                onClick={openLocationModal}
                className="flex items-center gap-1 text-xs font-bold text-stone-900 truncate hover:text-orange-600 transition-colors cursor-pointer active:scale-98"
                aria-label="Change delivery location"
              >
                <span className="truncate">{fullAddressLabel}</span>
                <ChevronDown className="h-3.5 w-3.5 text-stone-400 shrink-0" />
              </button>
            </div>
          </div>

          <div className="shrink-0 flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200/80 px-2.5 py-1 text-[11px] font-bold text-amber-800 shadow-2xs">
            <Zap className="h-3.5 w-3.5 text-amber-600 fill-amber-500" />
            <span>15-20 min</span>
          </div>
        </div>
      </div>

      {/* Mobile Hero Banner Card (< md) */}
      <div className="md:hidden mx-4 mt-2 mb-2">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-amber-50/90 via-orange-50/60 to-white border border-orange-200/70 p-5 sm:p-6 shadow-sm flex items-center justify-between gap-3">
          {/* Left Column (Text & CTAs) */}
          <div className="min-w-0 flex-1">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-orange-100/80 border border-orange-200 text-orange-800 text-[10px] sm:text-xs font-semibold">
              🍽️ Student Food Network
            </span>

            <h1 className="text-xl sm:text-2xl font-extrabold text-stone-900 tracking-tight leading-tight mt-2">
              Affordable Food{" "}
              <span className="text-orange-600 block">for Every Student</span>
            </h1>

            <p className="text-xs text-stone-600 line-clamp-2 mt-1 hidden sm:block">
              Order delicious meals from nearby restaurants &amp; mess at student-friendly prices.
            </p>

            <Link
              href={ROUTES.RESTAURANTS}
              className="mt-3 inline-flex items-center justify-center px-4 py-2 rounded-xl bg-orange-600 text-white text-xs font-bold shadow-sm shadow-orange-600/20 active:scale-95 transition-transform hover:bg-orange-700"
            >
              Order Now
            </Link>
          </div>

          {/* Right Column (Visual Graphic) */}
          <div className="relative flex-shrink-0 h-28 w-28 sm:h-36 sm:w-36 rounded-full bg-[#fcedd8] border border-orange-200/50 flex items-center justify-center p-2 shadow-inner">
            <Image
              src="/images/hero/burger.png"
              alt="CampusBite Burger"
              width={160}
              height={160}
              priority
              sizes="(max-width: 640px) 112px, 144px"
              className="h-full w-full object-contain drop-shadow-md"
            />
          </div>
        </div>
      </div>

      {/* Desktop Hero (md+) */}
      <div className="hidden md:flex mx-auto max-w-7xl flex-row items-center justify-between gap-12 px-6 py-16 lg:py-20">
        {/* Left */}
        <div className="max-w-xl">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-100 px-4 py-1.5 text-xs font-semibold text-orange-700">
            🍽️ Student Food Network
          </span>

          <h1 className="mt-5 text-4xl lg:text-5xl font-extrabold tracking-tight text-gray-900 leading-tight">
            Affordable Food
            <br />
            <span className="text-orange-600">for Every Student</span>
          </h1>

          <p className="mt-4 text-base text-gray-600 leading-relaxed">
            Order delicious meals from nearby restaurants, mess and home kitchens at student-friendly prices.
          </p>

          <div className="mt-6 flex flex-wrap gap-3.5">
            <Link href={ROUTES.RESTAURANTS}>
              <Button size="lg" className="bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-xl shadow-sm shadow-orange-600/20">
                Order Now
              </Button>
            </Link>

            <Link href="/#popular-restaurants">
              <Button
                variant="outline"
                size="lg"
                className="border-gray-200 hover:border-orange-200 hover:bg-orange-50/50 text-gray-700 rounded-xl"
              >
                Explore Menu
              </Button>
            </Link>
          </div>
        </div>

        {/* Right */}
        <div className="flex h-[360px] w-[360px] lg:h-[400px] lg:w-[400px] items-center justify-center rounded-full bg-gradient-to-tr from-orange-100 to-amber-100 shadow-xl border border-orange-200/40">
          <Image
            src="/images/hero/burger.png"
            alt="CampusBite Burger"
            width={400}
            height={400}
            priority
            sizes="(max-width: 768px) 100vw, 400px"
            className="h-full w-full object-contain p-6 hover:scale-105 transition-transform duration-300"
          />
        </div>
      </div>
    </section>
  );
}