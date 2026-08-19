/**
 * Shared menu item domain utilities and normalization helpers.
 */

export type BestsellerSource = {
  bestseller?: boolean;
  is_bestseller?: boolean;
  best_seller?: boolean;
};


/** Checks if a menu item has any bestseller property set to truthy. */
export function isBestseller(item?: BestsellerSource | null): boolean {
  if (!item) return false;
  return Boolean(
    item.bestseller ||
      item.is_bestseller ||
      item.best_seller
  );
}

/** Parses and normalizes item price to a valid finite number >= 0. */
export function sanitizePrice(price: unknown, fallback = 0): number {
  if (typeof price === "number" && Number.isFinite(price) && price >= 0) {
    return price;
  }
  if (typeof price === "string") {
    const num = Number(price.replace(/[^0-9.]/g, ""));
    if (Number.isFinite(num) && num >= 0) {
      return num;
    }
  }
  return fallback;
}
