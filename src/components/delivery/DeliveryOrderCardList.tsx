import { ActiveDeliveryManifest } from "./ActiveDeliveryManifest";
import type { DeliveryOrder } from "@/types";

type DeliveryOrderCardListProps = {
  orders: DeliveryOrder[];
  onUpdateStatus: (id: string, status: string) => void;
  onOpenOtp: (orderId: string) => void;
};

export function DeliveryOrderCardList({
  orders,
  onUpdateStatus,
  onOpenOtp,
}: DeliveryOrderCardListProps) {
  return (
    <div className="space-y-6">
      {orders.map((order) => (
        <ActiveDeliveryManifest
          key={order._id}
          order={order}
          onUpdateStatus={onUpdateStatus}
          onOpenOtp={onOpenOtp}
        />
      ))}
    </div>
  );
}
