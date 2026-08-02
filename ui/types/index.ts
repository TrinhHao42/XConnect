// types/index.ts

// --- Data Models ---
export interface User {
  id: string;
  email: string;
  name?: string;
  avatar?: string;
  bio?: string;
  isOnline?: boolean;
  friendIds?: string[];
}

export type MessageType = "text" | "image" | "file";
export type MessageStatus = "sending" | "sent" | "delivered" | "seen" | "failed";

export interface Message {
  id: string; // "temp-16000000" for optimistic, UUID/MongoID for database sync
  content: string;
  type: MessageType;
  senderId: string;
  roomId: string;
  createdAt: string | number;
  status: MessageStatus;
}

export interface Conversation {
  id: string;
  participantIds: string[];
  participants?: User[];
  messages?: Message[];
  kind?: "direct" | "group";
  name?: string | null;
  leaderId?: string | null;
  memberAddMode?: "all" | "leader_only";
  messageSendMode?: "all" | "restricted";
  allowedSenderIds?: string[];
  updatedAt: string | number;
}

// --- Socket Events (Client -> Server) ---
export interface ClientToServerEvents {
  // Chat Handlers
  joinRoom: (payload: { conversationId: string }) => void;
  sendMessage: (payload: { conversationId: string; content: string; type?: MessageType; tempId?: string }) => void;
  messageSeen: (payload: { messageId: string; conversationId: string }) => void;
  typing: (payload: { conversationId: string }) => void;
  stopTyping: (payload: { conversationId: string }) => void;
  recallMessage: (payload: { messageId: string; conversationId: string }) => void;

  // WebRTC
  callUser: (payload: { userToCallId: string; signalData: any; isVideo: boolean; fromName?: string }) => void;
  answerCall: (payload: { toUserId: string; signalData: any }) => void;
  rejectCall: (payload: { toUserId: string; reason: "busy" | "declined" }) => void;
  endCall: (payload: { toUserId: string }) => void;
  iceCandidate: (payload: { toUserId: string; candidate: any }) => void;
}

// --- Socket Events (Server -> Client) ---
export interface ServerToClientEvents {
  // Chat Broadcasts
  newMessage: (message: Message & { tempId?: string }) => void; 
  messageStatusUpdate: (payload: { messageId: string; tempId?: string; status: MessageStatus; conversationId?: string }) => void;
  userTyping: (payload: { userId: string; conversationId: string }) => void;
  userStoppedTyping: (payload: { userId: string; conversationId: string }) => void;
  updateOnlineUsers: (users: string[]) => void;
  userProfileUpdated: (data: { userId: string; name?: string; avatar?: string }) => void;
  friendRequestReceived: (data: any) => void;
  friendRequestAccepted: (data: any) => void;
  friendRequestRejected: (data: any) => void;
  messageRecalled: (payload: { messageId: string; conversationId: string }) => void;
  
  // WebRTC Broadcasts
  incomingCall: (payload: { signal: any; from: string; callerName: string; isVideo: boolean }) => void;
  callAccepted: (payload: { signal: any; from: string }) => void;
  callRejected: (payload: { from: string; reason: "busy" | "declined" }) => void;
  callEnded: (payload: { from: string }) => void;
  iceCandidate: (payload: { candidate: any; from: string }) => void;
}

// --- API Responses ---
export interface PaginatedResponse<T> {
  data: T[];
  nextCursor?: string;
  hasMore: boolean;
}
