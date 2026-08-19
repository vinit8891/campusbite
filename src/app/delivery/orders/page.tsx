import { redirect } from "next/navigation";

export default function DeliveryOrdersRedirectPage() {
  redirect("/delivery/dashboard/orders");
}
