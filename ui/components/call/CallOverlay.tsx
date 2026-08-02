"use client";

import { useEffect, useRef } from "react";
import { useCallStore } from "@/store/call.store";
import { useWebRTC } from "@/hooks/useWebRTC";
import { PhoneOff, MicOff, VideoOff, Maximize2 } from "lucide-react";

export default function CallOverlay() {
  const { status, callType, remoteUser, localStream, remoteStream } = useCallStore();
  const { endCall } = useWebRTC();
  
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  // Sync Streams to DOM
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  if (status !== "connected" && status !== "calling") return null;

  return (
    <div className="fixed inset-0 z-[90] bg-[#111] flex flex-col justify-between">
      {/* Remote Video / Audio Banner */}
      <div className="flex-1 relative w-full h-full flex items-center justify-center">
        {callType === "video" && status === "connected" ? (
          <video 
            ref={remoteVideoRef} 
            autoPlay 
            playsInline 
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="flex flex-col items-center gap-4 text-white">
            <div className="w-24 h-24 bg-primary/30 rounded-full flex items-center justify-center text-3xl font-bold">
              {remoteUser?.name[0] || "U"}
            </div>
            <h2 className="text-2xl font-semibold">{remoteUser?.name}</h2>
            <p className="text-white/60">{status === "calling" ? "Ringing..." : "00:00"}</p>
          </div>
        )}

        {/* Local Video PIP */}
        {(callType === "video" || localStream) && (
          <div className="absolute top-6 right-6 w-32 h-44 sm:w-48 sm:h-64 bg-slate-800 rounded-2xl overflow-hidden shadow-2xl border-4 border-[#222]">
            <video 
              ref={localVideoRef} 
              autoPlay 
              playsInline 
              muted 
              className="w-full h-full object-cover"
            />
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="h-24 bg-gradient-to-t from-black/80 to-transparent flex items-center justify-center gap-6 pb-6">
        <button className="w-12 h-12 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center backdrop-blur-sm transition-all focus:outline-none focus:ring-2 focus:ring-white/50">
          <MicOff className="w-5 h-5" />
        </button>
        <button 
          onClick={endCall}
          className="w-14 h-14 rounded-full bg-error hover:bg-red-600 text-white flex items-center justify-center shadow-lg hover:scale-105 transition-all focus:outline-none focus:ring-2 focus:ring-error/50"
        >
          <PhoneOff className="w-6 h-6" />
        </button>
        <button className="w-12 h-12 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center backdrop-blur-sm transition-all focus:outline-none focus:ring-2 focus:ring-white/50">
          <VideoOff className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
