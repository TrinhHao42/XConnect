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
  
  setActiveRoom: (id: string | null) => void;
  setConversations: (conversations: Conversation[]) => void;
  
  // High-performance Dedup functionality
  addMessage: (msg: Message) => void;
  // Optimistic ID flip
  updateMessageStatus: (roomId: string, tempId: string, serverId: string, status: MessageStatus) => void;
}

export const useChatStore = create<ChatState>()((set) => ({
  messagesByRoom: {},
  conversations: [],
  activeRoomId: null,

  setActiveRoom: (id) => set({ activeRoomId: id }),
  setConversations: (conversations) => set({ conversations }),

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
