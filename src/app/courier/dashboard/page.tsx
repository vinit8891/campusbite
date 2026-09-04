import { redirect } from "next/navigation";
import { ROUTES } from "@/lib/routes";

export default function CourierDashboardRedirectPage() {
  redirect(ROUTES.DELIVERY_DASHBOARD);
}
