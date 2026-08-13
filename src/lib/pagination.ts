export type Paginated<T> = {
  items: T[];
  page: number;
  limit: number;
  total: number;
  pages: number;
};

export function paginatedItems<T>(data: unknown): T[] {
  return asPaginated<T>(data).items;
}

export function asPaginated<T>(data: unknown): Paginated<T> {
  if (Array.isArray(data)) {
    return {
      items: data as T[],
      page: 1,
      limit: data.length || 20,
      total: data.length,
      pages: 1,
    };
  }

  const obj = (data || {}) as Partial<Paginated<T>>;
  const items = Array.isArray(obj.items) ? obj.items : [];
  const page = Number(obj.page) || 1;
  const limit = Number(obj.limit) || 20;
  const total = Number(obj.total) || items.length;
  const pages = Number(obj.pages) || Math.max(1, Math.ceil(total / limit) || 1);

  return { items, page, limit, total, pages };
}
