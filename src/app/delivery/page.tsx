import { redirect } from "next/navigation";

export default function DeliveryRedirectPage() {
  redirect("/delivery/dashboard");
}