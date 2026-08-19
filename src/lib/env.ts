/**
 * Environment configuration and runtime validation for CampusBite.
 */

export type AppEnvironment = "development" | "test" | "production";

export type EnvConfig = {
  NODE_ENV: AppEnvironment;
  NEXT_PUBLIC_API_URL: string;
  NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?: string;
  RAZORPAY_KEY_ID?: string;
  RAZORPAY_KEY_SECRET?: string;
};

const DEFAULT_DEV_API_URL = "http://127.0.0.1:8000";

/**
 * Validates that an API URL is a well-formed HTTP/HTTPS URL.
 */
export function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Gets the current Node environment safely.
 */
export function getNodeEnv(): AppEnvironment {
  const env = process.env.NODE_ENV;
  if (env === "production" || env === "test") {
    return env;
  }
  return "development";
}

/**
 * Gets the resolved backend API base URL with fallback.
 */
export function getApiBaseUrl(): string {
  const envUrl = process.env.NEXT_PUBLIC_API_URL;
  if (envUrl && isValidUrl(envUrl)) {
    return envUrl.replace(/\/+$/, "");
  }
  return DEFAULT_DEV_API_URL;
}

/**
 * Gets the Google Maps API key if configured.
 */
export function getGoogleMapsApiKey(): string | undefined {
  return process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
}

/**
 * Validates runtime environment configuration and returns structured status.
 */
export function validateEnv(): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];
  const env = getNodeEnv();

  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!apiUrl) {
    if (env === "production") {
      errors.push("Missing NEXT_PUBLIC_API_URL in production environment.");
    } else {
      warnings.push(`NEXT_PUBLIC_API_URL not set; using default '${DEFAULT_DEV_API_URL}'.`);
    }
  } else if (!isValidUrl(apiUrl)) {
    errors.push(`Invalid NEXT_PUBLIC_API_URL: '${apiUrl}'. Must be a valid http(s) URL.`);
  }

  const mapsKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!mapsKey) {
    warnings.push("NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is not set. Live tracking maps will be unavailable.");
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

export const env: EnvConfig = {
  NODE_ENV: getNodeEnv(),
  NEXT_PUBLIC_API_URL: getApiBaseUrl(),
  NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: getGoogleMapsApiKey(),
  RAZORPAY_KEY_ID: process.env.RAZORPAY_KEY_ID,
  RAZORPAY_KEY_SECRET: process.env.RAZORPAY_KEY_SECRET,
};
