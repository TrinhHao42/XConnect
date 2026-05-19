import { useState } from "react";
import { X, Search } from "lucide-react";
import { useLanguageStore } from "@/store/language.store";

const translations = {
  en: {
    shareMessage: "Share message",
    originalSender: "Original Sender",
    searchFriends: "Search friends or conversations...",
    cancel: "Cancel",
    send: "Send"
  },
  vi: {
    shareMessage: "Chia sẻ tin nhắn",
    originalSender: "Người gửi ban đầu",
    searchFriends: "Tìm bạn bè hoặc cuộc trò chuyện...",
    cancel: "Hủy",
    send: "Gửi"
  }
};

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  messageToShare: any;
}

export default function ShareModal({ isOpen, onClose, messageToShare }: ShareModalProps) {
  const [search, setSearch] = useState("");
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const { language } = useLanguageStore();
  const t = translations[language];

  if (!isOpen) return null;

  const friends = [
    { id: "1", name: "Elena Rodriguez", role: "Design Team Lead" },
    { id: "2", name: "Marcus Thorne", role: "Offline" },
    { id: "3", name: "Isabella Cruz", role: "Mobile • Active now" },
  ];

  const handleToggle = (id: string) => {
    setSelectedFriends((prev) =>
      prev.includes(id) ? prev.filter((fid) => fid !== id) : [...prev, id]
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-on-surface/20 backdrop-blur-md p-4">
      <div className="w-full max-w-lg bg-surface-container-lowest rounded-[28px] shadow-2xl flex flex-col overflow-hidden max-h-[90vh]">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold tracking-tight">{t.shareMessage}</h2>
          <button onClick={onClose} className="p-2 hover:bg-surface-container-high rounded-full transition-colors">
            <X className="w-5 h-5 text-outline" />
          </button>
        </div>

        {/* Message Preview */}
        {messageToShare && (
          <div className="px-6 pb-6">
            <div className="bg-surface-container-low p-4 rounded-xl border border-outline-variant/20">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center font-bold text-primary flex-shrink-0">
                  {messageToShare.senderId?.[0] || "U"}
                </div>
                <div className="flex-1">
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className="text-sm font-bold text-on-surface">{t.originalSender}</span>
                  </div>
                  <div className="bg-surface-container-lowest p-3 rounded-lg rounded-tl-none border border-outline-variant/10 text-sm text-on-surface-variant leading-relaxed">
                    {messageToShare.content}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Search */}
        <div className="px-6 pb-4">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-surface-container-low border-none rounded-full pl-12 pr-6 py-3 text-sm focus:ring-2 focus:ring-primary/20 transition-all outline-none"
              placeholder={t.searchFriends}
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto px-4 space-y-1 pb-4">
          {friends.map((friend) => (
            <div
              key={friend.id}
              onClick={() => handleToggle(friend.id)}
              className="flex items-center justify-between p-2 rounded-2xl hover:bg-surface-container-high transition-colors cursor-pointer group"
            >
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                  {friend.name[0]}
                </div>
                <div>
                  <p className="text-sm font-semibold">{friend.name}</p>
                  <p className="text-xs text-slate-500">{friend.role}</p>
                </div>
              </div>
              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                selectedFriends.includes(friend.id)
                  ? "bg-primary border-primary"
                  : "border-outline-variant/30 group-hover:border-primary/50"
              }`}>
                {selectedFriends.includes(friend.id) && <div className="w-2.5 h-2.5 bg-white rounded-full"></div>}
              </div>
            </div>
          ))}
        </div>

        {/* Actions */}
        <footer className="p-6 bg-surface-container-low flex items-center justify-end gap-3 mt-auto">
          <button onClick={onClose} className="px-6 py-2.5 rounded-full text-sm font-bold text-on-surface-variant hover:bg-surface-container-high transition-colors">
            {t.cancel}
          </button>
          <button
            disabled={selectedFriends.length === 0}
            onClick={onClose}
            className="px-8 py-2.5 rounded-full bg-gradient-to-br from-primary to-primary-container text-white text-sm font-bold shadow-lg shadow-primary/20 active:scale-95 transition-transform disabled:opacity-50 disabled:active:scale-100"
          >
            {t.send} {selectedFriends.length > 0 && `(${selectedFriends.length})`}
          </button>
        </footer>
      </div>
    </div>
  );
}
