import { create } from 'zustand';
import { Conversation, Message, MessageStatus } from '../types';

interface RoomState {
  messages: Message[];
  hasMore: boolean;
  nextCursor?: string;
}

interface ChatState {
  messagesByRoom: Record<string, RoomState>;
  conversations: Conversation[];
  activeRoomId: string | null;
  typingUsers: Record<string, string[]>; // roomId -> userIds
  onlineUsers: string[]; // List of user IDs
  
  setActiveRoom: (id: string | null) => void;
  setConversations: (conversations: Conversation[]) => void;
  setTyping: (roomId: string, userId: string) => void;
  removeTyping: (roomId: string, userId: string) => void;
  setOnlineUsers: (users: string[]) => void;
  updateParticipantProfile: (userId: string, updates: { name?: string; avatar?: string }) => void;
  
  // High-performance Dedup functionality
  addMessage: (msg: Message) => void;
  // Optimistic ID flip
  updateMessageStatus: (roomId: string, tempId: string, serverId: string, status: MessageStatus) => void;
}

export const useChatStore = create<ChatState>()((set) => ({
  messagesByRoom: {},
  conversations: [],
  activeRoomId: null,
  typingUsers: {},
  onlineUsers: [],

  setActiveRoom: (id) => set({ activeRoomId: id }),
  setConversations: (conversations) => set({ conversations }),
  setOnlineUsers: (users) => set({ onlineUsers: users }),

  updateParticipantProfile: (userId, updates) => set((state) => ({
    conversations: (state.conversations as any[]).map((conv: any) => ({
      ...conv,
      participants: (conv.participants || []).map((p: any) =>
        p.id === userId ? { ...p, ...updates } : p
      ),
    })),
  })),
  
  setTyping: (roomId, userId) => set((state) => {
    const current = state.typingUsers[roomId] || [];
    if (current.includes(userId)) return state;
    return {
      typingUsers: {
        ...state.typingUsers,
        [roomId]: [...current, userId],
      },
    };
  }),

  removeTyping: (roomId, userId) => set((state) => {
    const current = state.typingUsers[roomId] || [];
    return {
      typingUsers: {
        ...state.typingUsers,
        [roomId]: current.filter(id => id !== userId),
      },
    };
  }),

  addMessage: (msg: Message) => set((state) => {
    const room = state.messagesByRoom[msg.roomId] || { messages: [], hasMore: false };
    const exists = room.messages.some(m => m.id === msg.id);

    if (!exists) {
      return {
        messagesByRoom: {
          ...state.messagesByRoom,
          [msg.roomId]: {
            ...room,
            messages: [...room.messages, msg] 
          }
        }
      };
    }
    return state;
  }),

  updateMessageStatus: (roomId, tempId, serverId, status) => set((state) => {
    const room = state.messagesByRoom[roomId];
    if (!room) return state;

    return {
      messagesByRoom: {
        ...state.messagesByRoom,
        [roomId]: {
          ...room,
          messages: room.messages.map(m => 
            m.id === tempId ? { ...m, id: serverId, status: status } : m
          )
        }
      }
    };
  })
}));
