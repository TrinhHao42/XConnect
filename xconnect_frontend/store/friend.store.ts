import { create } from 'zustand';

interface FriendRequest {
  id: string;
  senderId: string;
  sender: {
    id: string;
    name: string;
    email: string;
    avatar?: string;
  };
  status: string;
  createdAt: string;
}

interface FriendState {
  requests: FriendRequest[];
  friends: any[];
  setRequests: (requests: FriendRequest[]) => void;
  addRequest: (request: FriendRequest) => void;
  removeRequest: (requestId: string) => void;
  setFriends: (friends: any[]) => void;
}

export const useFriendStore = create<FriendState>((set) => ({
  requests: [],
  friends: [],
  setRequests: (requests) => set({ requests }),
  addRequest: (request) => set((state) => ({ 
    requests: [request, ...state.requests.filter(r => r.id !== request.id)] 
  })),
  removeRequest: (requestId) => set((state) => ({ 
    requests: state.requests.filter((r) => r.id !== requestId) 
  })),
  setFriends: (friends) => set({ friends }),
}));
