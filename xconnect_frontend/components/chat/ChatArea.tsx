"use client";

import { useState, useRef, useEffect } from "react";
import { useSocket } from "@/hooks/useSocket";
import { useChatStore } from "@/store/chat.store";
import { useAuthStore } from "@/store/auth.store";
import { Phone, Video, MoreVertical, PlusCircle, Smile, Send, MessageSquare } from "lucide-react";
import { Message } from "@/types";
import ShareModal from "./ShareModal";
import DOMPurify from "isomorphic-dompurify";

export default function ChatArea() {
  const { activeRoomId, messagesByRoom, addMessage } = useChatStore();
  const { user } = useAuthStore();
  const { socket } = useSocket();
  const [inputText, setInputText] = useState("");
  const [shareMsg, setShareMsg] = useState<any>(null);

  // UX Features
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showScrollBadge, setShowScrollBadge] = useState(false);

  const room = activeRoomId ? messagesByRoom[activeRoomId] : null;
  const messages = room?.messages || [];

  // Scroll logic
  const scrollToBottom = (behavior: "smooth" | "auto" = "auto") => {
    messagesEndRef.current?.scrollIntoView({ behavior });
    setShowScrollBadge(false);
  };

  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;

    // If not near bottom, we consider user is reading history
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;

    if (isNearBottom && showScrollBadge) {
      setShowScrollBadge(false);
    }
  };

  // Auto-scroll effect based on new messages
  useEffect(() => {
    if (!scrollContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 150;

    if (isNearBottom) {
      scrollToBottom();
    } else {
      setShowScrollBadge(true);
    }
  }, [messages.length]);

  const handleSend = () => {
    if (!inputText.trim() || !activeRoomId || !user) return;

    const tempId = "temp-" + Date.now();
    const mockMessage: Message = {
      id: tempId,
      content: inputText,
      type: "text",
      senderId: user.id || "1",
      roomId: activeRoomId,
      createdAt: Date.now(),
      status: "sending"
    };

    // Optimistic Update
    addMessage(mockMessage);

    // Emit through socket
    if (socket) {
      socket.emit("sendMessage", {
        conversationId: activeRoomId,
        content: inputText,
        type: "text",
        tempId: tempId
      });
    }

    setInputText("");
    scrollToBottom("smooth"); // Always slam bottom on our own send
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!activeRoomId) {
    return (
      <section className="flex-1 flex flex-col items-center justify-center bg-surface relative">
        <div className="w-20 h-20 bg-surface-container-high rounded-full flex items-center justify-center mb-4">
          <MessageSquare className="w-8 h-8 text-on-surface-variant" />
        </div>
        <h2 className="text-xl font-bold font-sans">No chat selected</h2>
        <p className="text-on-surface-variant text-sm mt-2">Select a conversation from the sidebar to start chatting</p>
      </section>
    );
  }

  return (
    <section className="flex-1 flex flex-col bg-surface relative h-screen">
      {/* TopAppBar */}
      <header className="sticky top-0 w-full z-10 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md flex justify-between items-center px-6 py-3 border-b border-slate-100/50 dark:border-slate-800/50 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-500 to-primary text-white flex items-center justify-center font-bold">
                E
              </div>
              <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white dark:border-slate-950 rounded-full"></span>
            </div>
            <div>
              <h2 className="font-sans text-lg font-semibold leading-tight text-on-surface">Elena Vance</h2>
              <p className="text-xs text-emerald-600 font-medium">Active now</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button className="hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full p-2 transition-opacity text-slate-600 dark:text-slate-400">
            <Video className="w-5 h-5 fill-current" />
          </button>
          <button className="hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full p-2 transition-opacity text-slate-600 dark:text-slate-400">
            <Phone className="w-5 h-5 fill-current" />
          </button>
          <button className="hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full p-2 transition-opacity text-slate-600 dark:text-slate-400">
            <MoreVertical className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Message History */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-6 space-y-6 scroll-smooth"
      >
        <div className="flex justify-center">
          <span className="px-3 py-1 bg-surface-container-high rounded-full text-[10px] font-semibold text-outline tracking-wider uppercase">
            Today
          </span>
        </div>

        {messages.map((msg) => {
          const isMine = msg.senderId === user?.id;
          return (
            <div key={msg.id} className={`flex items-end gap-3 max-w-[80%] ${isMine ? "ml-auto flex-row-reverse" : ""}`}>
              <div className="w-8 h-8 rounded-lg bg-slate-200 flex items-center justify-center flex-shrink-0 text-xs font-bold">
                {isMine ? "U" : "E"}
              </div>
              <div className={`space-y-1 items-end flex flex-col ${!isMine && "items-start"}`}>
                <div className={`p-4 text-sm leading-relaxed relative group ${isMine
                    ? "bg-gradient-to-br from-primary to-primary-container text-white rounded-xl rounded-br-sm shadow-md shadow-primary/10"
                    : "bg-surface-container-highest text-on-surface rounded-xl rounded-bl-sm"
                  }`}>
                  <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(msg.content) }} className="break-words" />
                  <button
                    onClick={() => setShareMsg(msg)}
                    className={`absolute top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-full bg-surface-container-high text-on-surface-variant hover:text-primary ${isMine ? "-left-10" : "-right-10"}`}
                    title="Share Message"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex items-center gap-1">
                  <p className="text-[10px] text-outline px-1">
                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                  {isMine && (
                    <span className="text-[10px] text-outline px-1">
                      {msg.status === "sending" ? "..." : msg.status === "sent" ? "Sent" : "Read"}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
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

      {/* Message Input */}
      <div className="p-6 bg-surface">
        <div className="bg-surface-container-low rounded-2xl p-2 flex items-end gap-2 shadow-sm border border-outline-variant/10">
          <div className="flex items-center">
            <button className="p-2 text-outline hover:bg-surface-container-high rounded-xl transition-colors">
              <PlusCircle className="w-5 h-5" />
            </button>
            <button className="p-2 text-outline hover:bg-surface-container-high rounded-xl transition-colors">
              <Smile className="w-5 h-5" />
            </button>
          </div>
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent border-none focus:ring-0 text-sm py-2.5 px-1 resize-none max-h-32 placeholder:text-outline/60 outline-none text-foreground"
            placeholder="Type a message..."
            rows={1}
          />
          <button
            onClick={handleSend}
            disabled={!inputText.trim()}
            className="p-3 bg-primary text-white rounded-xl hover:scale-105 active:scale-95 transition-transform flex items-center justify-center shadow-lg shadow-primary/20 disabled:opacity-50 disabled:hover:scale-100"
          >
            <Send className="w-5 h-5 fill-current" />
          </button>
        </div>
        <p className="text-center text-[10px] text-outline mt-3 font-medium">Shift + Enter to add a new line</p>
      </div>

      <ShareModal isOpen={!!shareMsg} onClose={() => setShareMsg(null)} messageToShare={shareMsg} />
    </section>
  );
}
