"use client";

import { useCallStore } from "@/store/call.store";
import { useWebRTC } from "@/hooks/useWebRTC";
import { PhoneInput, PhoneOff, Video } from "lucide-react";

export default function IncomingCallModal() {
  const { status, remoteUser, callType } = useCallStore();
  const { answerCall, declineCall } = useWebRTC();

  if (status !== "ringing" || !remoteUser) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-on-surface/40 backdrop-blur-sm p-4">
      <div className="bg-surface-container-lowest rounded-3xl p-8 flex flex-col items-center gap-6 shadow-[0px_12px_32px_rgba(25,28,30,0.1)] w-full max-w-sm">
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center overflow-hidden mb-2 animate-pulse">
            <span className="text-primary font-extrabold text-2xl">{remoteUser.name[0]}</span>
          </div>
          <h2 className="text-xl font-bold text-on-surface">Incoming {callType} call...</h2>
          <p className="text-on-surface-variant font-medium">{remoteUser.name}</p>
        </div>

        <div className="flex w-full items-center justify-center gap-8 mt-2">
          <button 
            onClick={declineCall}
            className="flex flex-col items-center gap-2 focus:outline-none group"
          >
            <div className="w-14 h-14 bg-error text-white rounded-full flex items-center justify-center hover:scale-110 active:scale-95 transition-transform shadow-lg shadow-error/30">
              <PhoneOff className="w-6 h-6" />
            </div>
            <span className="text-xs font-semibold text-on-surface-variant group-hover:text-error transition-colors">Decline</span>
          </button>

          <button 
            onClick={answerCall}
            className="flex flex-col items-center gap-2 focus:outline-none group"
          >
            <div className="w-14 h-14 bg-emerald-500 text-white rounded-full flex items-center justify-center hover:scale-110 active:scale-95 transition-transform shadow-lg shadow-emerald-500/30">
              {callType === "video" ? <Video className="w-6 h-6" /> : <PhoneInput className="w-6 h-6" />}
            </div>
            <span className="text-xs font-semibold text-on-surface-variant group-hover:text-emerald-500 transition-colors">Answer</span>
          </button>
        </div>
      </div>
    </div>
  );
}
