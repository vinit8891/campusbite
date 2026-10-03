import { describe, it, expect } from "vitest";
import { getRestaurants, getRestaurantById } from "@/services/restaurantService";

describe("restaurantService", () => {
  it("getRestaurants fetches restaurant array", async () => {
    const restaurants = await getRestaurants();
    expect(Array.isArray(restaurants)).toBe(true);
    expect(restaurants.length).toBe(1);
    expect(restaurants[0].name).toBe("Campus Diner");
  });

  it("getRestaurantById fetches single restaurant with menu", async () => {
    const restaurant = await getRestaurantById("rest-1");
    expect(restaurant).not.toBeNull();
    expect(restaurant?.name).toBe("Campus Diner");
    expect(restaurant?.menu?.length).toBe(1);
    expect(restaurant?.menu?.[0].name).toBe("Paneer Butter Masala");
  });

  describe("getRestaurantSettlements", () => {
    it("calculates gross food subtotal, 5% GST, commission deducted, and net payable accurately", async () => {
      const email = "taj@campusbite.in";
      // Simulate delivered orders in localStorage
      localStorage.setItem(
        "cb_orders",
        JSON.stringify([
          {
            _id: "ord-settle-1",
            restaurant_email: email,
            restaurant_name: "Taj Canteen",
            status: "Delivered",
            food_subtotal: 500,
            commission_amount: 40, // 8%
            total: 540,
            created_at: new Date().toISOString(),
          },
          {
            _id: "ord-settle-2",
            restaurant_email: email,
            restaurant_name: "Taj Canteen",
            status: "Delivered",
            food_subtotal: 300,
            commission_amount: 24, // 8%
            total: 325,
            created_at: new Date().toISOString(),
          },
        ])
      );

      const { getRestaurantSettlements } = await import("@/services/restaurantService");
      const res = await getRestaurantSettlements(email);

      // Gross = 500 + 300 = 800
      expect(res.today.gross_food_sales).toBe(800);
      // Commission = 40 + 24 = 64
      expect(res.today.commission_deducted).toBe(64);
      // GST = 5% of 800 = 40
      expect(res.today.gst_amount).toBe(40);
      // Net Payable = 800 + 40 - 64 = 776
      expect(res.today.net_payable_subtotal).toBe(776);
      expect(res.today.orders_count).toBe(2);
      expect(res.today.status).toBe("Pending");
    });

    it("returns settled status and UTR when admin settlement is present", async () => {
      const email = "punjabi.rasoi@campusbite.in";
      const todayStr = new Date().toISOString().split("T")[0];

      localStorage.setItem(
        "cb_canteen_settlements",
        JSON.stringify([
          {
            restaurant_email: email,
            restaurant_name: "Punjabi Rasoi",
            upi_id: "punjabi.rasoi@okaxis",
            orders_count: 5,
            gross_food_sales: 1200,
            commission_deducted: 96,
            net_payable_subtotal: 1164,
            status: "Settled",
            transaction_ref: "UPI/20261003/999111",
            settlement_date: todayStr,
          },
        ])
      );

      const { getRestaurantSettlements } = await import("@/services/restaurantService");
      const res = await getRestaurantSettlements(email);

      expect(res.today.status).toBe("Settled");
      expect(res.today.transaction_ref).toBe("UPI/20261003/999111");
      expect(res.today.net_payable_subtotal).toBe(1164);
    });
  });
});
