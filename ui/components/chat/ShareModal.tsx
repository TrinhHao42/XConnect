import { useState } from "react";
import { X, Search, Users, FileText, Loader2 } from "lucide-react";
import { useLanguageStore } from "@/store/language.store";
import { useChatStore } from "@/store/chat.store";
import { useAuthStore } from "@/store/auth.store";
import { toast } from "sonner";

const translations = {
  en: {
    shareMessage: "Share message",
    originalSender: "Original Sender",
    searchFriends: "Search conversations...",
    cancel: "Cancel",
    send: "Send",
    shareSuccess: "Message shared successfully!",
    groupChat: "Group Chat",
    noConversations: "No active conversations found",
    sending: "Sending..."
  },
  vi: {
    shareMessage: "Chia sẻ tin nhắn",
    originalSender: "Người gửi ban đầu",
    searchFriends: "Tìm cuộc trò chuyện...",
    cancel: "Hủy",
    send: "Gửi",
    shareSuccess: "Đã chia sẻ tin nhắn thành công!",
    groupChat: "Trò chuyện nhóm",
    noConversations: "Không tìm thấy cuộc trò chuyện nào",
    sending: "Đang gửi..."
  }
};

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  messageToShare: any;
  socket: any;
}

export default function ShareModal({ isOpen, onClose, messageToShare, socket }: ShareModalProps) {
  const [search, setSearch] = useState("");
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const { language } = useLanguageStore();
  const t = translations[language];
  
  const { conversations } = useChatStore();
  const { user } = useAuthStore();

  if (!isOpen) return null;

  const isImageMessage = (content: string) => {
    return typeof content === "string" && (
      content.startsWith("data:image/") || 
      content.startsWith("uploading-image:")
    );
  };

  const isFileMessage = (content: string) => {
    return typeof content === "string" && (
      content.startsWith("file:") || 
      content.startsWith("uploading-file:")
    );
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  const getPreviewImageSrc = (content: string) => {
    if (content.startsWith("uploading-image:")) {
      const parts = content.split("|");
      return parts.slice(1).join("|");
    }
    return content;
  };

  const getFilePreviewInfo = (content: string) => {
    if (content.startsWith("uploading-file:")) {
      const parts = content.split("|");
      const name = parts[1];
      const size = parseInt(parts[2], 10) || 0;
      return { name, size, isUploading: true };
    }
    const parts = content.split("|");
    const name = parts[0].substring(5); // remove 'file:'
    const size = parseInt(parts[1], 10) || 0;
    return { name, size, isUploading: false };
  };

  const list = conversations.map((conv) => {
    if (conv.kind === "group") {
      return {
        id: conv.id,
        name: conv.name || `Nhóm (${conv.participants?.length || 0})`,
        avatar: "",
        sub: t.groupChat,
        isGroup: true
      };
    } else {
      const other = conv.participants?.find((p) => p.id !== user?.id);
      return {
        id: conv.id,
        name: other?.name || other?.email || "Người dùng XConnect",
        avatar: other?.avatar || "",
        sub: other?.email || "",
        isGroup: false
      };
    }
  });

  const filteredList = list.filter((item) =>
    item.name.toLowerCase().includes(search.toLowerCase()) ||
    item.sub.toLowerCase().includes(search.toLowerCase())
  );

  const handleToggle = (id: string) => {
    setSelectedFriends((prev) =>
      prev.includes(id) ? prev.filter((fid) => fid !== id) : [...prev, id]
    );
  };

  const handleSendShare = () => {
    if (!socket || selectedFriends.length === 0 || !messageToShare) return;

    selectedFriends.forEach((convId) => {
      // Direct emit message over active websocket
      socket.emit("sendMessage", {
        conversationId: convId,
        content: messageToShare.content,
        type: messageToShare.type || "text",
      });
    });

    toast.success(t.shareSuccess);
    setSelectedFriends([]);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 dark:bg-slate-950/60 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-[28px] border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col overflow-hidden max-h-[90vh] animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold tracking-tight text-slate-950 dark:text-white">{t.shareMessage}</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-500 dark:text-slate-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Message Preview */}
        {messageToShare && (
          <div className="px-6 pb-6">
            <div className="bg-slate-50 dark:bg-slate-850 p-4 rounded-2xl border border-slate-200/60 dark:border-slate-800/60">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center font-bold flex-shrink-0 text-sm">
                  {messageToShare.senderId?.[0]?.toUpperCase() || "U"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 tracking-wider uppercase">{t.originalSender}</span>
                  </div>
                  
                  <div className="mt-2">
                    {isImageMessage(messageToShare.content) ? (
                      <div className="relative overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700 max-w-44 max-h-44 mt-1 shadow-sm">
                        <img
                          src={getPreviewImageSrc(messageToShare.content)}
                          alt="Shared image"
                          className="w-full h-full object-cover max-h-40"
                        />
                        {messageToShare.content.startsWith("uploading-image:") && (
                          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 gap-1.5">
                            <Loader2 className="w-5 h-5 text-white animate-spin" />
                            <span className="text-[9px] font-semibold text-white/90">{t.sending}</span>
                          </div>
                        )}
                      </div>
                    ) : isFileMessage(messageToShare.content) ? (
                      (() => {
                        const fileInfo = getFilePreviewInfo(messageToShare.content);
                        return (
                          <div className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 max-w-[280px] mt-1 shadow-sm">
                            <div className="p-2 bg-blue-500/10 dark:bg-blue-500/20 text-blue-500 rounded-lg shrink-0">
                              {fileInfo.isUploading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                              ) : (
                                <FileText className="w-5 h-5" />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-semibold truncate text-slate-800 dark:text-slate-250" title={fileInfo.name}>
                                {fileInfo.name}
                              </p>
                              <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 font-medium">
                                {formatFileSize(fileInfo.size)} {fileInfo.isUploading && `• ${t.sending}`}
                              </p>
                            </div>
                          </div>
                        );
                      })()
                    ) : (
                      <div className="line-clamp-3 break-all bg-white dark:bg-slate-900/60 p-3 rounded-xl border border-slate-200/40 dark:border-slate-800/40 mt-1 text-xs font-medium text-slate-700 dark:text-slate-200">
                        {messageToShare.content}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Search */}
        <div className="px-6 pb-4">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 w-5 h-5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-full pl-12 pr-6 py-3 text-sm text-slate-900 dark:text-white outline-none focus:border-blue-500 dark:focus:border-blue-500 transition-all"
              placeholder={t.searchFriends}
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto px-4 space-y-1 pb-4">
          {filteredList.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-sm">{t.noConversations}</div>
          ) : (
            filteredList.map((item) => (
              <div
                key={item.id}
                onClick={() => handleToggle(item.id)}
                className="flex items-center justify-between p-3 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-850/60 transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  {item.isGroup ? (
                    <div className="w-11 h-11 rounded-2xl bg-cyan-500/10 text-cyan-500 flex items-center justify-center font-bold">
                      <Users className="w-5 h-5" />
                    </div>
                  ) : item.avatar ? (
                    <img src={item.avatar} alt={item.name} className="w-11 h-11 rounded-2xl object-cover" />
                  ) : (
                    <div className="w-11 h-11 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center font-bold text-sm shrink-0">
                      {item.name[0]?.toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{item.name}</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500 truncate mt-0.5">{item.sub}</p>
                  </div>
                </div>
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all shrink-0 ${
                  selectedFriends.includes(item.id)
                    ? "bg-blue-500 border-blue-500"
                    : "border-slate-200 dark:border-slate-700 group-hover:border-blue-500/50"
                }`}>
                  {selectedFriends.includes(item.id) && <div className="w-2 h-2 bg-white rounded-full"></div>}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Actions */}
        <footer className="p-6 bg-slate-50 dark:bg-slate-850 border-t border-slate-200/60 dark:border-slate-800/60 flex items-center justify-end gap-3 mt-auto">
          <button onClick={onClose} className="px-6 py-2.5 rounded-full text-sm font-bold text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            {t.cancel}
          </button>
          <button
            disabled={selectedFriends.length === 0}
            onClick={handleSendShare}
            className="px-8 py-2.5 rounded-full bg-blue-500 text-white text-sm font-bold shadow-lg shadow-blue-500/20 active:scale-95 transition-transform disabled:opacity-50 disabled:active:scale-100"
          >
            {t.send} {selectedFriends.length > 0 && `(${selectedFriends.length})`}
          </button>
        </footer>
      </div>
    </div>
  );
}
