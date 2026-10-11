import { redirect } from "next/navigation";

export default function DeliveryAvailableRedirectPage() {
  redirect("/delivery/dashboard/available-orders");
}
