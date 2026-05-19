"use client";

import { useEffect, useState } from 'react';
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
    if (!isAuthenticated) return;

    socket.connect();

    // --- Named handlers (required for proper per-handler cleanup) ---
    const onConnect = () => {
      console.log("Socket connected:", socket.id);
      setIsConnected(true);
      // Smarter Reconnect Resiliency: Rejoin active rooms silently
      const { activeRoomId } = useChatStore.getState();
      if (activeRoomId) {
        socket.emit("joinRoom", { conversationId: activeRoomId });
      }
    };

    const onDisconnect = (reason: string) => {
      console.warn("Socket disconnected:", reason);
      setIsConnected(false);
    };

    const onConnectError = (error: Error) => {
      console.error("Socket connection error:", error);
    };

    const onNewMessage = (data: any) => {
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
    };

    const onMessageStatusUpdate = ({ messageId, tempId, status, conversationId }: any) => {
      const { activeRoomId } = useChatStore.getState();
      const roomId = conversationId || activeRoomId;
      if (roomId && tempId) {
        useChatStore.getState().updateMessageStatus(roomId, tempId, messageId, status);
      }
    };

    const onUserTyping = ({ conversationId, userId }: any) => {
      useChatStore.getState().setTyping(conversationId, userId);
    };

    const onUserStoppedTyping = ({ conversationId, userId }: any) => {
      useChatStore.getState().removeTyping(conversationId, userId);
    };

    const onUpdateOnlineUsers = (users: string[]) => {
      useChatStore.getState().setOnlineUsers(users);
    };

    const onUserProfileUpdated = (data: { userId: string; name?: string; avatar?: string }) => {
      useChatStore.getState().updateParticipantProfile(data.userId, {
        name: data.name,
        avatar: data.avatar,
      });
    };

    const onFriendRequestReceived = (data: any) => {
      useFriendStore.getState().addRequest(data);
      toast.info(`You received a friend request from ${data.sender.name || data.sender.email}`, {
        description: "Go to Contacts to view details",
        action: {
          label: "View",
          onClick: () => (window.location.href = "/contacts"),
        },
      });
    };

    const onFriendRequestAccepted = (data: any) => {
      useAuthStore.getState().addFriendId(data.receiverId);
      toast.success(`${data.receiver.name || data.receiver.email} accepted your friend request!`);
    };

    const onFriendRequestRejected = (data: any) => {
      toast.error(`${data.receiver.name || data.receiver.email} declined your friend request.`);
    };

    // --- Register all handlers ---
    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("connect_error", onConnectError);
    socket.on("newMessage", onNewMessage);
    socket.on("messageStatusUpdate", onMessageStatusUpdate);
    socket.on("userTyping", onUserTyping);
    socket.on("userStoppedTyping", onUserStoppedTyping);
    socket.on("updateOnlineUsers", onUpdateOnlineUsers);
    socket.on("userProfileUpdated", onUserProfileUpdated);
    socket.on("friendRequestReceived", onFriendRequestReceived);
    socket.on("friendRequestAccepted", onFriendRequestAccepted);
    socket.on("friendRequestRejected", onFriendRequestRejected);

    // --- Cleanup: remove EXACT handlers to prevent duplicates on re-render ---
    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("connect_error", onConnectError);
      socket.off("newMessage", onNewMessage);
      socket.off("messageStatusUpdate", onMessageStatusUpdate);
      socket.off("userTyping", onUserTyping);
      socket.off("userStoppedTyping", onUserStoppedTyping);
      socket.off("updateOnlineUsers", onUpdateOnlineUsers);
      socket.off("userProfileUpdated", onUserProfileUpdated);
      socket.off("friendRequestReceived", onFriendRequestReceived);
      socket.off("friendRequestAccepted", onFriendRequestAccepted);
      socket.off("friendRequestRejected", onFriendRequestRejected);
    };
  }, [isAuthenticated, socket]);

  return { socket, connected: isConnected };
};
