"use client";

import { useEffect, useState } from "react";
import { isClientSide } from "@/lib/browserCapabilities";

export type NetworkInfo = {
  effectiveType?: "slow-2g" | "2g" | "3g" | "4g";
  saveData?: boolean;
  downlink?: number;
  rtt?: number;
};

type NetworkConnection = EventTarget & {
  effectiveType?: "slow-2g" | "2g" | "3g" | "4g";
  saveData?: boolean;
  downlink?: number;
  rtt?: number;
};

/**
 * Reusable hook providing Network Information API diagnostics when available.
 */
export function useNetworkInformation(): NetworkInfo {
  const [networkInfo, setNetworkInfo] = useState<NetworkInfo>({});

  useEffect(() => {
    if (!isClientSide()) return;

    const nav = navigator as unknown as {
      connection?: NetworkConnection;
      mozConnection?: NetworkConnection;
      webkitConnection?: NetworkConnection;
    };

    const connection =
      nav.connection || nav.mozConnection || nav.webkitConnection;

    if (!connection) return;

    const updateNetworkInfo = () => {
      setNetworkInfo({
        effectiveType: connection.effectiveType,
        saveData: connection.saveData,
        downlink: connection.downlink,
        rtt: connection.rtt,
      });
    };

    updateNetworkInfo();
    connection.addEventListener("change", updateNetworkInfo);

    return () => {
      connection.removeEventListener("change", updateNetworkInfo);
    };
  }, []);

  return networkInfo;
}
