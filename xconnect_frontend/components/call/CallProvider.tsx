"use client";

import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { IAgoraRTCClient, ILocalAudioTrack, ILocalVideoTrack } from "agora-rtc-sdk-ng";
import { Loader2, Mic, MicOff, Phone, PhoneOff, Video, VideoOff, X } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/libs/api";
import { getSocket } from "@/libs/socket";
import { useAuthStore } from "@/store/auth.store";

type CallPhase = "idle" | "ringing-in" | "ringing-out" | "connecting" | "active";

interface CallUser {
  id: string;
  name?: string;
  avatar?: string;
  email?: string;
}

interface CallSignalData {
  callId: string;
  channelName: string;
}

interface CallSession {
  callId: string;
  channelName: string;
  isVideo: boolean;
  phase: CallPhase;
  direction: "incoming" | "outgoing";
  callerId: string;
  callerName: string;
  calleeId: string;
  calleeName: string;
  peerId: string;
  peerName: string;
  peerAvatar?: string;
}

interface CallContextValue {
  startAudioCall: (user: CallUser) => void;
  startVideoCall: (user: CallUser) => void;
  acceptCall: () => Promise<void>;
  rejectCall: () => Promise<void>;
  endCall: () => Promise<void>;
  status: CallPhase;
  activeSession: CallSession | null;
  peerName: string | null;
  isVideo: boolean;
  isBusy: boolean;
}

const CallContext = createContext<CallContextValue | null>(null);

function useCallSession() {
  const context = useContext(CallContext);
  if (!context) {
    throw new Error("useCallSession must be used within CallProvider");
  }
  return context;
}

function getDisplayName(user?: CallUser | null) {
  return user?.name || user?.email || "Someone";
}

