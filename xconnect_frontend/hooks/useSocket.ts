"use client";

import { useEffect, useRef, useState } from 'react';
import { getSocket } from '../libs/socket';
import { useAuthStore } from '../store/auth.store';
import { useChatStore } from '../store/chat.store';
import { toast } from "sonner";

export const useSocket = () => {
  const { isAuthenticated } = useAuthStore();
  const socket = getSocket();
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Only connect if user is authenticated
    if (isAuthenticated) {
      socket.connect();

      socket.on("connect", () => {
        console.log("Socket connected:", socket.id);
        setIsConnected(true);
        toast.success("Connected to chat server", { id: "socket-conn" });
        
        // Smarter Reconnect Resiliency: Rejoin active rooms silently
        const { activeRoomId } = useChatStore.getState();
        if (activeRoomId) {
          socket.emit("joinRoom", { conversationId: activeRoomId });
        }
      });

      socket.on("disconnect", (reason) => {
        console.warn("Socket disconnected:", reason);
        setIsConnected(false);
        toast.error(`Disconnected: ${reason}`, { id: "socket-conn" });
      });

      socket.on("connect_error", (error) => {
        console.error("Socket connection error:", error);
        toast.error("Connection error, retrying...", { id: "socket-conn" });
      });

      // Dedup insertion logic bound to socket listening
      socket.on("newMessage", (data) => {
        useChatStore.getState().addMessage({
          ...data,
          // Ensuring we fall back to an explicit ID if tempId isn't around but logic should map tempId in updateMessageStatus
          id: data.id, 
        });
      });

      socket.on("messageStatusUpdate", ({ messageId, tempId, status }) => {
        const { activeRoomId } = useChatStore.getState();
        if (activeRoomId && tempId) {
          useChatStore.getState().updateMessageStatus(activeRoomId, tempId, messageId, status);
        }
      });
    }

    return () => {
      // Clean up connection gracefully on unmount or auth loss
      socket.off("connect");
      socket.off("disconnect");
      socket.off("newMessage");
      socket.off("messageStatusUpdate");
      // Not calling disconnect() here entirely so active connections remain across Next.js soft-navigations,
      // but if the user entirely logs out, the logout function will explicitly call disconnectSocket().
    };
  }, [isAuthenticated, socket]);

  return { socket, connected: isConnected };
};
