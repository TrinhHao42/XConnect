"use client";

import { useEffect, useRef, useState } from 'react';
import { getSocket } from '../libs/socket';
import { useAuthStore } from '../store/auth.store';
import { useChatStore } from '../store/chat.store';
import { useFriendStore } from '../store/friend.store';
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

      // Map backend payload shape to frontend Message shape
      socket.on("newMessage", (data: any) => {
        const roomId = data.roomId || data.conversationId;
        if (!roomId || !data.id) return;

        useChatStore.getState().addMessage({
          id: data.id,
          content: data.content || "",
          type: data.type || (typeof data.content === "string" && data.content.startsWith("data:image/") ? "image" : "text"),
          senderId: data.senderId,
          roomId,
          createdAt: data.createdAt ? new Date(data.createdAt).getTime() : Date.now(),
          status: "sent",
        });
      });

      socket.on("messageStatusUpdate", ({ messageId, tempId, status, conversationId }: any) => {
        const { activeRoomId } = useChatStore.getState();
        const roomId = conversationId || activeRoomId;
        if (roomId && tempId) {
          useChatStore.getState().updateMessageStatus(roomId, tempId, messageId, status);
        }
      });
      
      socket.on("userTyping", ({ conversationId, userId }: any) => {
        console.log("Socket: userTyping received", { conversationId, userId });
        useChatStore.getState().setTyping(conversationId, userId);
      });

      socket.on("userStoppedTyping", ({ conversationId, userId }: any) => {
        console.log("Socket: userStoppedTyping received", { conversationId, userId });
        useChatStore.getState().removeTyping(conversationId, userId);
      });

      socket.on("updateOnlineUsers", (users: string[]) => {
        console.log("Socket: updateOnlineUsers", users);
        useChatStore.getState().setOnlineUsers(users);
      });

      socket.on("friendRequestReceived", (data: any) => {
        const { addRequest } = useFriendStore.getState();
        addRequest(data);
        toast.info(`Bạn nhận được lời mời kết bạn từ ${data.sender.name || data.sender.email}`, {
          description: "Vào mục Contacts để xem chi tiết",
          action: {
            label: "Xem",
            onClick: () => (window.location.href = "/contacts"),
          },
        });
      });

      socket.on("friendRequestAccepted", (data: any) => {
        const { addFriendId } = useAuthStore.getState();
        addFriendId(data.receiverId); // or data.receiver.id
        toast.success(`${data.receiver.name || data.receiver.email} đã chấp nhận lời mời kết bạn của bạn!`);
      });

      socket.on("friendRequestRejected", (data: any) => {
        toast.error(`${data.receiver.name || data.receiver.email} đã từ chối lời mời kết bạn.`);
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
