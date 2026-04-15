"use client";

import { useEffect, useRef } from "react";
import Peer from "simple-peer";
import { useSocket } from "./useSocket";
import { useCallStore } from "../store/call.store";
import { useAuthStore } from "../store/auth.store";

export const useWebRTC = () => {
  const { socket } = useSocket();
  const { user } = useAuthStore();
  const callState = useCallStore();

  // Keep references to peer and timeouts
  const peerRef = useRef<Peer.Instance | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize Media Streams
  const getStream = async (isVideo: boolean = true) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: isVideo, audio: true });
      callState.setLocalStream(stream);
      return stream;
    } catch (err) {
      console.error("Failed to get local stream", err);
      return null;
    }
  };

  const cleanUp = () => {
    if (peerRef.current) {
      peerRef.current.destroy();
      peerRef.current = null;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    callState.resetCall();
  };

  const endCall = () => {
    if (socket && callState.remoteUser) {
      socket.emit("endCall", { toUserId: callState.remoteUser.id });
    }
    cleanUp();
  };

  // Setup Global Socket Listeners for WebRTC
  useEffect(() => {
    if (!socket) return;

    const handleIncomingCall = (data: { signal: any; from: string; callerName: string; isVideo: boolean }) => {
      // Edge Case: Busy Signal Response
      if (useCallStore.getState().status !== "idle") {
        socket.emit("rejectCall", { toUserId: data.from, reason: "busy" });
        return;
      }
      
      callState.setCallData({
        remoteUser: { id: data.from, name: data.callerName },
        callType: data.isVideo ? "video" : "audio",
        incomingSignal: data.signal
      });
      callState.setStatus("ringing");
    };

    const handleCallAccepted = (data: { signal: any; from: string }) => {
      callState.setStatus("connected");
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      peerRef.current?.signal(data.signal);
    };

    const handleCallRejected = (data: { from: string; reason: string }) => {
      console.log(`Call rejected logic: ${data.reason}`);
      cleanUp();
    };

    const handleCallEnded = () => {
      cleanUp();
    };

    const handleIceCandidate = (data: { candidate: any; from: string }) => {
      peerRef.current?.signal(data.candidate);
    };

    socket.on("incomingCall", handleIncomingCall);
    socket.on("callAccepted", handleCallAccepted);
    socket.on("callRejected", handleCallRejected);
    socket.on("callEnded", handleCallEnded);
    socket.on("iceCandidate", handleIceCandidate);

    return () => {
      socket.off("incomingCall", handleIncomingCall);
      socket.off("callAccepted", handleCallAccepted);
      socket.off("callRejected", handleCallRejected);
      socket.off("callEnded", handleCallEnded);
      socket.off("iceCandidate", handleIceCandidate);
    };
  }, [socket]);

  // Handle Tab Closing (F5 Tracker)
  useEffect(() => {
    const handleBeforeUnload = () => {
      const state = useCallStore.getState();
      if (state.status !== "idle" && state.remoteUser) {
        socket?.emit("endCall", { toUserId: state.remoteUser.id });
        state.localStream?.getTracks().forEach((track) => track.stop());
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [socket]);

  // Actions
  const initiateCall = async (userToCallId: string, nameToCall: string, isVideo: boolean = true) => {
    callState.setCallData({ remoteUser: { id: userToCallId, name: nameToCall }, callType: isVideo ? "video" : "audio" });
    callState.setStatus("calling");

    const stream = await getStream(isVideo);
    if (!stream) {
      callState.setStatus("idle");
      return;
    }

    const peer = new Peer({
      initiator: true,
      trickle: false,
      stream: stream,
    });

    peer.on("signal", (data) => {
      // First handshake logic
      socket?.emit("callUser", { 
        userToCallId, 
        signalData: data, 
        isVideo, 
        fromName: user?.name 
      });
    });

    peer.on("stream", (remoteStream) => {
      callState.setRemoteStream(remoteStream);
    });

    peerRef.current = peer;

    // Phase 4 Constraint: Timeout Edge Case
    timeoutRef.current = setTimeout(() => {
      if (useCallStore.getState().status === "calling") {
        console.warn("Call timed out");
        endCall();
      }
    }, 30000);
  };

  const answerCall = async () => {
    const { remoteUser, incomingSignal, callType } = callState;
    if (!remoteUser || !incomingSignal) return;

    callState.setStatus("connected");
    const stream = await getStream(callType === "video");
    if (!stream) {
      callState.setStatus("idle");
      return;
    }

    const peer = new Peer({
      initiator: false,
      trickle: false,
      stream: stream,
    });

    peer.on("signal", (data) => {
      socket?.emit("answerCall", { toUserId: remoteUser.id, signalData: data });
    });

    peer.on("stream", (remoteStream) => {
      callState.setRemoteStream(remoteStream);
    });

    peer.signal(incomingSignal);
    peerRef.current = peer;
  };

  const declineCall = () => {
    if (callState.remoteUser) {
      socket?.emit("rejectCall", { toUserId: callState.remoteUser.id, reason: "declined" });
    }
    cleanUp();
  };

  return { initiateCall, answerCall, declineCall, endCall };
};