function buildCallId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `call-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function getInitial(name: string) {
  return name?.[0]?.toUpperCase() || "?";
}

function toAgoraUid(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  const text = String(value ?? "").trim();
  if (!text) return 0;

  const numeric = Number(text);
  if (Number.isFinite(numeric) && numeric > 0) {
    return Math.floor(numeric);
  }

  let hash = 0;
  for (let index = 0; index < text.length; index += 1) {
    hash = (hash * 31 + text.charCodeAt(index)) | 0;
  }

  return Math.abs(hash) || 1;
}

export function CallProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, user } = useAuthStore();
  const [session, setSession] = useState<CallSession | null>(null);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const sessionRef = useRef<CallSession | null>(null);
  const previousSessionRef = useRef<CallSession | null>(null);
  const clientRef = useRef<IAgoraRTCClient | null>(null);
  const localAudioTrackRef = useRef<ILocalAudioTrack | null>(null);
  const localVideoTrackRef = useRef<ILocalVideoTrack | null>(null);
  const remoteUserRef = useRef<any | null>(null);
  const localVideoContainerRef = useRef<HTMLDivElement | null>(null);
  const remoteVideoContainerRef = useRef<HTMLDivElement | null>(null);
  const callSocketRef = useRef<ReturnType<typeof getSocket> | null>(null);

  const clearAgoraArtifacts = useCallback(async () => {
    localAudioTrackRef.current?.stop();
    localAudioTrackRef.current?.close();
    localAudioTrackRef.current = null;

    localVideoTrackRef.current?.stop();
    localVideoTrackRef.current?.close();
    localVideoTrackRef.current = null;

    if (localVideoContainerRef.current) {
      localVideoContainerRef.current.innerHTML = "";
    }

    if (remoteVideoContainerRef.current) {
      remoteVideoContainerRef.current.innerHTML = "";
    }

    remoteUserRef.current = null;

    const client = clientRef.current;
    clientRef.current = null;

    if (client) {
      try {
        client.removeAllListeners?.();
        await client.leave();
      } catch (error) {
        console.warn("Failed to leave Agora channel", error);
      }
    }
  }, []);

  const resetSession = useCallback(async () => {
    await clearAgoraArtifacts();
    setIsMicMuted(false);
    setIsCameraOff(false);
    setSession(null);
  }, [clearAgoraArtifacts]);

  const getCallTypeLabel = (isVideoCall: boolean) => (isVideoCall ? "video" : "audio");

  const toggleMic = useCallback(async () => {
    const track = localAudioTrackRef.current;
    if (!track) return;

    const nextMuted = !isMicMuted;

    try {
      await track.setEnabled(!nextMuted);
      setIsMicMuted(nextMuted);
      toast.info(nextMuted ? "Đã tắt mic" : "Đã bật mic");
    } catch (error) {
      console.error("Failed to toggle microphone", error);
      toast.error("Không thể đổi trạng thái mic");
    }
  }, [isMicMuted]);

  const toggleCamera = useCallback(async () => {
    const track = localVideoTrackRef.current;
    if (!track) return;

    const nextOff = !isCameraOff;

    try {
      await track.setEnabled(!nextOff);
      setIsCameraOff(nextOff);
      toast.info(nextOff ? "Đã tắt camera" : "Đã bật camera");
    } catch (error) {
      console.error("Failed to toggle camera", error);
      toast.error("Không thể đổi trạng thái camera");
    }
  }, [isCameraOff]);

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  useEffect(() => {
    const previousSession = previousSessionRef.current;

    if (session?.phase === "active" && previousSession?.phase !== "active") {
      toast.success(`Cuộc gọi ${getCallTypeLabel(session.isVideo)} đã kết nối thành công`);
    }

    previousSessionRef.current = session;
  }, [session]);

  useEffect(() => {
    if (!isAuthenticated) {
      void resetSession();
      return;
    }

    const socket = getSocket("call");
    callSocketRef.current = socket;

    if (!socket.connected) {
      socket.connect();
    }

    const handleIncomingCall = (payload: { signal: CallSignalData; from: string; callerName: string; isVideo: boolean }) => {
      const currentSession = sessionRef.current;
      const currentUser = useAuthStore.getState().user;
      const fromName = payload.callerName || "Someone";

      if (currentSession && currentSession.phase !== "idle") {
        socket.emit("rejectCall", { toUserId: payload.from, reason: "busy" });
        return;
      }

      if (!currentUser) {
        socket.emit("rejectCall", { toUserId: payload.from, reason: "declined" });
        return;
      }

      setSession({
        callId: payload.signal?.callId || buildCallId(),
        channelName: payload.signal?.channelName || `xconnect-call-${payload.from}`,
        isVideo: payload.isVideo,
        phase: "ringing-in",
        direction: "incoming",
        callerId: payload.from,
        callerName: fromName,
        calleeId: currentUser.id,
        calleeName: getDisplayName(currentUser),
        peerId: payload.from,
        peerName: fromName,
      });

      toast.info(`${fromName} đang gọi ${payload.isVideo ? "video" : "audio"}...`);
    };

    const handleCallAccepted = (payload: { signal: CallSignalData; from: string }) => {
      const currentSession = sessionRef.current;
      if (!currentSession || currentSession.direction !== "outgoing") return;
      if (payload.from !== currentSession.peerId) return;

      setSession((state) => (state ? { ...state, phase: "connecting", channelName: payload.signal?.channelName || state.channelName } : state));
    };

    const handleCallRejected = (payload: { from: string; reason: "busy" | "declined" }) => {
      const currentSession = sessionRef.current;
      if (!currentSession || currentSession.peerId !== payload.from) return;

      const callType = getCallTypeLabel(currentSession.isVideo);
      toast.error(
        payload.reason === "busy"
          ? `Gọi ${callType} không thành công: người kia đang bận`
          : `Gọi ${callType} không thành công: bị từ chối`,
      );
      void resetSession();
    };

    const handleCallEnded = (payload: { from: string }) => {
      const currentSession = sessionRef.current;
      if (!currentSession || currentSession.peerId !== payload.from) return;

      toast.info(`Cuộc gọi ${getCallTypeLabel(currentSession.isVideo)} đã kết thúc`);
      void resetSession();
    };

    socket.on("incomingCall", handleIncomingCall);
    socket.on("callAccepted", handleCallAccepted);
    socket.on("callRejected", handleCallRejected);
    socket.on("callEnded", handleCallEnded);

    return () => {
      socket.off("incomingCall", handleIncomingCall);
      socket.off("callAccepted", handleCallAccepted);
      socket.off("callRejected", handleCallRejected);
      socket.off("callEnded", handleCallEnded);
    };
  }, [isAuthenticated, resetSession]);

  useEffect(() => {
    const currentSession = session;

    if (!currentSession || currentSession.phase !== "connecting") {
      return;
    }

    let cancelled = false;
  let currentClient: IAgoraRTCClient | null = null;

    const connectAgora = async () => {
      const appId = process.env.NEXT_PUBLIC_AGORA_APP_ID;
        let token = process.env.NEXT_PUBLIC_AGORA_TOKEN || null;
        const uidCandidate = user?.id ?? currentSession.callerId ?? currentSession.calleeId;
        const localUserId = toAgoraUid(uidCandidate);

        if (!token) {
          try {
            const data = await api.get<{ token?: string }>(`/call/token?channelName=${encodeURIComponent(currentSession.channelName)}&uid=${encodeURIComponent(String(localUserId))}`);
            token = data?.token || null;
          } catch (err) {
            console.warn('Error fetching Agora token:', err);
          }
        }

        if (!token) {
          toast.error("Không lấy được Agora token");
          await resetSession();
          return;
        }

      if (!appId) {
        toast.error("Thiếu NEXT_PUBLIC_AGORA_APP_ID cho Agora");
        await resetSession();
        return;
      }

      try {
        await clearAgoraArtifacts();

        const AgoraRTCModule = await import("agora-rtc-sdk-ng");
        const AgoraRTC = (AgoraRTCModule && (AgoraRTCModule as any).default) ? (AgoraRTCModule as any).default : (AgoraRTCModule as any);

        const client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });
        currentClient = client;
        clientRef.current = client;

        client.on("user-published", async (remoteUser: any, mediaType: "audio" | "video") => {
          if (cancelled || clientRef.current !== client) return;

          try {
            await client.subscribe(remoteUser, mediaType);
          } catch (error) {
            if (cancelled || clientRef.current !== client) return;
            console.warn("Failed to subscribe remote user", error);
            return;
          }

          if (cancelled || clientRef.current !== client) return;

          remoteUserRef.current = remoteUser;

          if (mediaType === "audio") {
            remoteUser.audioTrack?.play();
          }

          if (mediaType === "video" && remoteVideoContainerRef.current && remoteUser.videoTrack) {
            remoteVideoContainerRef.current.innerHTML = "";
            remoteUser.videoTrack.play(remoteVideoContainerRef.current);
          }
        });

        client.on("user-unpublished", () => {
          if (cancelled || clientRef.current !== client) return;
          remoteUserRef.current = null;
          if (remoteVideoContainerRef.current) {
            remoteVideoContainerRef.current.innerHTML = "";
          }
        });

        client.on("user-left", () => {
          if (cancelled || clientRef.current !== client) return;
          remoteUserRef.current = null;
          if (remoteVideoContainerRef.current) {
            remoteVideoContainerRef.current.innerHTML = "";
          }
        });

        await client.join(appId, currentSession.channelName, token, localUserId);

        const audioTrack = await AgoraRTC.createMicrophoneAudioTrack();
        localAudioTrackRef.current = audioTrack;
        setIsMicMuted(false);

        const tracks: Array<ILocalAudioTrack | ILocalVideoTrack> = [audioTrack];

        if (currentSession.isVideo) {
          const videoTrack = await AgoraRTC.createCameraVideoTrack();
          localVideoTrackRef.current = videoTrack;
          setIsCameraOff(false);
          tracks.push(videoTrack);

          if (localVideoContainerRef.current) {
            localVideoContainerRef.current.innerHTML = "";
            videoTrack.play(localVideoContainerRef.current);
          }
        }

        await client.publish(tracks);

        if (!cancelled) {
          setSession((state) => (state ? { ...state, phase: "active" } : state));
        }
      } catch (error) {
        console.error("Failed to start Agora call", error);
        toast.error("Không thể khởi tạo cuộc gọi Agora");
        await resetSession();
      }
    };

    void connectAgora();

    return () => {
      cancelled = true;
      if (currentClient) {
        currentClient.removeAllListeners?.();
      }
    };
  }, [clearAgoraArtifacts, resetSession, session, user?.id]);

  const startCall = useCallback((peer: CallUser, isVideo: boolean) => {
    const currentSession = sessionRef.current;
    const currentUser = useAuthStore.getState().user;
    const socket = callSocketRef.current || getSocket("call");

    if (!currentUser) {
      toast.error("Bạn cần đăng nhập để gọi");
      return;
    }

    if (currentSession && currentSession.phase !== "idle") {
      toast.info("Bạn đang có một cuộc gọi khác");
      return;
    }

    const callId = buildCallId();
    const channelName = `xconnect-call-${callId}`;
    const callerName = getDisplayName(currentUser);
    const calleeName = getDisplayName(peer);

    const newSession: CallSession = {
      callId,
      channelName,
      isVideo,
      phase: "ringing-out",
      direction: "outgoing",
      callerId: currentUser.id,
      callerName,
      calleeId: peer.id,
      calleeName,
      peerId: peer.id,
      peerName: calleeName,
      peerAvatar: peer.avatar,
    };

    setSession(newSession);
    toast.info(`Đang gọi ${isVideo ? "video" : "audio"}...`);
    socket.emit("callUser", {
      userToCallId: peer.id,
      signalData: { callId, channelName },
      isVideo,
      fromName: callerName,
    });
  }, []);

  const acceptCall = useCallback(async () => {
    const currentSession = sessionRef.current;
    if (!currentSession || currentSession.phase !== "ringing-in") return;

    const socket = callSocketRef.current || getSocket("call");
    setSession((state) => (state ? { ...state, phase: "connecting" } : state));

    socket.emit("answerCall", {
      toUserId: currentSession.callerId,
      signalData: { callId: currentSession.callId, channelName: currentSession.channelName },
    });
  }, []);

  const rejectCall = useCallback(async () => {
    const currentSession = sessionRef.current;
    if (!currentSession || currentSession.phase !== "ringing-in") return;

    const socket = callSocketRef.current || getSocket("call");
    socket.emit("rejectCall", {
      toUserId: currentSession.callerId,
      reason: "declined",
    });

    await resetSession();
  }, [resetSession]);

  const endCall = useCallback(async () => {
    const currentSession = sessionRef.current;
    if (!currentSession) return;

    const socket = callSocketRef.current || getSocket("call");
    socket.emit("endCall", {
      toUserId: currentSession.peerId,
    });

    await resetSession();
  }, [resetSession]);

  const value = useMemo<CallContextValue>(
    () => ({
      startAudioCall: (peer) => startCall(peer, false),
      startVideoCall: (peer) => startCall(peer, true),
      acceptCall,
      rejectCall,
      endCall,
      status: session?.phase || "idle",
      activeSession: session,
      peerName: session?.peerName || null,
      isVideo: session?.isVideo || false,
      isBusy: Boolean(session && session.phase !== "idle"),
    }),
    [acceptCall, endCall, rejectCall, session, startCall]
  );

  return (
    <CallContext.Provider value={value}>
      {children}
      <CallOverlay
        session={session}
        acceptCall={acceptCall}
        rejectCall={rejectCall}
        endCall={endCall}
        toggleMic={toggleMic}
        toggleCamera={toggleCamera}
        isMicMuted={isMicMuted}
        isCameraOff={isCameraOff}
        localVideoContainerRef={localVideoContainerRef}
        remoteVideoContainerRef={remoteVideoContainerRef}
      />
    </CallContext.Provider>
  );
}

function CallOverlay({
  session,
  acceptCall,
  rejectCall,
  endCall,
  toggleMic,
  toggleCamera,
  isMicMuted,
  isCameraOff,
  localVideoContainerRef,
  remoteVideoContainerRef,
}: {
  session: CallSession | null;
  acceptCall: () => Promise<void>;
  rejectCall: () => Promise<void>;
  endCall: () => Promise<void>;
  toggleMic: () => Promise<void>;
  toggleCamera: () => Promise<void>;
  isMicMuted: boolean;
  isCameraOff: boolean;
  localVideoContainerRef: React.RefObject<HTMLDivElement | null>;
  remoteVideoContainerRef: React.RefObject<HTMLDivElement | null>;
}) {
  if (!session || session.phase === "idle") return null;

  const peerName = session.peerName;
  const isIncoming = session.phase === "ringing-in";
  const isOutgoing = session.phase === "ringing-out";
  const isConnecting = session.phase === "connecting";
  const isActive = session.phase === "active";

  if (isIncoming) {
    return (
      <div className="fixed inset-0 z-90 flex items-center justify-center bg-slate-950/70 backdrop-blur-md p-4">
        <div className="w-full max-w-md overflow-hidden rounded-4xl border border-white/10 bg-slate-900/95 shadow-2xl">
          <div className="flex items-start justify-between px-6 pb-4 pt-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Incoming {session.isVideo ? "video" : "audio"} call</p>
              <h2 className="mt-2 text-2xl font-bold text-white">{peerName}</h2>
              <p className="mt-1 text-sm text-slate-400">{session.isVideo ? "Video call" : "Audio call"} đang chờ phản hồi</p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/5 text-emerald-400">
              {session.isVideo ? <Video className="h-5 w-5" /> : <Phone className="h-5 w-5" />}
            </div>
          </div>

          <div className="flex items-center justify-center px-6 pb-6">
            <div className="flex h-24 w-24 items-center justify-center rounded-4xl bg-linear-to-br from-indigo-500 to-cyan-500 text-3xl font-bold text-white shadow-lg shadow-cyan-500/20">
              {getInitial(peerName)}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 px-6 pb-6">
            <button
              onClick={rejectCall}
              className="flex items-center justify-center gap-2 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-4 text-sm font-semibold text-red-400 transition-colors hover:bg-red-500/20"
            >
              <PhoneOff className="h-4 w-4" />
              Reject
            </button>
            <button
              onClick={acceptCall}
              className="flex items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-4 py-4 text-sm font-semibold text-white transition-transform hover:scale-[1.01] active:scale-[0.99]"
            >
              <Phone className="h-4 w-4" />
              Accept
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (isOutgoing || isConnecting || isActive) {
    return (
      <div className="fixed inset-0 z-90 overflow-hidden bg-slate-950">
        <div className="relative flex h-full w-full flex-col">
          <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-black" />

          <div className="relative flex flex-1 flex-col gap-4 p-4 sm:p-6">
            {session.isVideo ? (
              <div className="relative flex-1 overflow-hidden rounded-[28px] border border-white/10 bg-slate-900 shadow-2xl shadow-black/40">
                <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800" />

                {isOutgoing || isConnecting ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-center">
                    <div className="flex h-28 w-28 items-center justify-center rounded-[28px] bg-linear-to-br from-indigo-500 to-cyan-500 text-4xl font-bold text-white shadow-lg shadow-cyan-500/20">
                      {getInitial(peerName)}
                    </div>
                    <div>
                      <p className="text-xl font-semibold text-white">{peerName}</p>
                      <p className="mt-1 text-sm text-slate-400">
                        {isOutgoing ? "Đang đổ chuông..." : "Đang kết nối Agora..."}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div ref={remoteVideoContainerRef} className="absolute inset-0 [&>video]:h-full [&>video]:w-full [&>video]:object-cover" />
                )}

                <div className="absolute right-4 top-4 z-10 w-[28vw] min-w-[140px] max-w-[260px] overflow-hidden rounded-[24px] border border-white/15 bg-black/35 shadow-2xl backdrop-blur-md">
                  <div ref={localVideoContainerRef} className="relative aspect-[3/4] bg-black [&>video]:h-full [&>video]:w-full [&>video]:object-cover" />
                </div>

                <div className="absolute inset-x-0 bottom-5 flex justify-center px-4">
                  <div className="flex items-center gap-3 rounded-full border border-white/10 bg-black/45 px-4 py-3 shadow-2xl shadow-black/30 backdrop-blur-md">
                    <button
                      onClick={toggleMic}
                      className="flex h-12 w-12 items-center justify-center rounded-full bg-white/5 text-white transition-colors hover:bg-white/10"
                      type="button"
                      title={isMicMuted ? "Bật mic" : "Tắt mic"}
                    >
                      {isMicMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                    </button>
                    <button
                      onClick={toggleCamera}
                      className="flex h-12 w-12 items-center justify-center rounded-full bg-white/5 text-white transition-colors hover:bg-white/10"
                      type="button"
                      title={isCameraOff ? "Bật camera" : "Tắt camera"}
                    >
                      {isCameraOff ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
                    </button>
                    <button
                      onClick={endCall}
                      className="flex h-14 w-14 items-center justify-center rounded-full bg-red-500 text-white shadow-lg shadow-red-500/30 transition-transform hover:scale-105 active:scale-95"
                      type="button"
                      title="End call"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-1 items-center justify-center rounded-[28px] border border-white/10 bg-slate-900 p-6 shadow-2xl shadow-black/40">
                <div className="flex min-h-72 flex-col items-center justify-center gap-4 text-center">
                  <div className="flex h-28 w-28 items-center justify-center rounded-[28px] bg-linear-to-br from-indigo-500 to-cyan-500 text-4xl font-bold text-white shadow-lg shadow-cyan-500/20">
                    {getInitial(peerName)}
                  </div>
                  <div>
                    <p className="text-xl font-semibold text-white">{peerName}</p>
                    <p className="mt-1 text-sm text-slate-400">Microphone is live</p>
                  </div>
                  <div className="mt-4 flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-4 py-3">
                    <button
                      onClick={toggleMic}
                      className="flex h-11 w-11 items-center justify-center rounded-full bg-white/5 text-white transition-colors hover:bg-white/10"
                      type="button"
                      title={isMicMuted ? "Bật mic" : "Tắt mic"}
                    >
                      {isMicMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                    </button>
                    <button
                      onClick={endCall}
                      className="flex h-13 w-13 items-center justify-center rounded-full bg-red-500 text-white shadow-lg shadow-red-500/30 transition-transform hover:scale-105 active:scale-95"
                      type="button"
                      title="End call"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return null;
}

export function useCall() {
  return useCallSession();
}