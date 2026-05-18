// Centralized API helper — injects token automatically from auth store
// All requests go through Next.js rewrites (/api/*) to avoid CORS
const API_URL = "/api";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  // Read from cookie — set synchronously on login
  const raw = document.cookie.split('; ').find((r) => r.startsWith('accessToken='));
  if (raw) return decodeURIComponent(raw.split('=').slice(1).join('='));
  return null;
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

  let res = await fetch(`${API_URL}${path}`, { ...options, headers });

  // Handle 401 Unauthorized - attempt to refresh token
  if (res.status === 401 && !path.includes("/auth/login") && !path.includes("/auth/register")) {
    try {
      // Try to call refresh endpoint (uses httpOnly refreshToken cookie)
      const refreshRes = await fetch(`${API_URL}/auth/refresh`, { method: "POST" });
      
      if (refreshRes.ok) {
        const { accessToken } = await refreshRes.json();
        const { useAuthStore } = require("../store/auth.store");
        useAuthStore.getState().updateToken(accessToken);
        
        // Retry original request with new token
        headers["Authorization"] = `Bearer ${accessToken}`;
        res = await fetch(`${API_URL}${path}`, { ...options, headers });
      } else {
        // Refresh failed, user must log in again
        if (typeof window !== "undefined") {
          const { useAuthStore } = require("../store/auth.store");
          useAuthStore.getState().logout();
          window.location.href = "/login";
        }
      }
    } catch (e) {
      console.error("Token refresh failed:", e);
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
