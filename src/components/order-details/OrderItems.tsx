import React from "react";
import Image from "next/image";
import type { OrderItem } from "@/types/orders";

export type OrderItemsProps = {
  items: OrderItem[];
};

export function OrderItems({ items }: OrderItemsProps) {
  return (
    <section className="mt-8 rounded-3xl border border-gray-100 bg-white p-6 shadow-sm sm:p-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">
            Ordered Items
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            {items.length} {items.length === 1 ? "item" : "items"}
          </p>
        </div>
      </div>

      <div className="mt-6 divide-y divide-gray-100">
        {items.map((item) => (
          <div
            key={item.id}
            className="flex items-center gap-4 py-5 first:pt-0 last:pb-0"
          >
            {/* Food Image */}
            {item.image ? (
              <Image
                src={item.image}
                alt={item.name}
                width={72}
                height={72}
                className="h-[72px] w-[72px] shrink-0 rounded-2xl object-cover"
                unoptimized={item.image.startsWith("http")}
              />
            ) : (
              <div className="flex h-[72px] w-[72px] shrink-0 items-center justify-center rounded-2xl bg-orange-50 text-3xl">
                🍽️
              </div>
            )}

            <div className="min-w-0 flex-1">
              <p className="font-bold text-gray-900">{item.name}</p>

              <p className="mt-1 text-sm font-medium text-gray-500">
                {item.quantity} × ₹{item.price}
              </p>
            </div>

            <p className="text-lg font-extrabold text-gray-900">
              ₹{item.price * item.quantity}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
