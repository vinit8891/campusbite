import Link from "next/link";
import { Bike, Package } from "lucide-react";
import { ROUTES } from "@/lib/routes";
import type { DeliveryDashboardOrder } from "@/types";

function RecentAssignedOrderCard({
  order,
}: {
  order: DeliveryDashboardOrder;
}) {
  return (
    <div className="rounded-2xl border bg-white p-6 shadow">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold">
            {order.restaurant_email || "Restaurant"}
          </h3>
          <p className="mt-1 text-gray-700">
            {order.customer_name || "Customer"}
          </p>
          <p className="text-gray-500">{order.phone || "—"}</p>
          <p className="mt-1 text-sm text-gray-500">
            {order.address || "Address not available"}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xl font-bold text-orange-600">
            ₹{order.total ?? 0}
          </p>
          <span className="mt-2 inline-block rounded bg-blue-100 px-3 py-1 text-sm font-medium text-blue-800">
            {order.status || "Assigned"}
          </span>
        </div>
      </div>

      {Array.isArray(order.items) && order.items.length > 0 ? (
        <>
          <hr className="my-4" />
          <div className="space-y-2 text-sm text-gray-600">
            {order.items.slice(0, 3).map((item, index) => (
              <div
                key={item.id || `${item.name}-${index}`}
                className="flex justify-between gap-3"
              >
                <span>
                  {item.name || "Item"} × {item.quantity || 1}
                </span>
                <span>₹{(item.price || 0) * (item.quantity || 1)}</span>
              </div>
            ))}
            {order.items.length > 3 ? (
              <p className="text-xs text-gray-400">
                +{order.items.length - 3} more items
              </p>
            ) : null}
          </div>
        </>
      ) : null}
    </div>
  );
}

type RecentAssignedOrdersSectionProps = {
  recent: DeliveryDashboardOrder[];
};

export function RecentAssignedOrdersSection({
  recent,
}: RecentAssignedOrdersSectionProps) {
  return (
    <section className="rounded-3xl bg-white p-8 shadow">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold">Recent Assigned Orders</h2>
          <p className="mt-1 text-sm text-gray-500">
            Latest orders waiting for pickup
          </p>
        </div>
        <Link
          href={ROUTES.DELIVERY_ORDERS}
          className="text-sm font-medium text-orange-600 hover:underline"
        >
          View my orders
        </Link>
      </div>

      {recent.length === 0 ? (
        <div className="rounded-2xl border border-dashed bg-orange-50/60 px-6 py-14 text-center">
          <Package className="mx-auto mb-4 h-12 w-12 text-orange-500" />
          <h3 className="text-xl font-semibold text-gray-800">
            No assigned orders right now
          </h3>
          <p className="mt-2 text-gray-500">
            When you accept a delivery, it will show up here.
          </p>
          <Link
            href={ROUTES.DELIVERY_AVAILABLE}
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700"
          >
            <Bike className="h-4 w-4" />
            Browse available orders
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {recent.map((order) => (
            <RecentAssignedOrderCard key={order._id} order={order} />
          ))}
        </div>
      )}
    </section>
  );
}
