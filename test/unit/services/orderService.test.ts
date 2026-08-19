import { describe, it, expect } from "vitest";
import {
  placeOrder,
  getMyOrders,
  getCustomerOrders,
  getOrderById,
  getDeliveryLocation,
} from "@/services/orderService";

describe("orderService", () => {
  it("placeOrder sends order payload and returns created order", async () => {
    const order = await placeOrder({
      customer_name: "John Doe",
      restaurant_email: "diner@campus.edu",
      phone: "9876543210",
      address: "Hostel 4",
      payment_method: "cod",
      items: [{ id: "1", name: "Paneer Masala", price: 250, quantity: 1 }],
      total: 250,
    });
    expect(order._id).toBe("order-1");
    expect(order.status).toBe("Pending");
  });

  it("getMyOrders fetches list of customer orders", async () => {
    const orders = await getMyOrders();
    expect(Array.isArray(orders)).toBe(true);
    expect(orders.length).toBeGreaterThan(0);
    expect(orders[0].customer_name).toBe("John Doe");
  });

  it("getCustomerOrders fetches list by phone", async () => {
    const orders = await getCustomerOrders("9876543210");
    expect(Array.isArray(orders)).toBe(true);
    expect(orders.length).toBeGreaterThan(0);
  });

  it("getOrderById fetches single order details", async () => {
    const order = await getOrderById("order-1");
    expect(order._id).toBe("order-1");
    expect(order.total).toBe(250);
  });

  it("getDeliveryLocation fetches active delivery tracking coordinates", async () => {
    const tracking = await getDeliveryLocation("order-1");
    expect(tracking.status).toBe("Out for Delivery");
    expect(tracking.restaurant_name).toBe("Campus Diner");
    expect(tracking.delivery_partner_name).toBe("Ramesh Partner");
  });
});
