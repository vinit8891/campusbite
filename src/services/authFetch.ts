import { API_URL } from "@/services/apiConfig";
import {
  AuthRole,
  clearAuthForRole,
  getLoginPath,
  getTokenForRole,
} from "@/lib/authTokens";

export class AuthHttpError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "AuthHttpError";
    this.status = status;
  }
}

type AuthFetchOptions = RequestInit & {
  role: AuthRole;
  /** When false, do not redirect on 401 (default true on client). */
  redirectOnAuthError?: boolean;
};

let redirectingForRole: AuthRole | null = null;

function buildUrl(path: string) {
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }

  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${API_URL}${normalized}`;
}

function extractErrorMessage(data: unknown, fallback: string) {
  if (!data || typeof data !== "object") return fallback;

  const detail = (data as { detail?: unknown }).detail;

  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail
      .map((item) =>
        typeof item === "object" && item && "msg" in item
          ? String((item as { msg: unknown }).msg)
          : String(item)
      )
      .join(", ");
  }

  return fallback;
}

async function parseBody(res: Response) {
  const text = await res.text();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function handleUnauthorized(role: AuthRole, redirectOnAuthError: boolean) {
  clearAuthForRole(role);

  if (
    redirectOnAuthError &&
    typeof window !== "undefined" &&
    redirectingForRole !== role
  ) {
    redirectingForRole = role;
    const loginPath = getLoginPath(role);
    window.location.assign(loginPath);
  }
}

/**
 * Authenticated API request. Attaches Bearer token for the given role.
 * Does not use this for public endpoints (browse/login/register).
 */
export async function authFetch(
  path: string,
  options: AuthFetchOptions
): Promise<Response> {
  const {
    role,
    redirectOnAuthError = true,
    headers,
    ...rest
  } = options;

  const token = getTokenForRole(role);

  if (!token) {
    handleUnauthorized(role, redirectOnAuthError);
    throw new AuthHttpError(401, "Not authenticated");
  }

  const mergedHeaders = new Headers(headers || {});

  if (!mergedHeaders.has("Authorization")) {
    mergedHeaders.set("Authorization", `Bearer ${token}`);
  }

  if (
    rest.body &&
    !(rest.body instanceof FormData) &&
    !mergedHeaders.has("Content-Type")
  ) {
    mergedHeaders.set("Content-Type", "application/json");
  }

  const res = await fetch(buildUrl(path), {
    ...rest,
    headers: mergedHeaders,
  });

  if (res.status === 401) {
    handleUnauthorized(role, redirectOnAuthError);
    const data = await parseBody(res);
    throw new AuthHttpError(
      401,
      extractErrorMessage(data, "Session expired. Please log in again.")
    );
  }

  if (res.status === 403) {
    const data = await parseBody(res);
    throw new AuthHttpError(
      403,
      extractErrorMessage(data, "You do not have permission for this action.")
    );
  }

  return res;
}

/** Public/unauthenticated API request (no Authorization header). */
export async function publicFetch(
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  const { headers, ...rest } = options;
  const mergedHeaders = new Headers(headers || {});

  if (
    rest.body &&
    !(rest.body instanceof FormData) &&
    !mergedHeaders.has("Content-Type")
  ) {
    mergedHeaders.set("Content-Type", "application/json");
  }

  return fetch(buildUrl(path), {
    ...rest,
    headers: mergedHeaders,
  });
}

export async function authJson<T = unknown>(
  path: string,
  options: AuthFetchOptions
): Promise<T> {
  const res = await authFetch(path, options);
  const data = await parseBody(res);

  if (!res.ok) {
    throw new AuthHttpError(
      res.status,
      extractErrorMessage(data, `Request failed (${res.status})`)
    );
  }

  return data as T;
}

export async function publicJson<T = unknown>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await publicFetch(path, options);
  const data = await parseBody(res);

  if (!res.ok) {
    throw new AuthHttpError(
      res.status,
      extractErrorMessage(data, `Request failed (${res.status})`)
    );
  }

  return data as T;
}

