import { formatDateTime } from "@/lib/formatters";

/**
 * Shared date formatting for admin tables (delegates to centralized formatDateTime).
 */
export function formatAdminDate(value?: string | null): string {
  return formatDateTime(value, "—");
}
