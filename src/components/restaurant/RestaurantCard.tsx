"use client";

import Image from "next/image";
import Link from "next/link";
import React, { useState } from "react";
import { Clock3, MapPin, Star } from "lucide-react";

import { Button } from "@/components/ui/button";
import { restaurantDetailsPath } from "@/lib/routes";
import type { BackendRestaurant } from "@/services/restaurantService";

const DEFAULT_IMAGE = "/images/restaurants/default.jpg";

export type RestaurantCardProps = {
  restaurant: BackendRestaurant;
  distanceLabel?: string;
};

export function RestaurantCard({ restaurant, distanceLabel }: RestaurantCardProps) {
  const [imgSrc, setImgSrc] = useState<string>(
    restaurant.image || DEFAULT_IMAGE
  );

  const targetSlug = restaurant.slug || restaurant._id || "";
  const computedDistance = distanceLabel || restaurant.distance || "Nearby";

  return (
    <Link
      href={restaurantDetailsPath(targetSlug)}
      className="group block overflow-hidden rounded-3xl border bg-white shadow-md transition duration-300 hover:-translate-y-2 hover:shadow-2xl"
    >
      <div className="relative h-56 bg-gray-100">
        {/* Distance Badge */}
        {computedDistance && (
          <div className="absolute top-3 left-3 z-10 flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 text-xs font-semibold text-stone-800 shadow-sm backdrop-blur-sm">
            <span className="text-orange-500">📍</span>
            <span>{computedDistance}</span>
          </div>
        )}

        {imgSrc ? (
          <Image
            src={imgSrc}
            alt={restaurant.name}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className="object-cover"
            unoptimized={
              imgSrc.startsWith("http") || imgSrc.startsWith("data:")
            }
            onError={() => setImgSrc(DEFAULT_IMAGE)}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-5xl">
            🍽️
          </div>
        )}
      </div>

      <div className="space-y-4 p-6">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-xl font-bold">{restaurant.name}</h3>

          <div className="flex items-center gap-1 rounded-full bg-green-100 px-2 py-1 text-sm text-green-700">
            <Star className="h-4 w-4 fill-current" />
            {restaurant.rating ?? "—"}
          </div>
        </div>

        <p className="text-gray-500">
          {restaurant.cuisine || "Restaurant"}
        </p>

        <div className="flex items-center justify-between text-sm text-gray-500">
          <div className="flex items-center gap-1">
            <Clock3 className="h-4 w-4" />
            {restaurant.delivery_time || "25-35 min"}
          </div>

          <div className="flex items-center gap-1">
            <MapPin className="h-4 w-4 text-orange-500" />
            {computedDistance}
          </div>
        </div>

        <Button className="w-full group-hover:bg-orange-600">
          View Menu
        </Button>
      </div>
    </Link>
  );
}

export default RestaurantCard;
