import { io, Socket } from "socket.io-client";
import { ClientToServerEvents, ServerToClientEvents } from "../types";

// Use environment variable – NestJS backend runs on 8080 by default
const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:8080";

const sockets: Record<string, Socket<ServerToClientEvents, ClientToServerEvents>> = {};

function fetchTokenFromCookie(): string | null {
  if (typeof window === "undefined") return null;
  const raw = document.cookie.split("; ").find((r) => r.startsWith("accessToken="));
  return raw ? decodeURIComponent(raw.split("=").slice(1).join("=")) : null;
}

/**
 * Get or create a socket connection for a specific namespace.
 * @param namespace The namespace to connect to (e.g., 'chat', 'call')
 */
export const getSocket = (namespace: "chat" | "call" = "chat") => {
  if (!sockets[namespace]) {
    let token = fetchTokenFromCookie();

    // Fallback: Zustand store
    if (!token) {
      try {
        const { useAuthStore } = require("../store/auth.store");
        token = useAuthStore.getState().token;
      } catch {
        /* ignore */
      }
    }

    // Connect to specific namespace
    sockets[namespace] = io(`${SOCKET_URL}/${namespace}`, {
      autoConnect: false,
      auth: {
        token,
      },
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      transports: ["websocket", "polling"],
    });
  }

  return sockets[namespace];
};

/**
 * Manually update the socket authentication token and reconnect for all active namespaces.
 */
export const updateSocketToken = (token: string) => {
  Object.values(sockets).forEach((s) => {
    s.disconnect();
    s.auth = { token };
    s.connect();
  });
};

export const disconnectSocket = () => {
  Object.keys(sockets).forEach((key) => {
    sockets[key].disconnect();
    delete sockets[key];
  });
};
