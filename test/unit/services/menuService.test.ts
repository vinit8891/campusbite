import { describe, it, expect } from "vitest";
import {
  getRestaurantMenu,
  getMenuCategories,
  updateMenuItem,
  deleteMenuItem,
} from "@/services/menuService";

describe("menuService", () => {
  it("getRestaurantMenu fetches paginated menu items", async () => {
    const res = await getRestaurantMenu("diner@campus.edu");
    expect(res.items.length).toBe(1);
    expect(res.items[0].name).toBe("Paneer Butter Masala");
  });

  it("getMenuCategories extracts distinct sorted categories", async () => {
    const categories = await getMenuCategories("diner@campus.edu");
    expect(categories).toContain("Curry");
  });

  it("updateMenuItem sends PUT request for menu item", async () => {
    const res = await updateMenuItem("menu-1", { price: 200 });
    expect(res.message).toBe("Menu updated");
  });

  it("deleteMenuItem sends DELETE request for menu item", async () => {
    const res = await deleteMenuItem("menu-1");
    expect(res.message).toBe("Menu deleted");
  });
});
