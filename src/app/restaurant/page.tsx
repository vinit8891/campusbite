import { redirect } from "next/navigation";
import { ROUTES } from "@/lib/routes";

export default function RestaurantIndexPage() {
  redirect(ROUTES.RESTAURANT_LOGIN);
}
