"use client";

import React from "react";
import { MessageCircle } from "lucide-react";
import { usePathname } from "next/navigation";

export function FloatingWhatsAppButton() {
  const pathname = usePathname();

  // Hide on checkout for distraction-free checkout flow
  if (pathname === "/checkout" || pathname?.startsWith("/checkout/")) {
    return null;
  }

  const whatsappUrl = "https://wa.me/919024197988?text=" + encodeURIComponent("Hello CampusBite Support, I need assistance with an order.");

  return (
    <aside aria-label="Support & Help" className="fixed bottom-6 right-6 z-40 flex items-center">
      <a
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Chat on WhatsApp"
        className="group flex items-center gap-2 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-3 shadow-lg hover:shadow-xl active:scale-95 transition-all duration-200 border border-emerald-500/40"
      >
        <MessageCircle className="h-5 w-5 text-white animate-pulse" />
        <span className="text-xs font-bold tracking-wide">
          Chat on WhatsApp
        </span>
      </a>
    </aside>
  );
}

export default FloatingWhatsAppButton;
