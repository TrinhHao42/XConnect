import { create } from 'zustand';

export type CallStatus = 'idle' | 'calling' | 'ringing' | 'connected' | 'ended';
export type CallType = 'audio' | 'video' | null;

interface CallState {
  status: CallStatus;
  callType: CallType;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  remoteUser: { id: string; name: string } | null;
  incomingSignal: any | null; // Used temporarily when someone rings us
  
  setStatus: (status: CallStatus) => void;
  setLocalStream: (stream: MediaStream | null) => void;
  setRemoteStream: (stream: MediaStream | null) => void;
  setCallData: (data: { remoteUser: any; callType: CallType; incomingSignal?: any }) => void;
  resetCall: () => void;
}

export const useCallStore = create<CallState>()((set) => ({
  status: 'idle',
  callType: null,
  localStream: null,
  remoteStream: null,
  remoteUser: null,
  incomingSignal: null,

  setStatus: (status) => set({ status }),
  setLocalStream: (stream) => set({ localStream: stream }),
  setRemoteStream: (stream) => set({ remoteStream: stream }),
  setCallData: (data) => set((state) => ({ ...state, ...data })),
  
  // Phase 4 Constraint: Memory sweep
  resetCall: () => set((state) => {
    state.localStream?.getTracks().forEach(track => track.stop());
    state.remoteStream?.getTracks().forEach(track => track.stop());
    
    return {
      status: 'idle',
      callType: null,
      localStream: null,
      remoteStream: null,
      remoteUser: null,
      incomingSignal: null,
    };
  })
}));
