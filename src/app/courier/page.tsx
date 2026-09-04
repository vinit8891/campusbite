import { redirect } from "next/navigation";
import { ROUTES } from "@/lib/routes";

export default function CourierRootRedirectPage() {
  redirect(ROUTES.DELIVERY_DASHBOARD);
}
