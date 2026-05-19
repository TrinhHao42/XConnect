"use client";

import { useState, useRef, useEffect } from "react";
import { useSocket } from "@/hooks/useSocket";
import { useChatStore } from "@/store/chat.store";
import { useAuthStore } from "@/store/auth.store";
import { api } from "@/libs/api";
import { Phone, Video, MoreVertical, PlusCircle, Smile, Send, MessageSquare, Loader2, Forward, Users, ArrowLeft, X, Image as ImageIcon, Paperclip, FileText, ChevronDown, ChevronUp, ChevronRight, Quote, Pin, Star, ListTodo, Info, Clock, FolderArchive, Trash2, Copy, MoreHorizontal, Undo2 } from "lucide-react";
import { Message } from "@/types";
import ShareModal from "./ShareModal";
import DOMPurify from "isomorphic-dompurify";
import EmojiPicker from "emoji-picker-react";
import { useTheme } from "next-themes";
import FriendRequestBanner from "./FriendRequestBanner";
import { toast } from "sonner";
import { useCall } from "@/components/call";
import RightSidebar from "./RightSidebar";
import { useLanguageStore } from "@/store/language.store";

const translations = {
  en: {
    today: "Today",
    noMessagesSayHello: "No messages yet. Say hello! 👋",
    isTyping: "is typing...",
    newMessages: "New Messages ↓",
    readyToSendAsImage: "Ready to send as image",
    remove: "Remove",
    typeAMessage: "Type a message...",
    members: "members",
    activeNow: "Active now",
    offline: "Offline",
    sent: "Sent",
    read: "Read",
    sending: "...",
    group: "Group"
  },
  vi: {
    today: "Hôm nay",
    noMessagesSayHello: "Chưa có tin nhắn. Gửi lời chào nào! 👋",
    isTyping: "đang soạn tin...",
    newMessages: "Tin nhắn mới ↓",
    readyToSendAsImage: "Sẵn sàng gửi hình ảnh",
    remove: "Xóa",
    typeAMessage: "Nhập tin nhắn...",
    members: "thành viên",
    activeNow: "Đang hoạt động",
    offline: "Ngoại tuyến",
    sent: "Đã gửi",
    read: "Đã xem",
    sending: "...",
    group: "Nhóm"
  }
};

interface ChatAreaProps {
  onBack?: () => void;
}

