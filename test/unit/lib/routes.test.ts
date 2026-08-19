import { describe, it, expect } from "vitest";
import {
  ROUTES,
  routes,
  orderDetailsPath,
  trackOrderPath,
  restaurantDetailsPath,
  adminEditRestaurantPath,
  menuEditPath,
} from "@/lib/routes";

describe("routes utilities", () => {
  it("contains all critical route paths", () => {
    expect(ROUTES.HOME).toBe("/");
    expect(ROUTES.LOGIN).toBe("/login");
    expect(ROUTES.CART).toBe("/cart");
    expect(ROUTES.CHECKOUT).toBe("/checkout");
    expect(ROUTES.MY_ORDERS).toBe("/my-orders");
    expect(ROUTES.RESTAURANT_DASHBOARD).toBe("/restaurant/dashboard");
    expect(ROUTES.DELIVERY_DASHBOARD).toBe("/delivery/dashboard");
    expect(ROUTES.ADMIN).toBe("/admin");
  });

  describe("dynamic route helpers", () => {
    it("encodes orderDetailsPath correctly", () => {
      expect(orderDetailsPath("order 123")).toBe("/orders/order%20123");
    });

    it("encodes trackOrderPath correctly", () => {
      expect(trackOrderPath("ord-456")).toBe("/track-order/ord-456");
    });

    it("encodes restaurantDetailsPath correctly", () => {
      expect(restaurantDetailsPath("campus-diner")).toBe("/restaurants/campus-diner");
    });

    it("encodes adminEditRestaurantPath correctly", () => {
      expect(adminEditRestaurantPath("rest-789")).toBe("/admin/edit-restaurant/rest-789");
    });

    it("encodes menuEditPath correctly", () => {
      expect(menuEditPath("item-101")).toBe("/restaurant/dashboard/menu/edit/item-101");
    });
  });

  describe("namespaced routes object", () => {
    it("mirrors static routes and dynamic builders accurately", () => {
      expect(routes.home).toBe("/");
      expect(routes.restaurant.dashboard).toBe("/restaurant/dashboard");
      expect(routes.delivery.myDeliveries).toBe("/delivery/dashboard/my-deliveries");
      expect(routes.admin.dashboard).toBe("/admin");
      expect(routes.restaurantDetails("pizza-hub")).toBe("/restaurants/pizza-hub");
    });
  });
});
