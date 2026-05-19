"use client";

import { useEffect, useState } from "react";
import { Search, Loader2, Plus } from "lucide-react";
import { useChatStore } from "@/store/chat.store";
import { useAuthStore } from "@/store/auth.store";
import { api } from "@/libs/api";
import GroupCreateModal from "./GroupCreateModal";
import { useLanguageStore } from "@/store/language.store";

const translations = {
  en: {
    yesterday: "Yesterday",
    noMessages: "No messages yet",
    image: "[Image]",
    search: "Search conversations...",
    noConversationsFound: "No conversations found",
    noConversationsYet: "No conversations yet",
    groupChat: "Group chat"
  },
  vi: {
    yesterday: "Hôm qua",
    noMessages: "Chưa có tin nhắn",
    image: "[Hình ảnh]",
    search: "Tìm kiếm cuộc trò chuyện...",
    noConversationsFound: "Không tìm thấy cuộc trò chuyện nào",
    noConversationsYet: "Chưa có cuộc trò chuyện",
    groupChat: "Nhóm"
  }
};

interface ConversationItem {
  id: string;
  participantIds: string[];
  participants: { id: string; name: string; email: string; avatar?: string }[];
  messages: { content: string; createdAt: string }[];
  updatedAt: string;
  kind?: "direct" | "group";
  name?: string | null;
  leaderId?: string | null;
}

function formatTime(dateStr: string, t: any) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diffDays === 0) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (diffDays === 1) return t.yesterday;
  if (diffDays < 7) return d.toLocaleDateString([], { weekday: "short" });
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

function formatPreview(content: string | undefined, t: any) {
  if (!content) return t.noMessages;
  if (content.startsWith("data:image/")) return t.image;
  return content;
}

export default function ConversationList() {
  const { conversations, activeRoomId, setActiveRoom, setConversations } = useChatStore();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const { language } = useLanguageStore();
  const t = translations[language];

  useEffect(() => {
    const load = async () => {
      try {
        const data = await api.get<ConversationItem[]>("/chat/conversations");
        setConversations(data as any);
      } catch (e) {
        console.error("Failed to load conversations:", e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [setConversations]);

  // Derive display name: for 1v1 show the other person's name
  function getDisplayName(conv: ConversationItem) {
    if (!user) return "Unknown";
    if (conv.kind === "group") {
      return conv.name || `Group (${conv.participants?.length || 0})`;
    }
    const other = conv.participants?.find((p) => p.id !== user.id);
    return other?.name || other?.email || "Unknown";
  }

  function getInitial(name: string) {
    return name?.[0]?.toUpperCase() || "?";
  }

  function getAvatarUrl(conv: ConversationItem) {
    if (conv.kind === "group") return null;
    const other = conv.participants?.find((p) => p.id !== user?.id);
    return other?.avatar;
  }

  const rawList = conversations as unknown as ConversationItem[];
  const filtered = rawList.filter((c) =>
    getDisplayName(c).toLowerCase().includes(search.toLowerCase())
  );

  return (
    <section className="w-full md:w-80 lg:w-96 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 flex flex-col overflow-hidden border-r border-slate-200 dark:border-slate-800 z-10">
      <div className="p-6">
        <div className="flex items-center gap-2">
          <div className="relative group flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400 w-5 h-5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-primary/30 transition-all placeholder:text-slate-500 dark:placeholder:text-slate-400 outline-none"
              placeholder={t.search}
            />
          </div>
          <button
            type="button"
            onClick={() => setShowCreateGroup(true)}
            className="shrink-0 inline-flex items-center justify-center w-12 h-12 rounded-xl bg-cyan-500 text-slate-950 transition-transform hover:scale-[1.05] active:scale-[0.95]"
            title="Tạo nhóm"
          >
            <Plus className="h-6 w-6" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 space-y-1 pb-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-slate-500 dark:text-slate-400 text-sm">
            {search ? t.noConversationsFound : t.noConversationsYet}
          </div>
        ) : (
          filtered.map((item) => {
            const isActive = item.id === activeRoomId;
            const displayName = getDisplayName(item);
            const lastMsg = item.messages?.[0];
            return (
              <div
                key={item.id}
                onClick={() => setActiveRoom(item.id)}
                className={`relative group cursor-pointer p-3 rounded-xl transition-all ${
                  isActive ? "bg-slate-100 dark:bg-slate-800 shadow-sm" : "hover:bg-slate-100 dark:hover:bg-slate-800/70"
                }`}
              >
                {isActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary rounded-r-full" />
                )}

                <div className="flex gap-3">
                  <div className="relative shrink-0">
                    <div className="w-12 h-12 rounded-xl bg-linear-to-br from-indigo-400 to-blue-500 text-white flex items-center justify-center font-bold text-lg overflow-hidden">
                      {getAvatarUrl(item) ? (
                        <img src={getAvatarUrl(item)} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                        getInitial(displayName)
                      )}
                    </div>
                  </div>

                  <div className="flex-1 min-w-0 flex flex-col justify-center">
                    <div className="flex justify-between items-start mb-0.5">
                      <h3 className="font-semibold text-sm truncate font-sans text-slate-900 dark:text-slate-100">
                        {displayName}
                      </h3>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                        {formatTime(item.updatedAt, t)}
                      </span>
                    </div>
                    {item.kind === "group" && (
                      <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.25em] text-cyan-500">
                        {t.groupChat}
                      </p>
                    )}
                    <p className="text-xs truncate text-slate-600 dark:text-slate-300 font-medium">
                      {formatPreview(lastMsg?.content, t)}
                    </p>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
      <GroupCreateModal isOpen={showCreateGroup} onClose={() => setShowCreateGroup(false)} />
    </section>
  );
}
