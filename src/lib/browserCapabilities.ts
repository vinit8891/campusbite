/**
 * Runtime Browser Capabilities & Environment Health Diagnostics.
 * Provides safe detection of web APIs, storage, and networking.
 */

export type BrowserCapabilities = {
  isClient: boolean;
  online: boolean;
  localStorage: boolean;
  sessionStorage: boolean;
  geolocation: boolean;
  serviceWorker: boolean;
  notifications: boolean;
  webShare: boolean;
};

export function isClientSide(): boolean {
  return typeof window !== "undefined" && typeof document !== "undefined";
}

export function isOnline(): boolean {
  if (!isClientSide()) return true;
  return typeof navigator.onLine === "boolean" ? navigator.onLine : true;
}

export function isLocalStorageAvailable(): boolean {
  if (!isClientSide()) return false;
  try {
    const testKey = "__campusbite_storage_test__";
    window.localStorage.setItem(testKey, "1");
    window.localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

export function isSessionStorageAvailable(): boolean {
  if (!isClientSide()) return false;
  try {
    const testKey = "__campusbite_session_test__";
    window.sessionStorage.setItem(testKey, "1");
    window.sessionStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

export function isGeolocationAvailable(): boolean {
  if (!isClientSide()) return false;
  return typeof navigator !== "undefined" && "geolocation" in navigator;
}

export function isServiceWorkerSupported(): boolean {
  if (!isClientSide()) return false;
  return "serviceWorker" in navigator;
}

export function isNotificationsSupported(): boolean {
  if (!isClientSide()) return false;
  return "Notification" in window;
}

export function isWebShareSupported(): boolean {
  if (!isClientSide()) return false;
  return typeof navigator !== "undefined" && typeof navigator.share === "function";
}

/**
 * Returns a comprehensive snapshot of active browser capabilities.
 */
export function checkBrowserCapabilities(): BrowserCapabilities {
  return {
    isClient: isClientSide(),
    online: isOnline(),
    localStorage: isLocalStorageAvailable(),
    sessionStorage: isSessionStorageAvailable(),
    geolocation: isGeolocationAvailable(),
    serviceWorker: isServiceWorkerSupported(),
    notifications: isNotificationsSupported(),
    webShare: isWebShareSupported(),
  };
}
