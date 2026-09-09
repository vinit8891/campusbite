import type { Order } from "@/types/orders";

// Global in-memory order store across Next.js API route invocations
const globalForOrders = globalThis as unknown as {
  _cbInMemoryOrders?: Map<string, Order>;
};

export const inMemoryOrders: Map<string, Order> =
  globalForOrders._cbInMemoryOrders ?? new Map<string, Order>();

if (process.env.NODE_ENV !== "production") {
  globalForOrders._cbInMemoryOrders = inMemoryOrders;
}

export function saveInMemoryOrder(order: Order): void {
  const id = order._id || order.id;
  if (id) {
    inMemoryOrders.set(String(id), order);
    if (order._id) inMemoryOrders.set(String(order._id), order);
    if (order.id) inMemoryOrders.set(String(order.id), order);
  }
}

export function getInMemoryOrder(orderId: string): Order | undefined {
  if (!orderId) return undefined;

  // 1. Direct key match
  if (inMemoryOrders.has(orderId)) {
    return inMemoryOrders.get(orderId);
  }

  // 2. Iterate for matching IDs, partial suffix match, or _id
  for (const [id, order] of inMemoryOrders.entries()) {
    if (
      id === orderId ||
      id.endsWith(orderId) ||
      order._id === orderId ||
      order.id === orderId ||
      order._id?.slice(-8) === orderId
    ) {
      return order;
    }
  }

  // 3. 'latest' or 'last' keyword support
  if (orderId === "latest" || orderId === "last") {
    const all = Array.from(inMemoryOrders.values());
    return all.length > 0 ? all[all.length - 1] : undefined;
  }

  return undefined;
}

export function getAllInMemoryOrders(): Order[] {
  // Deduplicate by _id
  const seen = new Set<string>();
  const list: Order[] = [];
  for (const order of Array.from(inMemoryOrders.values()).reverse()) {
    const key = order._id || order.id;
    if (key && !seen.has(key)) {
      seen.add(key);
      list.push(order);
    }
  }
  return list;
}
