import { io, Socket } from "socket.io-client";
import { ClientToServerEvents, ServerToClientEvents } from "../types";
import { useAuthStore } from "../store/auth.store";

// Use an environment variable for the backend URL, fallback to localhost for Dev
const URL = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3000";

let socket: Socket<ServerToClientEvents, ClientToServerEvents> | null = null;

export const getSocket = () => {
  if (!socket) {
    // Only fetch token inside the factory function so it reads the latest
    const token = useAuthStore.getState().token;

    socket = io(URL, {
      autoConnect: false,
      auth: {
        token: token, // Sent securely in the initial handshake
      },
      // Smart Recconect resiliency rules from V4 Plan
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });
  }
  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
