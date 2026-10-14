import { redirect } from "next/navigation";
import { ROUTES } from "@/lib/routes";

export default function CourierRunsRedirectPage() {
  redirect(ROUTES.DELIVERY_AVAILABLE || "/delivery/dashboard/available-orders");
}