export default function ChatArea({ onBack }: ChatAreaProps) {
  const { activeRoomId, messagesByRoom, addMessage, conversations, typingUsers, onlineUsers, deleteMessage } = useChatStore();
  const { user } = useAuthStore();
  const { socket } = useSocket();
  const { resolvedTheme } = useTheme();
  const { startAudioCall, startVideoCall, isBusy } = useCall();
  const { language } = useLanguageStore();
  const t = translations[language];

  const [inputText, setInputText] = useState("");
  const [shareMsg, setShareMsg] = useState<any>(null);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [pendingImage, setPendingImage] = useState<{ name: string; file: File; previewUrl: string } | null>(null);
  const [pendingFile, setPendingFile] = useState<{ name: string; size: number; file: File } | null>(null);
  const [showScrollBadge, setShowScrollBadge] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [showRightSidebar, setShowRightSidebar] = useState(true);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [pinnedMessages, setPinnedMessages] = useState<Message[]>([]);
  const [showPinsOverlay, setShowPinsOverlay] = useState(false);
  const [activeMenuMsg, setActiveMenuMsg] = useState<Message | null>(null);
  const [menuCoords, setMenuCoords] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [showSubMenu, setShowSubMenu] = useState(false);
  const [replyingMessage, setReplyingMessage] = useState<Message | null>(null);
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);

  useEffect(() => {
    if (!activeRoomId) return;
    const stored = localStorage.getItem(`pinned_msgs_${activeRoomId}`);
    if (stored) {
      try {
        setPinnedMessages(JSON.parse(stored));
      } catch {
        setPinnedMessages([]);
      }
    } else {
      setPinnedMessages([]);
    }
    setShowPinsOverlay(false);
  }, [activeRoomId]);

  const persistPinnedMessages = (msgs: Message[]) => {
    setPinnedMessages(msgs);
    if (activeRoomId) {
      localStorage.setItem(`pinned_msgs_${activeRoomId}`, JSON.stringify(msgs));
    }
  };

  const handlePinMessage = (msg: Message) => {
    if (pinnedMessages.some(p => p.id === msg.id)) {
      toast.info(language === "vi" ? "Tin nhắn đã được ghim từ trước" : "Message already pinned");
      return;
    }
    const newPins = [...pinnedMessages, msg];
    persistPinnedMessages(newPins);
    toast.success(language === "vi" ? "Đã ghim tin nhắn thành công!" : "Message pinned successfully!");
  };

  const handleUnpinMessage = (msgId: string) => {
    const newPins = pinnedMessages.filter(p => p.id !== msgId);
    persistPinnedMessages(newPins);
    toast.success(language === "vi" ? "Đã bỏ ghim tin nhắn thành công!" : "Message unpinned successfully!");
  };

  const handleOpenMoreMenu = (e: React.MouseEvent, msg: Message) => {
    e.preventDefault();
    e.stopPropagation();
    setActiveMenuMsg(msg);
    setMenuCoords({ x: e.clientX, y: e.clientY });
    setShowSubMenu(false);
  };

  const handleReplyMessage = (msg: Message) => {
    setReplyingMessage(msg);
  };

  const getCleanPreviewContent = (msg: Message) => {
    if (!msg.content) return "";
    if (msg.content.startsWith("data:image/") || msg.content.startsWith("uploading-image:")) {
      return `[${language === "vi" ? "Hình ảnh" : "Image"}]`;
    }
    if (msg.content.startsWith("file:") || msg.content.startsWith("uploading-file:")) {
      const parts = msg.content.split("|");
      const name = parts[0].startsWith("file:") 
        ? parts[0].substring(5) 
        : parts[1];
      return `[${language === "vi" ? "Tài liệu" : "Document"}] ${name}`;
    }
    if (msg.content.includes("</blockquote>")) {
      const idx = msg.content.indexOf("</blockquote>");
      return msg.content.substring(idx + 13).trim();
    }
    return msg.content;
  };

  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);
  const shouldStickToBottomRef = useRef(true);

  const room = activeRoomId ? messagesByRoom[activeRoomId] : null;
  const messages = room?.messages || [];

  const activeConv = (conversations as any[]).find((c: any) => c.id === activeRoomId);
  const isGroupConversation = activeConv?.kind === "group";
  const otherParticipant = activeConv?.participants?.find((p: any) => p.id !== user?.id);
  const chatTitle = isGroupConversation
    ? activeConv?.name || `${t.group} (${activeConv?.participants?.length || 0})`
    : otherParticipant
      ? otherParticipant.name || otherParticipant.email || "Chat"
      : "My Document";

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

  const handleScrollToMessage = (messageId: string) => {
    const element = document.getElementById(`msg-${messageId}`);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "center" });
      setHighlightedMessageId(messageId);
      setTimeout(() => {
        setHighlightedMessageId(null);
      }, 1500);
    } else {
      toast.error(language === "vi" ? "Tin nhắn đã quá cũ hoặc không tìm thấy trong lịch sử" : "Message is too old or not found in history");
    }
  };

  const handleMessageBubbleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    const blockquote = target.closest("blockquote");
    if (blockquote) {
      const replyId = blockquote.getAttribute("data-reply-id");
      if (replyId) {
        handleScrollToMessage(replyId);
      }
    }
  };

  const isImageMessage = (msg: Message) => 
    msg.type === "image" || 
    msg.content.startsWith("data:image/") || 
    msg.content.startsWith("uploading-image:");

  const isFileMessage = (msg: Message) => 
    msg.type === "file" || 
    (typeof msg.content === "string" && (msg.content.startsWith("file:") || msg.content.startsWith("uploading-file:")));

  const parseFileMessage = (content: string) => {
    const parts = content.split("|");
    const name = parts[0].substring(5); // remove 'file:'
    const size = parseInt(parts[1], 10) || 0;
    const dataUrl = parts.slice(2).join("|");
    return { name, size, dataUrl };
  };

  const parseUploadingImage = (content: string) => {
    const parts = content.split("|");
    const tempId = parts[0].substring(16); // remove 'uploading-image:'
    const localUrl = parts.slice(1).join("|");
    return { tempId, localUrl };
  };

  const parseUploadingFile = (content: string) => {
    const parts = content.split("|");
    const tempId = parts[0].substring(15); // remove 'uploading-file:'
    const name = parts[1];
    const size = parseInt(parts[2], 10) || 0;
    return { tempId, name, size };
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

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
            type: typeof content === "string" && content.startsWith("data:image/") 
              ? "image" 
              : typeof content === "string" && content.startsWith("file:") 
                ? "file" 
                : "text",
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
    const previewUrl = URL.createObjectURL(file);
    setPendingImage({ name: file.name, file, previewUrl });
  };

  const handlePickFile = (file?: File) => {
    if (!file) return;
    setPendingFile({ name: file.name, size: file.size, file });
  };

  const handleSend = () => {
    const hasText = inputText.trim().length > 0;
    const hasImage = !!pendingImage;
    const hasFile = !!pendingFile;
    if ((!hasText && !hasImage && !hasFile) || !activeRoomId || !user) return;

    const tempId = "temp-" + Date.now();
    const messageType = hasImage ? "image" : hasFile ? "file" : "text";
    
    let content = "";
    let fileToUpload: File | null = null;
    let localPreviewUrl = "";

    if (hasImage) {
      fileToUpload = pendingImage!.file;
      localPreviewUrl = pendingImage!.previewUrl;
      content = `uploading-image:${tempId}|${localPreviewUrl}`;
    } else if (hasFile) {
      fileToUpload = pendingFile!.file;
      content = `uploading-file:${tempId}|${pendingFile!.name}|${pendingFile!.size}`;
    } else {
      let rawText = inputText.trim();
      if (replyingMessage) {
        const senderName = replyingMessage.senderId === user.id 
          ? (language === "vi" ? "Bạn" : "You")
          : (activeConv?.participants?.find((p: any) => p.id === replyingMessage.senderId)?.name || "User");
        
        const cleanReplyPreview = getCleanPreviewContent(replyingMessage);
        const quoteHtml = `<blockquote data-reply-id="${replyingMessage.id}"><strong>${senderName}:</strong> ${cleanReplyPreview}</blockquote>`;
        content = quoteHtml + rawText;
      } else {
        content = rawText;
      }
    }

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

    // If there is a file/image to upload, start background async read and emit
    if (fileToUpload) {
      const targetRoomId = activeRoomId;
      const targetFile = fileToUpload;
      const isImg = hasImage;

      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = typeof reader.result === "string" ? reader.result : "";
        if (dataUrl && socket) {
          const finalContent = isImg 
            ? dataUrl 
            : `file:${targetFile.name}|${targetFile.size}|${dataUrl}`;
          
          // Locally update message content to hide spinning indicator and render final file card
          useChatStore.getState().updateMessageContent(targetRoomId!, tempId, finalContent);
          
          socket.emit("sendMessage", {
            conversationId: targetRoomId!,
            content: finalContent,
            type: messageType,
            tempId,
          });
        }
      };
      reader.readAsDataURL(targetFile);
    } else {
      // Send text message instantly
      if (socket) {
        socket.emit("sendMessage", {
          conversationId: activeRoomId!,
          content,
          type: messageType,
          tempId,
        });
      }
    }

    setInputText("");
    setPendingImage(null);
    setPendingFile(null);
    setShowEmojiPicker(false);
    setReplyingMessage(null);
    scrollToBottom("smooth");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const isOtherOnline = !otherParticipant || (otherParticipant && onlineUsers.includes(otherParticipant.id));

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
    <div className="flex-1 flex h-full overflow-hidden relative">
      <section className="flex-1 flex flex-col bg-slate-50 dark:bg-slate-950 relative h-full overflow-hidden border-r border-slate-200 dark:border-slate-800">
        <header className="sticky top-0 w-full z-10 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md flex justify-between items-center px-6 py-3 border-b border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-4">
            {/* Nút Back - chỉ hiện trên mobile */}
            {onBack && (
              <button
                onClick={onBack}
                className="md:hidden p-2 -ml-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition-colors"
                title="Back"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 rounded-full bg-linear-to-tr from-indigo-500 to-blue-600 text-white flex items-center justify-center font-bold overflow-hidden">
                  {!isGroupConversation && (otherParticipant?.avatar || !otherParticipant) ? (
                    <img src={otherParticipant?.avatar || "/mydocument.png"} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    chatTitle[0]?.toUpperCase() || "?"
                  )}
                </div>
                <span className={`absolute bottom-0 right-0 w-3 h-3 border-2 border-white dark:border-slate-950 rounded-full ${isOtherOnline ? "bg-emerald-500" : "bg-slate-400"}`} />
              </div>
              <div>
                <h2 className="font-sans text-lg font-semibold leading-tight text-on-surface text-slate-700 dark:text-slate-200">{chatTitle}</h2>
                <p className={`text-xs font-medium ${isOtherOnline ? "text-emerald-600" : "text-slate-400"}`}>
                  {isGroupConversation ? `${activeConv?.participants?.length || 0} ${t.members}` : isOtherOnline ? t.activeNow : t.offline}
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
            {!showRightSidebar && (
              <button
                onClick={() => setShowRightSidebar(true)}
                className="hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full p-2 transition-all text-slate-600 dark:text-slate-400"
                title={isGroupConversation ? "More" : "More"}
              >
                <MoreVertical className="w-5 h-5" />
              </button>
            )}
          </div>
        </header>
                     {/* Pinned Messages Bar */}
        {pinnedMessages.length > 0 && (
          <div className="relative border-b border-slate-200 dark:border-slate-800 bg-blue-50/40 dark:bg-slate-900/60 backdrop-blur-md px-5 py-2 flex items-center justify-between z-20 animate-in slide-in-from-top duration-200">
            <div className="flex items-center gap-2 min-w-0 flex-1 cursor-pointer" onClick={() => handleScrollToMessage(pinnedMessages[pinnedMessages.length - 1].id)}>
              <div className="p-1.5 bg-blue-500/10 dark:bg-blue-500/20 text-blue-500 rounded-md shrink-0">
                <Pin className="w-3.5 h-3.5 rotate-45" />
              </div>
              <div className="min-w-0 flex-1 flex items-center gap-2 text-xs">
                <span className="font-extrabold text-[10px] text-blue-600 bg-blue-500/10 px-1.5 py-0.5 rounded uppercase tracking-wider shrink-0">
                  {language === "vi" ? "Ghim" : "Pin"}
                </span>
                <span className="font-bold text-slate-800 dark:text-slate-200 shrink-0">
                  {(() => {
                    const latestPin = pinnedMessages[pinnedMessages.length - 1];
                    return latestPin.senderId === user?.id 
                      ? (language === "vi" ? "Bạn" : "You") 
                      : (activeConv?.participants?.find((p: any) => p.id === latestPin.senderId)?.name || "User");
                  })()}
                </span>
                <span className="text-slate-400 dark:text-slate-600 shrink-0">:</span>
                <span className="text-slate-600 dark:text-slate-350 truncate max-w-[500px]">
                  {(() => {
                    const latestPin = pinnedMessages[pinnedMessages.length - 1];
                    return getCleanPreviewContent(latestPin);
                  })()}
                </span>
              </div>
            </div>
            
            <div className="flex items-center gap-2 shrink-0 ml-4">
              {pinnedMessages.length > 1 && (
                <button
                  onClick={() => setShowPinsOverlay(!showPinsOverlay)}
                  className="flex items-center gap-1 bg-slate-100/80 dark:bg-slate-800 hover:bg-slate-200/80 dark:hover:bg-slate-700 text-[10px] font-bold text-blue-600 dark:text-blue-450 px-2 py-0.5 rounded-full transition-all"
                >
                  {`+${pinnedMessages.length - 1} ${language === "vi" ? "ghim" : "pins"}`}
                  <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${showPinsOverlay ? "rotate-180" : ""}`} />
                </button>
              )}
              
              <button
                onClick={() => handleUnpinMessage(pinnedMessages[pinnedMessages.length - 1].id)}
                className="p-1 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors"
                title={language === "vi" ? "Bỏ ghim" : "Unpin"}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Pins list dropdown overlay (Figure 4) */}
            {showPinsOverlay && (
              <div className="absolute top-full left-0 right-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-2xl z-30 animate-in fade-in slide-in-from-top-2 duration-200 max-h-[300px] overflow-y-auto">
                <div className="px-5 py-3 flex items-center justify-between border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                  <span className="text-xs font-bold text-slate-855 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
                    <Pin className="w-3.5 h-3.5 text-blue-500 rotate-45" />
                    {language === "vi" ? `Danh sách ghim (${pinnedMessages.length})` : `Pinned List (${pinnedMessages.length})`}
                  </span>
                  <button 
                    onClick={() => setShowPinsOverlay(false)} 
                    className="text-[11px] font-bold text-slate-500 hover:text-blue-500 flex items-center gap-1 transition-colors"
                  >
                    {language === "vi" ? "Thu gọn" : "Collapse"}
                    <ChevronUp className="w-3 h-3" />
                  </button>
                </div>
                
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {[...pinnedMessages].reverse().map((pin) => {
                    const senderName = pin.senderId === user?.id 
                      ? (language === "vi" ? "Bạn" : "You") 
                      : (activeConv?.participants?.find((p: any) => p.id === pin.senderId)?.name || "User");
                    return (
                      <div 
                        key={pin.id} 
                        onClick={() => {
                          handleScrollToMessage(pin.id);
                          setShowPinsOverlay(false);
                        }}
                        className="px-5 py-3 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/40 group transition-colors text-xs cursor-pointer"
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <span className="font-extrabold text-[9px] text-blue-600 bg-blue-500/10 px-1 py-0.5 rounded uppercase tracking-wider shrink-0">
                            {language === "vi" ? "Tin nhắn" : "Msg"}
                          </span>
                          <span className="font-bold text-slate-700 dark:text-slate-300 shrink-0">
                            {senderName}
                          </span>
                          <span className="text-slate-400 dark:text-slate-650 shrink-0">:</span>
                          <span className="text-slate-600 dark:text-slate-400 truncate flex-1 max-w-[500px]">
                            {getCleanPreviewContent(pin)}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-2 shrink-0 ml-4 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => { e.stopPropagation(); handleUnpinMessage(pin.id); }}
                            className="text-[10px] font-bold text-red-500 hover:text-red-600 px-2 py-1 rounded transition-colors"
                          >
                            {language === "vi" ? "Gỡ ghim" : "Unpin"}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
                
                <div className="px-5 py-2.5 bg-slate-50 dark:bg-slate-900/50 flex justify-center border-t border-slate-100 dark:border-slate-800">
                  <button
                    onClick={() => {
                      setShowPinsOverlay(false);
                      setShowRightSidebar(true);
                    }}
                    className="text-[11px] font-bold text-blue-500 hover:text-blue-600 flex items-center gap-1 transition-colors"
                  >
                    {language === "vi" ? "Xem tất cả ở bảng tin nhóm >" : "View all in bulletin board >"}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Friend Request Banner (Sticky) */}
        {otherParticipant && !(user?.friendIds || []).includes(otherParticipant.id) && (
          <div className="sticky top-0 z-20">
            <FriendRequestBanner
              receiverId={otherParticipant.id}
              onSendRequest={() => { }}
            />
          </div>
        )}
        <div ref={scrollContainerRef} onScroll={handleScroll} className="flex-1 overflow-y-auto p-6 space-y-6 scroll-smooth">

          <div className="flex justify-center">
            <span className="px-3 py-1 bg-surface-container-high rounded-full text-[10px] font-semibold text-outline tracking-wider uppercase">
              {t.today}
            </span>
          </div>

          {loadingHistory ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center text-outline text-sm py-8">{t.noMessagesSayHello}</div>
          ) : (
            messages.map((msg) => {
              const isMine = msg.senderId === user?.id;
              const isImage = isImageMessage(msg);
              const sender = activeConv?.participants?.find((p: any) => p.id === msg.senderId);
              const senderAvatar = isMine ? user?.avatar : sender?.avatar;
              const senderInitial = isMine ? (user?.name?.[0]?.toUpperCase() || "U") : (sender?.name?.[0]?.toUpperCase() || "?");
              return (
                <div id={`msg-${msg.id}`} key={msg.id} className={`flex items-end gap-3 max-w-[80%] ${isMine ? "ml-auto flex-row-reverse" : ""}`}>
                  <div className="w-8 h-8 rounded-lg bg-slate-200 dark:bg-slate-700 flex items-center justify-center shrink-0 text-xs font-bold text-slate-600 dark:text-slate-300 overflow-hidden">
                    {senderAvatar ? (
                      <img src={senderAvatar} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      senderInitial
                    )}
                  </div>
                  <div className={`space-y-1 items-end flex flex-col ${!isMine && "items-start"}`}>
                    <div
                      className={`relative group transition-all duration-500 ${
                        highlightedMessageId === msg.id
                          ? "ring-4 ring-blue-500/60 dark:ring-blue-450/60 scale-[1.03] shadow-2xl z-10"
                          : ""
                      } ${isImage || isFileMessage(msg)
                        ? ""
                        : isMine
                          ? "p-4 text-sm leading-relaxed bg-linear-to-br from-blue-500 to-blue-600 text-white rounded-xl rounded-br-sm shadow-md shadow-blue-500/20"
                          : "p-4 text-sm leading-relaxed bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-xl rounded-bl-sm"
                        }`}
                    >
                      {isImage ? (
                        (() => {
                          const isUploading = msg.content.startsWith("uploading-image:");
                          if (isUploading) {
                            const { localUrl } = parseUploadingImage(msg.content);
                            return (
                              <div className="relative overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700 max-w-70 max-h-72">
                                <img
                                  src={localUrl}
                                  alt="Uploading image"
                                  className="w-full h-full object-cover filter blur-[2px]"
                                />
                                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 gap-2">
                                  <Loader2 className="w-8 h-8 text-white animate-spin" />
                                  <span className="text-xs font-semibold text-white/90">Đang gửi...</span>
                                </div>
                              </div>
                            );
                          }
                          return (
                            <button
                              type="button"
                              onClick={() => setPreviewImageUrl(msg.content)}
                              className="block cursor-pointer overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700 hover:scale-[1.02] active:scale-[0.98] transition-transform duration-200"
                              title="Bấm để xem ảnh lớn"
                            >
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
                            </button>
                          );
                        })()
                      ) : isFileMessage(msg) ? (
                        (() => {
                          const isUploading = msg.content.startsWith("uploading-file:");
                          if (isUploading) {
                            const { name, size } = parseUploadingFile(msg.content);
                            return (
                              <div
                                className="flex items-center gap-3 p-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-850 max-w-[280px] shadow-md shadow-slate-100 dark:shadow-none opacity-80"
                                title="Đang gửi tệp tin..."
                              >
                                <div className="p-2.5 bg-blue-500/10 dark:bg-blue-500/20 text-blue-500 rounded-xl shrink-0">
                                  <Loader2 className="w-6 h-6 animate-spin" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="text-sm font-semibold truncate text-slate-800 dark:text-slate-150" title={name}>
                                    {name}
                                  </p>
                                  <p className="text-xs text-blue-500 font-medium mt-0.5 animate-pulse">
                                    {formatFileSize(size)} • Đang gửi...
                                  </p>
                                </div>
                              </div>
                            );
                          }
                          const fileInfo = parseFileMessage(msg.content);
                          return (
                            <a
                              href={fileInfo.dataUrl}
                              download={fileInfo.name}
                              className="flex items-center gap-3 p-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-850 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all max-w-[280px] shadow-md shadow-slate-100 dark:shadow-none cursor-pointer"
                              title="Tải xuống tệp tin"
                            >
                              <div className="p-2.5 bg-blue-500/10 dark:bg-blue-500/20 text-blue-500 rounded-xl shrink-0">
                                <FileText className="w-6 h-6" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-semibold truncate text-slate-800 dark:text-slate-150" title={fileInfo.name}>
                                  {fileInfo.name}
                                </p>
                                <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                                  {formatFileSize(fileInfo.size)}
                                </p>
                              </div>
                            </a>
                          );
                        })()
                      ) : (
                        <div
                          onClick={handleMessageBubbleClick}
                          dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(msg.content) }}
                          className={`wrap-break-word text-inherit [&_blockquote]:border-l-3 [&_blockquote]:pl-3 [&_blockquote]:py-1.5 [&_blockquote]:pr-2 [&_blockquote]:rounded-r-lg [&_blockquote]:mb-2 [&_blockquote]:text-[11px] [&_blockquote]:block [&_blockquote]:select-none [&_blockquote]:cursor-pointer [&_blockquote]:transition-all [&_blockquote]:duration-200 ${
                            isMine 
                              ? "[&_blockquote]:border-white/60 [&_blockquote]:bg-white/15 [&_blockquote]:hover:bg-white/25 [&_blockquote]:text-blue-50/95 [&_blockquote_strong]:text-white [&_blockquote_strong]:font-semibold" 
                              : "[&_blockquote]:border-blue-500 [&_blockquote]:bg-slate-50 [&_blockquote]:dark:bg-slate-900/50 [&_blockquote]:hover:bg-slate-100/80 [&_blockquote]:dark:hover:bg-slate-800/80 [&_blockquote]:text-slate-600 [&_blockquote]:dark:text-slate-400 [&_blockquote_strong]:text-blue-600 [&_blockquote_strong]:dark:text-blue-400 [&_blockquote_strong]:font-semibold"
                          }`}
                        />
                      )}
                      <div className={`absolute top-1/2 -translate-y-1/2 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-all duration-200 z-10 ${
                        isMine 
                          ? "left-0 -translate-x-[110%]" 
                          : "right-0 translate-x-[110%]"
                      }`}>
                        {/* Reply / Quote Button */}
                        <button
                          onClick={() => handleReplyMessage(msg)}
                          className="p-1.5 rounded-full bg-white dark:bg-slate-800 text-slate-500 hover:text-blue-500 border border-slate-200 dark:border-slate-700 shadow-md transition-all active:scale-90 hover:scale-105"
                          title={language === "vi" ? "Trích dẫn" : "Reply"}
                        >
                          <Quote className="w-3.5 h-3.5" />
                        </button>

                        {/* Share Button */}
                        <button
                          onClick={() => setShareMsg(msg)}
                          className="p-1.5 rounded-full bg-white dark:bg-slate-800 text-slate-500 hover:text-blue-500 border border-slate-200 dark:border-slate-700 shadow-md transition-all active:scale-90 hover:scale-105"
                          title={language === "vi" ? "Chia sẻ" : "Share"}
                        >
                          <Forward className="w-3.5 h-3.5" />
                        </button>

                        {/* More Button */}
                        <button
                          onClick={(e) => handleOpenMoreMenu(e, msg)}
                          className="p-1.5 rounded-full bg-white dark:bg-slate-800 text-slate-500 hover:text-blue-500 border border-slate-200 dark:border-slate-700 shadow-md transition-all active:scale-90 hover:scale-105"
                          title={language === "vi" ? "Thêm" : "More"}
                        >
                          <MoreHorizontal className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <p className="text-[11px] text-slate-600 dark:text-slate-300 px-1">
                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </p>
                      {isMine && (
                        <span className="text-[11px] text-slate-600 dark:text-slate-300 px-1">
                          {msg.status === "sending" ? t.sending : msg.status === "sent" ? t.sent : t.read}
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
                {chatTitle} {t.isTyping}
              </span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {showScrollBadge && (
          <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-20">
            <button
              onClick={() => scrollToBottom("smooth")}
              className="flex items-center gap-2 bg-blue-500 text-white text-xs font-medium px-4 py-2 rounded-full shadow-lg hover:scale-105 active:scale-95 transition-all"
            >
              {t.newMessages}
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

            <input
              ref={docInputRef}
              type="file"
              className="hidden"
              onChange={(e) => {
                handlePickFile(e.target.files?.[0]);
                e.currentTarget.value = "";
              }}
            />

            {replyingMessage && (
              <div className="mb-3 flex items-center justify-between gap-3 rounded-2xl border border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20 px-4 py-2.5 shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-200">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="p-1.5 bg-blue-500/10 dark:bg-blue-500/20 text-blue-500 rounded-lg shrink-0">
                    <Quote className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      {language === "vi" ? "Đang trả lời" : "Replying to"} {
                        replyingMessage.senderId === user?.id
                          ? (language === "vi" ? "chính mình" : "yourself")
                          : (activeConv?.participants?.find((p: any) => p.id === replyingMessage.senderId)?.name || "User")
                      }
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5 max-w-[500px]">
                      {getCleanPreviewContent(replyingMessage)}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setReplyingMessage(null)}
                  className="rounded-full p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {pendingImage && (
              <div className="mb-3 inline-flex items-center gap-3 rounded-2xl border border-outline-variant/10 bg-surface-container-low px-3 py-2">
                <img src={pendingImage.previewUrl} alt={pendingImage.name} className="h-14 w-14 rounded-none border-0 ring-0 shadow-none object-cover" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-on-surface truncate">{pendingImage.name}</p>
                  <p className="text-xs text-outline">{t.readyToSendAsImage}</p>
                </div>
                <button
                  onClick={() => setPendingImage(null)}
                  className="ml-2 rounded-full px-3 py-1 text-xs font-semibold text-outline hover:bg-surface-container-high"
                >
                  {t.remove}
                </button>
              </div>
            )}

            {pendingFile && (
              <div className="mb-3 inline-flex items-center gap-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2 shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-200">
                <FileText className="h-8 w-8 text-cyan-500 shrink-0 animate-bounce" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">{pendingFile.name}</p>
                  <p className="text-xs text-slate-400">{formatFileSize(pendingFile.size)}</p>
                </div>
                <button
                  onClick={() => setPendingFile(null)}
                  className="ml-2 rounded-full px-3 py-1 text-xs font-semibold text-red-500 bg-red-500/10 hover:bg-red-500/20 transition-colors"
                >
                  Xóa
                </button>
              </div>
            )}

            <div className="bg-slate-100 dark:bg-slate-800 rounded-2xl p-3 flex items-center gap-3 shadow-sm border border-slate-300 dark:border-slate-700">
              <div className="flex items-center gap-1">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2 text-slate-500 dark:text-slate-400 hover:scale-105 active:scale-95 transition-colors"
                  title="Gửi hình ảnh"
                >
                  <ImageIcon className="w-5 h-5" />
                </button>
                <button
                  onClick={() => docInputRef.current?.click()}
                  className="p-2 text-slate-500 dark:text-slate-400 hover:scale-105 active:scale-95 transition-colors"
                  title="Gửi tài liệu"
                >
                  <Paperclip className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setShowEmojiPicker((current) => !current)}
                  className="p-2 text-slate-500 dark:text-slate-400 hover:scale-105 active:scale-95 transition-colors"
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
                placeholder={t.typeAMessage}
                rows={1}
              />
              <button
                onClick={handleSend}
                disabled={!inputText.trim() && !pendingImage && !pendingFile}
                className="p-3 bg-blue-500 text-white rounded-xl hover:scale-105 active:scale-95 transition-transform flex items-center justify-center shadow-lg shadow-blue-500/20 disabled:opacity-50 disabled:hover:scale-100"
              >
                <Send className="w-5 h-5 fill-current" />
              </button>
            </div>
          </div>
        </div>

      </section>

      <RightSidebar
        isOpen={showRightSidebar}
        conversation={activeConv || null}
        onClose={() => setShowRightSidebar(false)}
        onPreviewImage={(url) => setPreviewImageUrl(url)}
      />

      <ShareModal isOpen={!!shareMsg} onClose={() => setShareMsg(null)} messageToShare={shareMsg} socket={socket} />

      {/* Lightbox / Image Preview Modal */}
      {previewImageUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in duration-200"
          onClick={() => setPreviewImageUrl(null)}
        >
          <button
            onClick={() => setPreviewImageUrl(null)}
            className="absolute top-6 right-6 text-white hover:text-slate-300 bg-white/10 hover:bg-white/20 p-2.5 rounded-full backdrop-blur-sm transition-all"
            title="Đóng"
          >
            <X className="w-6 h-6" />
          </button>
          
          <div className="relative max-w-[90vw] max-h-[85vh] overflow-hidden rounded-2xl shadow-2xl border border-white/10 animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
            <img
              src={previewImageUrl}
              alt="Preview"
              className="max-w-full max-h-[85vh] object-contain select-none"
            />
            {/* Download button */}
            <a
              href={previewImageUrl}
              download="xconnect-image.png"
              target="_blank"
              rel="noopener noreferrer"
              className="absolute bottom-4 right-4 bg-slate-900/90 hover:bg-slate-800 text-white text-xs font-semibold px-4 py-2 rounded-full border border-white/10 shadow-lg hover:scale-105 active:scale-95 transition-all flex items-center gap-1.5"
            >
              Tải xuống
            </a>
          </div>
        </div>
      )}

      {/* Floating custom context menu / dropdown menu (Figure 2) */}
      {activeMenuMsg && (
        <>
          {/* Transparent click shield backdrop to dismiss */}
          <div className="fixed inset-0 z-40" onClick={() => { setActiveMenuMsg(null); setShowSubMenu(false); }} />
          
          <div 
            style={{ 
              top: Math.min(menuCoords.y, window.innerHeight - 380), 
              left: Math.min(menuCoords.x, window.innerWidth - 240) 
            }}
            className="fixed z-50 w-56 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-1.5 animate-in zoom-in-95 duration-100 flex flex-col font-sans"
          >
            <button
              onClick={() => {
                navigator.clipboard.writeText(getCleanPreviewContent(activeMenuMsg));
                toast.success(language === "vi" ? "Đã sao chép tin nhắn" : "Copied message");
                setActiveMenuMsg(null);
              }}
              className="flex items-center gap-3 px-3 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-colors text-left"
            >
              <Copy className="w-4 h-4 text-slate-400 dark:text-slate-500" />
              {language === "vi" ? "Copy tin nhắn" : "Copy message"}
            </button>

            <button
              onClick={() => {
                const isPinned = pinnedMessages.some(p => p.id === activeMenuMsg.id);
                if (isPinned) {
                  handleUnpinMessage(activeMenuMsg.id);
                } else {
                  handlePinMessage(activeMenuMsg);
                }
                setActiveMenuMsg(null);
              }}
              className="flex items-center gap-3 px-3 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-colors text-left"
            >
              <Pin className="w-4 h-4 text-slate-400 dark:text-slate-500 rotate-45" />
              {pinnedMessages.some(p => p.id === activeMenuMsg.id)
                ? (language === "vi" ? "Bỏ ghim tin nhắn" : "Unpin message")
                : (language === "vi" ? "Ghim tin nhắn" : "Pin message")}
            </button>

            <button
              onClick={() => {
                toast.success(language === "vi" ? "Đã đánh dấu tin nhắn thành công!" : "Starred message successfully!");
                setActiveMenuMsg(null);
              }}
              className="flex items-center gap-3 px-3 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-colors text-left"
            >
              <Star className="w-4 h-4 text-slate-400 dark:text-slate-500" />
              {language === "vi" ? "Đánh dấu tin nhắn" : "Star message"}
            </button>

            <button
              onClick={() => {
                toast.info(language === "vi" ? "Tính năng chọn nhiều đang phát triển" : "Select multiple is under development");
                setActiveMenuMsg(null);
              }}
              className="flex items-center gap-3 px-3 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-colors text-left"
            >
              <ListTodo className="w-4 h-4 text-slate-400 dark:text-slate-500" />
              {language === "vi" ? "Chọn nhiều tin nhắn" : "Select multiple"}
            </button>

            <button
              onClick={() => {
                toast.info(`${language === "vi" ? "Chi tiết tin nhắn" : "Message details"}: Sent by ${activeMenuMsg.senderId}`);
                setActiveMenuMsg(null);
              }}
              className="flex items-center gap-3 px-3 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-colors text-left"
            >
              <Info className="w-4 h-4 text-slate-400 dark:text-slate-500" />
              {language === "vi" ? "Xem chi tiết" : "View details"}
            </button>

            {/* Submenu Item for Tuỳ chọn khác */}
            <div 
              className="relative"
              onMouseEnter={() => setShowSubMenu(true)}
              onMouseLeave={() => setShowSubMenu(false)}
            >
              <button
                className={`w-full flex items-center justify-between px-3 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-colors ${showSubMenu ? "bg-slate-50 dark:bg-slate-800" : ""}`}
              >
                <div className="flex items-center gap-3">
                  <MoreHorizontal className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                  {language === "vi" ? "Tuỳ chọn khác" : "More options"}
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-slate-450" />
              </button>

              {/* Submenu Popout (Figure 2 right side submenu) */}
              {showSubMenu && (
                <div 
                  style={{ 
                    top: 0, 
                    left: "100%", 
                    marginLeft: "4px" 
                  }}
                  className="absolute z-50 w-52 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-1 animate-in slide-in-from-left-2 duration-100 flex flex-col"
                >
                  <button
                    onClick={() => {
                      if (!activeMenuMsg) return;
                      const myDocConv = conversations.find((conv) => {
                        if (conv.kind !== "direct") return false;
                        const other = conv.participants?.find((p) => p.id !== user?.id);
                        return !other;
                      });

                      if (myDocConv) {
                        if (socket) {
                          socket.emit("sendMessage", {
                            conversationId: myDocConv.id,
                            content: activeMenuMsg.content,
                            type: activeMenuMsg.type || "text",
                          });
                          toast.success(language === "vi" ? "Đã lưu vào My Documents thành công!" : "Saved to My Documents successfully!");
                        }
                      } else {
                        toast.error(language === "vi" ? "Không tìm thấy thư mục My Document!" : "My Document folder not found!");
                      }
                      setActiveMenuMsg(null);
                      setShowSubMenu(false);
                    }}
                    className="flex items-center gap-3 px-3 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-colors text-left"
                  >
                    <FolderArchive className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                    {language === "vi" ? "Lưu vào My Documents" : "Save to Documents"}
                  </button>

                  <button
                    onClick={() => {
                      toast.success(language === "vi" ? "Đã lên lịch tạo nhắc hẹn thành công!" : "Scheduled reminder successfully!");
                      setActiveMenuMsg(null);
                      setShowSubMenu(false);
                    }}
                    className="flex items-center gap-3 px-3 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-colors text-left"
                  >
                    <Clock className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                    {language === "vi" ? "Tạo nhắc hẹn" : "Create reminder"}
                  </button>
                </div>
              )}
            </div>

            <div className="h-px bg-slate-100 dark:bg-slate-800 my-1" />

            {activeMenuMsg.senderId === user?.id && (
              <button
                onClick={() => {
                  if (socket && activeRoomId) {
                    socket.emit("recallMessage", { messageId: activeMenuMsg.id, conversationId: activeRoomId });
                    toast.success(language === "vi" ? "Đã thu hồi tin nhắn" : "Message recalled");
                  }
                  setActiveMenuMsg(null);
                }}
                className="flex items-center gap-3 px-3 py-2.5 text-xs font-semibold text-red-500 hover:bg-red-50/50 dark:hover:bg-red-950/20 rounded-xl transition-colors text-left"
              >
                <Undo2 className="w-4 h-4 text-red-500" />
                {language === "vi" ? "Thu hồi" : "Recall"}
              </button>
            )}

            <button
              onClick={() => {
                if (activeRoomId) {
                  deleteMessage(activeRoomId, activeMenuMsg.id);
                  toast.success(language === "vi" ? "Đã xóa tin nhắn ở phía bạn" : "Message deleted for you");
                }
                setActiveMenuMsg(null);
              }}
              className="flex items-center gap-3 px-3 py-2.5 text-xs font-semibold text-red-500 hover:bg-red-50/50 dark:hover:bg-red-950/20 rounded-xl transition-colors text-left"
            >
              <Trash2 className="w-4 h-4 text-red-500" />
              {language === "vi" ? "Xóa chỉ ở phía tôi" : "Delete for me"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
