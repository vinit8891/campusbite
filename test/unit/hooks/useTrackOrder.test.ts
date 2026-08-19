import { describe, it, expect } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useTrackOrder } from "@/hooks/orders/useTrackOrder";

describe("useTrackOrder hook", () => {
  it("initializes in loading state and fetches tracking location and OTP", async () => {
    const { result } = renderHook(() => useTrackOrder());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.location).toBeDefined();
    expect(result.current.location?.restaurant_name).toBe("Campus Diner");
    expect(result.current.restaurantName).toBe("Campus Diner");
    expect(result.current.partnerName).toBe("Ramesh Partner");
    expect(result.current.orderOtp?.otp).toBe(4567);
    expect(result.current.showOtp).toBe(4567);
    expect(result.current.partnerHasLocation).toBe(true);
  });
});
