import { describe, it, expect } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useRestaurantMenu } from "@/hooks/restaurant/useRestaurantMenu";

describe("useRestaurantMenu hook", () => {
  it("loads menu items and categories for restaurant owner", async () => {
    const { result } = renderHook(() => useRestaurantMenu());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.menu.length).toBe(1);
    expect(result.current.menu[0].name).toBe("Paneer Butter Masala");
    expect(result.current.categories).toContain("Curry");
  });
});
