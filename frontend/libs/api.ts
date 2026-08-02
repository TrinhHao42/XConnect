// Centralized API helper — injects token automatically from auth store
// Configured with absolute URL to support Capacitor mobile app static export
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

function getToken(): string | null {
  try {
    const { useAuthStore } = require("../store/auth.store");
    return useAuthStore.getState().token;
  } catch {
    return null;
  }
}

export async function refreshSession(): Promise<string> {
  const refreshRes = await fetch(`${API_URL}/auth/refresh`, { method: "POST", credentials: "include" });
  if (!refreshRes.ok) {
    throw new Error("Session expired");
  }
  const { accessToken } = await refreshRes.json();
  return accessToken;
}

async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  let token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  let res = await fetch(`${API_URL}${path}`, { ...options, headers, credentials: "include" });

  // Handle 401 Unauthorized - attempt to refresh token
  if (res.status === 401 && !path.includes("/auth/login") && !path.includes("/auth/register") && !path.includes("/auth/supabase-login")) {
    try {
      const accessToken = await refreshSession();
      const { useAuthStore } = require("../store/auth.store");
      useAuthStore.getState().updateToken(accessToken);
      
      // Retry original request with new token
      headers["Authorization"] = `Bearer ${accessToken}`;
      res = await fetch(`${API_URL}${path}`, { ...options, headers, credentials: "include" });
    } catch (e) {
      console.error("Token refresh failed:", e);
      if (typeof window !== "undefined") {
        const { useAuthStore } = require("../store/auth.store");
        useAuthStore.getState().logout();
        if (window.location.pathname !== "/login") {
          window.location.pathname = "/login";
        }
      }
    }
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message || "API Error");
  }

  return res.json();
}

export const api = {
  get: <T>(path: string) => apiFetch<T>(path),
  post: <T>(path: string, body: unknown) =>
    apiFetch<T>(path, { method: "POST", body: JSON.stringify(body) }),
  put: <T>(path: string, body: unknown) =>
    apiFetch<T>(path, { method: "PUT", body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) =>
    apiFetch<T>(path, { method: "PATCH", body: JSON.stringify(body) }),
  delete: <T>(path: string) => apiFetch<T>(path, { method: "DELETE" }),
};
