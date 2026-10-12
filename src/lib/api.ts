import { API_URL } from "@/services/apiConfig";
import { getTokenForRole } from "@/lib/authTokens";

export interface ApiResponse<T = any> {
  data: T;
  status: number;
  statusText: string;
}

export const api = {
  async post<T = any>(
    path: string,
    body?: any,
    config?: RequestInit
  ): Promise<ApiResponse<T>> {
    const token =
      getTokenForRole("customer") ||
      (typeof window !== "undefined" ? localStorage.getItem("token") : null);

    const normalized = path.startsWith("/") ? path : `/${path}`;
    const url = path.startsWith("http") ? path : `${API_URL}${normalized}`;

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...((config?.headers as Record<string, string>) || {}),
    };

    if (token && !headers["Authorization"]) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const res = await fetch(url, {
      method: "POST",
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      ...config,
    });

    const data = await res.json().catch(() => null);

    if (!res.ok) {
      const errorMsg =
        data?.detail || data?.message || `HTTP ${res.status}: ${res.statusText}`;
      const err = new Error(
        typeof errorMsg === "string" ? errorMsg : JSON.stringify(errorMsg)
      );
      (err as any).response = {
        data,
        status: res.status,
        statusText: res.statusText,
      };
      throw err;
    }

    return {
      data,
      status: res.status,
      statusText: res.statusText,
    };
  },

  async get<T = any>(
    path: string,
    config?: RequestInit
  ): Promise<ApiResponse<T>> {
    const token =
      getTokenForRole("customer") ||
      (typeof window !== "undefined" ? localStorage.getItem("token") : null);

    const normalized = path.startsWith("/") ? path : `/${path}`;
    const url = path.startsWith("http") ? path : `${API_URL}${normalized}`;

    const headers: Record<string, string> = {
      ...((config?.headers as Record<string, string>) || {}),
    };

    if (token && !headers["Authorization"]) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const res = await fetch(url, {
      method: "GET",
      headers,
      ...config,
    });

    const data = await res.json().catch(() => null);

    if (!res.ok) {
      const errorMsg =
        data?.detail || data?.message || `HTTP ${res.status}: ${res.statusText}`;
      const err = new Error(
        typeof errorMsg === "string" ? errorMsg : JSON.stringify(errorMsg)
      );
      (err as any).response = {
        data,
        status: res.status,
        statusText: res.statusText,
      };
      throw err;
    }

    return {
      data,
      status: res.status,
      statusText: res.statusText,
    };
  },
};

export default api;
