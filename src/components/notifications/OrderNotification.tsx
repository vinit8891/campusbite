"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";

type Props = {
  status: string;
};

export default function OrderNotification({
  status,
}: Props) {
  const previousStatus = useRef("");

  useEffect(() => {
    // Ignore first render
    if (previousStatus.current === "") {
      previousStatus.current = status;
      return;
    }

    // Ignore duplicate status
    if (previousStatus.current === status) {
      return;
    }

    // Play notification sound
    try {
      const audio = new Audio(
        "https://actions.google.com/sounds/v1/cartoon/pop.ogg"
      );

      audio.volume = 0.4;
      audio.play().catch(() => {});
    } catch {}

    switch (status) {
      case "Accepted":
        toast.success("🎉 Order Accepted", {
          description:
            "The restaurant has accepted your order and will start preparing it shortly.",
          duration: 5000,
        });
        break;

      case "Preparing":
        toast("🍳 Preparing Your Food", {
          description:
            "The chef is preparing your delicious meal.",
          duration: 5000,
        });
        break;

      case "Ready for Pickup":
        toast("📦 Ready for Pickup", {
          description:
            "Your food is packed and waiting for a delivery partner.",
          duration: 5000,
        });
        break;

      case "Out for Delivery":
        toast("🛵 Out for Delivery", {
          description:
            "Your delivery partner has picked up your order and is on the way.",
          duration: 5000,
        });
        break;

      case "Delivered":
        toast.success("✅ Order Delivered", {
          description:
            "Enjoy your meal ❤️ Thank you for choosing CampusBite!",
          duration: 5000,
        });
        break;

      case "Rejected":
        toast.error("❌ Order Rejected", {
          description:
            "Unfortunately, the restaurant couldn't accept your order.",
          duration: 5000,
        });
        break;

      default:
        break;
    }

    previousStatus.current = status;
  }, [status]);

  return null;
}