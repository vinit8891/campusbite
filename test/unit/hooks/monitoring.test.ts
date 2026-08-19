import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import {
  useOnlineStatus,
  usePageVisibility,
  useNetworkInformation,
} from "@/hooks/monitoring";

describe("Monitoring Hooks", () => {
  it("useOnlineStatus responds to online and offline window events", () => {
    const { result } = renderHook(() => useOnlineStatus());
    expect(result.current).toBe(true);

    act(() => {
      window.dispatchEvent(new Event("offline"));
    });
    expect(result.current).toBe(false);

    act(() => {
      window.dispatchEvent(new Event("online"));
    });
    expect(result.current).toBe(true);
  });

  it("usePageVisibility returns document visibility state", () => {
    const { result } = renderHook(() => usePageVisibility());
    expect(typeof result.current).toBe("boolean");
  });

  it("useNetworkInformation returns empty object or network metadata safely", () => {
    const { result } = renderHook(() => useNetworkInformation());
    expect(result.current).toBeTypeOf("object");
  });
});
