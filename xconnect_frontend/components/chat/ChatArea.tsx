"use client";

import { useState, useRef, useEffect } from "react";
import { useSocket } from "@/hooks/useSocket";
import { useChatStore } from "@/store/chat.store";
import { useAuthStore } from "@/store/auth.store";
import { api } from "@/libs/api";
import { Phone, Video, MoreVertical, PlusCircle, Smile, Send, MessageSquare, Loader2, Forward, Users } from "lucide-react";
import { Message } from "@/types";
import ShareModal from "./ShareModal";
import DOMPurify from "isomorphic-dompurify";
import EmojiPicker from "emoji-picker-react";
import { useTheme } from "next-themes";
import FriendRequestBanner from "./FriendRequestBanner";
import { toast } from "sonner";
import { useCall } from "@/components/call";
import GroupManageModal from "./GroupManageModal";

export default function ChatArea() {
  const { activeRoomId, messagesByRoom, addMessage, conversations, typingUsers, onlineUsers } = useChatStore();
  const { user } = useAuthStore();
  const { socket } = useSocket();
  const { resolvedTheme } = useTheme();
  const { startAudioCall, startVideoCall, isBusy } = useCall();

  const [inputText, setInputText] = useState("");
  const [shareMsg, setShareMsg] = useState<any>(null);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [pendingImage, setPendingImage] = useState<{ name: string; dataUrl: string } | null>(null);
  const [showScrollBadge, setShowScrollBadge] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [showGroupManage, setShowGroupManage] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const shouldStickToBottomRef = useRef(true);

  const room = activeRoomId ? messagesByRoom[activeRoomId] : null;
  const messages = room?.messages || [];

  const activeConv = (conversations as any[]).find((c: any) => c.id === activeRoomId);
  const isGroupConversation = activeConv?.kind === "group";
  const otherParticipant = activeConv?.participants?.find((p: any) => p.id !== user?.id);
  const chatTitle = isGroupConversation
    ? activeConv?.name || `Group (${activeConv?.participants?.length || 0})`
    : otherParticipant?.name || otherParticipant?.email || "Chat";

  const handleStartAudioCall = () => {
    if (!otherParticipant) return;
    startAudioCall(otherParticipant);
  };

  const handleStartVideoCall = () => {
    if (!otherParticipant) return;
    startVideoCall(otherParticipant);
  };

  const scrollToBottom = (behavior: "smooth" | "auto" = "auto") => {
    messagesEndRef.current?.scrollIntoView({ behavior });
    setShowScrollBadge(false);
  };

  const isImageMessage = (msg: Message) => msg.type === "image" || msg.content.startsWith("data:image/");

  useEffect(() => {
    if (!activeRoomId) return;
    if (messagesByRoom[activeRoomId]?.messages?.length > 0) return;

    const load = async () => {
      setLoadingHistory(true);
      try {
        const msgs = await api.get<any[]>(`/chat/conversations/${activeRoomId}/messages`);
        msgs.forEach((m) => {
          const content = m.content || "";
          addMessage({
            id: m.id,
            content,
            type: typeof content === "string" && content.startsWith("data:image/") ? "image" : "text",
            senderId: m.senderId,
            roomId: activeRoomId,
            createdAt: new Date(m.createdAt).getTime(),
            status: "sent",
          });
        });
      } catch (e) {
        console.error("Failed to load messages:", e);
      } finally {
        setLoadingHistory(false);
      }
    };

    load();
  }, [activeRoomId, messagesByRoom, addMessage]);

  useEffect(() => {
    if (!activeRoomId || !socket) return;
    socket.emit("joinRoom", { conversationId: activeRoomId! });
  }, [activeRoomId, socket]);

  useEffect(() => {
    if (!activeRoomId) return;
    const raf = requestAnimationFrame(() => scrollToBottom("auto"));
    return () => cancelAnimationFrame(raf);
  }, [activeRoomId, loadingHistory]);

  useEffect(() => {
    if (!scrollContainerRef.current) return;
    if (loadingHistory) return;

    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 150;
    if (isNearBottom || shouldStickToBottomRef.current) scrollToBottom();
    else setShowScrollBadge(true);
  }, [messages.length, loadingHistory]);

  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
    shouldStickToBottomRef.current = isNearBottom;
    if (isNearBottom && showScrollBadge) setShowScrollBadge(false);
  };

  useEffect(() => {
    if (!activeRoomId || !socket || !inputText.trim()) {
      if (isTyping) {
        console.log("Emitting stopTyping (empty or inactive)");
        socket?.emit("stopTyping", { conversationId: activeRoomId! });
        setIsTyping(false);
      }
      return;
    }

    if (!isTyping) {
      console.log("Emitting typing for room:", activeRoomId);
      setIsTyping(true);
      socket.emit("typing", { conversationId: activeRoomId! });
    }

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    typingTimeoutRef.current = setTimeout(() => {
      console.log("Emitting stopTyping (timeout)");
      socket.emit("stopTyping", { conversationId: activeRoomId! });
      setIsTyping(false);
    }, 2000);

    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, [inputText, activeRoomId, socket]);

  const handleEmojiClick = (emojiData: { emoji: string }) => {
    setInputText((current) => current + emojiData.emoji);
    setShowEmojiPicker(false);
  };

  const handlePickImage = (file?: File) => {
    if (!file || !file.type.startsWith("image/")) return;

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = typeof reader.result === "string" ? reader.result : "";
      if (dataUrl) {
        setPendingImage({ name: file.name, dataUrl });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSend = () => {
    const hasText = inputText.trim().length > 0;
    const hasImage = !!pendingImage;
    if ((!hasText && !hasImage) || !activeRoomId || !user) return;

    const tempId = "temp-" + Date.now();
    const messageType = hasImage ? "image" : "text";
    const content = hasImage ? pendingImage!.dataUrl : inputText.trim();

    const optimisticMessage: Message = {
      id: tempId,
      content,
      type: messageType,
      senderId: user.id || "1",
      roomId: activeRoomId,
      createdAt: Date.now(),
      status: "sending",
    };

    addMessage(optimisticMessage);

    if (socket) {
      socket.emit("sendMessage", {
        conversationId: activeRoomId!,
        content,
        type: messageType,
        tempId,
      });
    }

    setInputText("");
    setPendingImage(null);
    setShowEmojiPicker(false);
    scrollToBottom("smooth");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const isOtherOnline = otherParticipant && onlineUsers.includes(otherParticipant.id);

  if (!activeRoomId) {
    return (
      <section className="flex-1 flex flex-col items-center justify-center bg-slate-100 dark:bg-slate-950 h-full relative">
        <div className="w-70 h-70 bg-surface-container-high rounded-full flex items-center justify-center mb-4">
          <MessageSquare className="w-30 h-30 text-on-surface-variant" />
        </div>
      </section>
    );
  }

  return (
    <section className="flex-1 flex flex-col bg-slate-50 dark:bg-slate-950 relative h-full">
      <header className="sticky top-0 w-full z-10 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md flex justify-between items-center px-6 py-3 border-b border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-linear-to-tr from-indigo-500 to-primary text-white flex items-center justify-center font-bold">
                {chatTitle[0]?.toUpperCase() || "?"}
              </div>
              <span className={`absolute bottom-0 right-0 w-3 h-3 border-2 border-white dark:border-slate-950 rounded-full ${isOtherOnline ? "bg-emerald-500" : "bg-slate-400"}`} />
            </div>
            <div>

          <GroupManageModal
            isOpen={showGroupManage && isGroupConversation}
            conversation={activeConv || null}
            onClose={() => setShowGroupManage(false)}
          />
              <h2 className="font-sans text-lg font-semibold leading-tight text-on-surface text-slate-700 dark:text-slate-200">{chatTitle}</h2>
              <p className={`text-xs font-medium ${isOtherOnline ? "text-emerald-600" : "text-slate-400"}`}>
                {isGroupConversation ? `${activeConv?.participants?.length || 0} members` : isOtherOnline ? "Active now" : "Offline"}
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {!isGroupConversation && (
            <>
              <button
                onClick={handleStartVideoCall}
                disabled={!otherParticipant || isBusy}
                className="hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full p-2 transition-opacity text-slate-600 dark:text-slate-400 disabled:opacity-40 disabled:hover:bg-transparent"
                title="Video call"
              >
                <Video className="w-5 h-5 fill-current" />
              </button>
              <button
                onClick={handleStartAudioCall}
                disabled={!otherParticipant || isBusy}
                className="hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full p-2 transition-opacity text-slate-600 dark:text-slate-400 disabled:opacity-40 disabled:hover:bg-transparent"
                title="Audio call"
              >
                <Phone className="w-5 h-5 fill-current" />
              </button>
            </>
          )}
          <button
            onClick={() => isGroupConversation && setShowGroupManage(true)}
            className="hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full p-2 transition-opacity text-slate-600 dark:text-slate-400"
            title={isGroupConversation ? "Manage group" : "More"}
          >
            <MoreVertical className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Friend Request Banner (Sticky) */}
      {otherParticipant && !(user?.friendIds || []).includes(otherParticipant.id) && (
        <div className="sticky top-0 z-20">
          <FriendRequestBanner
            receiverId={otherParticipant.id}
            onSendRequest={() => toast.success("Đã gửi lời mời kết bạn!")}
          />
        </div>
      )}

      {isGroupConversation && (
        <div className="px-6 pt-4">
          <button
            type="button"
            onClick={() => setShowGroupManage(true)}
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-300 transition-colors hover:bg-white/10"
          >
            <Users className="h-4 w-4" />
            Manage group
          </button>
        </div>
      )}

      <div ref={scrollContainerRef} onScroll={handleScroll} className="flex-1 overflow-y-auto p-6 space-y-6 scroll-smooth">

        <div className="flex justify-center">
          <span className="px-3 py-1 bg-surface-container-high rounded-full text-[10px] font-semibold text-outline tracking-wider uppercase">
            Today
          </span>
        </div>

        {loadingHistory ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center text-outline text-sm py-8">No messages yet. Say hello! 👋</div>
        ) : (
          messages.map((msg) => {
            const isMine = msg.senderId === user?.id;
            const isImage = isImageMessage(msg);
            return (
              <div key={msg.id} className={`flex items-end gap-3 max-w-[80%] ${isMine ? "ml-auto flex-row-reverse" : ""}`}>
                <div className="w-8 h-8 rounded-lg bg-slate-200 dark:bg-slate-700 flex items-center justify-center shrink-0 text-xs font-bold text-slate-600 dark:text-slate-300">
                  {isMine ? user?.name?.[0]?.toUpperCase() || "U" : chatTitle[0]?.toUpperCase() || "?"}
                </div>
                <div className={`space-y-1 items-end flex flex-col ${!isMine && "items-start"}`}>
                  <div
                    className={`relative group ${isImage
                      ? ""
                      : isMine
                        ? "p-4 text-sm leading-relaxed bg-linear-to-br from-primary to-primary-container text-white rounded-xl rounded-br-sm shadow-md shadow-primary/10"
                        : "p-4 text-sm leading-relaxed bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-xl rounded-bl-sm"
                      }`}
                  >
                    {isImage ? (
                      <img
                        src={msg.content}
                        alt="Uploaded image"
                        className="max-w-70 max-h-72 rounded-none border-0 ring-0 shadow-none object-cover"
                        onLoad={() => {
                          if (shouldStickToBottomRef.current) {
                            scrollToBottom("auto");
                          }
                        }}
                      />
                    ) : (
                      <div
                        dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(msg.content) }}
                        className="wrap-break-word text-inherit"
                      />
                    )}
                    <button
                      onClick={() => setShareMsg(msg)}
                      className={`absolute top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-full bg-surface-container-high text-on-surface-variant hover:text-primary ${isMine ? "-left-10" : "-right-10"
                        }`}
                      title="Share Message"
                    >
                      <Forward className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex items-center gap-1">
                    <p className="text-[11px] text-slate-600 dark:text-slate-300 px-1">
                      {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </p>
                    {isMine && (
                      <span className="text-[11px] text-slate-600 dark:text-slate-300 px-1">
                        {msg.status === "sending" ? "..." : msg.status === "sent" ? "Sent" : "Read"}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
        
        {/* Typing Indicator */}
        {activeRoomId && (typingUsers[activeRoomId] || []).filter(id => id !== user?.id).length > 0 && (
          <div className="flex items-center gap-2 px-1 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex gap-1 p-2 bg-slate-200/50 dark:bg-slate-800/50 rounded-2xl rounded-bl-none">
              <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
              <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
              <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" />
            </div>
            <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 italic">
              {chatTitle} is typing...
            </span>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {showScrollBadge && (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-20">
          <button
            onClick={() => scrollToBottom("smooth")}
            className="flex items-center gap-2 bg-primary text-white text-xs font-medium px-4 py-2 rounded-full shadow-lg hover:scale-105 active:scale-95 transition-all"
          >
            New Messages ↓
          </button>
        </div>
      )}

      <div className="p-6 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
        <div className="relative">
          {showEmojiPicker && (
            <div className="absolute bottom-full left-0 mb-3 z-30 shadow-2xl rounded-2xl overflow-hidden border border-outline-variant/10">
              <EmojiPicker
                onEmojiClick={handleEmojiClick as any}
                theme={(resolvedTheme === "dark" ? "dark" : "light") as any}
                width={360}
                height={420}
                searchDisabled={false}
                lazyLoadEmojis
              />
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              handlePickImage(e.target.files?.[0]);
              e.currentTarget.value = "";
            }}
          />

          {pendingImage && (
            <div className="mb-3 inline-flex items-center gap-3 rounded-2xl border border-outline-variant/10 bg-surface-container-low px-3 py-2">
              <img src={pendingImage.dataUrl} alt={pendingImage.name} className="h-14 w-14 rounded-none border-0 ring-0 shadow-none object-cover" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-on-surface truncate">{pendingImage.name}</p>
                <p className="text-xs text-outline">Ready to send as image</p>
              </div>
              <button
                onClick={() => setPendingImage(null)}
                className="ml-2 rounded-full px-3 py-1 text-xs font-semibold text-outline hover:bg-surface-container-high"
              >
                Remove
              </button>
            </div>
          )}

          <div className="bg-slate-100 dark:bg-slate-800 rounded-2xl p-3 flex items-center gap-3 shadow-sm border border-slate-300 dark:border-slate-700">
            <div className="flex items-center">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="p-2 text-outline hover:scale-105 active:scale-95 transition-colors"
                title="Upload image"
              >
                <PlusCircle className="w-5 h-5" />
              </button>
              <button
                onClick={() => setShowEmojiPicker((current) => !current)}
                className="p-2 text-outline hover:scale-105 active:scale-95 transition-colors"
                title="Emoji"
              >
                <Smile className="w-5 h-5" />
              </button>
            </div>
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1 bg-transparent border-none focus:ring-0 text-base resize-none max-h-36 placeholder:text-slate-500 dark:placeholder:text-slate-400 outline-none text-slate-900 dark:text-slate-100"
              placeholder="Type a message..."
              rows={1}
            />
            <button
              onClick={handleSend}
              disabled={!inputText.trim() && !pendingImage}
              className="p-3 bg-blue-500 text-white rounded-xl hover:scale-105 active:scale-95 transition-transform flex items-center justify-center shadow-lg shadow-primary/20 disabled:opacity-50 disabled:hover:scale-100"
            >
              <Send className="w-5 h-5 fill-current" />
            </button>
          </div>
        </div>
      </div>

      <ShareModal isOpen={!!shareMsg} onClose={() => setShareMsg(null)} messageToShare={shareMsg} />
    </section>
  );
}
