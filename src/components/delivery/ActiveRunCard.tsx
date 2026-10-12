import { ActiveDeliveryManifest } from "./ActiveDeliveryManifest";
import type { DeliveryOrder } from "@/types";

export type ActiveRunCardProps = {
  order: DeliveryOrder;
  index?: number;
  onUpdateStatus?: (id: string, status: string) => void | Promise<void>;
  onConfirmPickup?: (id: string) => void | Promise<void>;
  onPickup?: (id: string) => void | Promise<void>;
  onOpenOtp?: (orderId: string) => void;
};

export function ActiveRunCard(props: ActiveRunCardProps) {
  return <ActiveDeliveryManifest {...props} />;
}

export { ActiveDeliveryManifest };
export default ActiveRunCard;
