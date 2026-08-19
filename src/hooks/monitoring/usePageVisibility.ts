"use client";

import { useEffect, useState } from "react";
import { isClientSide } from "@/lib/browserCapabilities";

/**
 * Reusable hook to track whether the active browser tab/page is visible.
 * Useful for pausing active polling or animations when in background.
 */
export function usePageVisibility(): boolean {
  const [isVisible, setIsVisible] = useState<boolean>(() => {
    if (!isClientSide()) return true;
    return document.visibilityState === "visible";
  });

  useEffect(() => {
    if (!isClientSide()) return;

    const handleVisibilityChange = () => {
      setIsVisible(document.visibilityState === "visible");
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  return isVisible;
}
