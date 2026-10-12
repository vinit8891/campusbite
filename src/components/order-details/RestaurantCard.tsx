import React from "react";
import type { Order } from "@/types/orders";

export interface RestaurantCardProps {
  order?: Partial<Order> | null;
  className?: string;
}

export function RestaurantCard({ order, className = "" }: RestaurantCardProps) {
  const restaurant = order?.restaurant_info || order?.restaurant || {};
  const restName = restaurant?.name || order?.restaurant_name || "Campus Canteen";
  const restAddress =
    restaurant?.address ||
    (restaurant as { stall_location?: string })?.stall_location ||
    "Zeal College Campus, Narhe";
  const restLat = restaurant?.latitude || 18.4485;
  const restLng = restaurant?.longitude || 73.8242;

  return (
    <div className={`rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-sm ${className}`}>
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-xl">
            🍽️
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Restaurant</span>
            <h3 className="text-base font-bold text-zinc-900">{restName}</h3>
            <p className="text-xs text-zinc-500 mt-0.5">{restAddress}</p>
          </div>
        </div>
      </div>

      {/* Immediate Map Pin Action */}
      <div className="mt-3 pt-3 border-t border-zinc-100 flex items-center justify-between">
        <a
          href={`https://www.google.com/maps/search/?api=1&query=${restLat},${restLng}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-orange-600 hover:text-orange-700 transition-colors"
        >
          <span>📍 Open Location in Maps</span>
          <span className="text-[11px]">↗</span>
        </a>
        {restaurant?.phone && (
          <a
            href={`tel:${restaurant.phone}`}
            className="text-xs text-zinc-600 hover:text-zinc-900 font-medium"
          >
            📞 Call Kitchen
          </a>
        )}
      </div>
    </div>
  );
}

export default RestaurantCard;
