"use client";

import { useEffect, useState } from "react";
import { Search, UserPlus, Loader2, MessageSquare, Check, X, Clock } from "lucide-react";
import { api } from "@/libs/api";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useFriendStore } from "@/store/friend.store";
import { useAuthStore } from "@/store/auth.store";
import { Users } from "lucide-react";
import { useChatStore } from "@/store/chat.store";

interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  bio?: string;
}

export default function ContactsPage() {
  const router = useRouter();
  const { requests, setRequests, removeRequest } = useFriendStore();
  const { onlineUsers } = useChatStore();
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState<User[]>([]);
  const [friends, setFriends] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [startingChat, setStartingChat] = useState<string | null>(null);

  const loadFriends = async () => {
    try {
      const data = await api.get<User[]>("/friend/list");
      setFriends(data);
    } catch (e) {
      console.error("Failed to load friends:", e);
    }
  };

  useEffect(() => {
    const loadRequests = async () => {
      try {
        const data = await api.get<any[]>("/friend/requests");
        setRequests(data);
      } catch (e) {
        console.error("Failed to load friend requests:", e);
      }
    };
    loadRequests();
    loadFriends();
  }, [setRequests]);

  const handleAccept = async (requestId: string) => {
    const request = requests.find((r: any) => r.id === requestId);
    try {
      await api.put(`/friend/accept/${requestId}`, {});
      if (request) {
        const { addFriendId } = useAuthStore.getState();
        addFriendId(request.senderId);
        loadFriends(); // Refresh friend list immediately
      }
      removeRequest(requestId);
      toast.success("Đã chấp nhận kết bạn");
    } catch (e) {
      toast.error("Lỗi khi chấp nhận kết bạn");
    }
  };

  const handleReject = async (requestId: string) => {
    try {
      await api.put(`/friend/reject/${requestId}`, {});
      removeRequest(requestId);
      toast.info("Đã từ chối lời mời");
    } catch (e) {
      toast.error("Lỗi khi từ chối lời mời");
    }
  };

  useEffect(() => {
    const timeout = setTimeout(async () => {
      if (!query.trim()) {
        setUsers([]);
        return;
      }
      setLoading(true);
      try {
        const data = await api.get<User[]>(`/users/search?q=${encodeURIComponent(query)}`);
        setUsers(data);
      } catch {
        setUsers([]);
      } finally {
        setLoading(false);
      }
    }, 350);
    return () => clearTimeout(timeout);
  }, [query]);

  const handleStartChat = async (targetUserId: string) => {
    setStartingChat(targetUserId);
    try {
      const conv = await api.post<{ id: string }>("/chat/conversations", { targetUserId });
      router.push("/chat");
      // Give router time to navigate, then set active room via store
      const { useChatStore } = await import("@/store/chat.store");
      useChatStore.getState().setActiveRoom(conv.id);
    } catch (e) {
      console.error("Failed to start chat:", e);
    } finally {
      setStartingChat(null);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-50 dark:bg-slate-950 h-full overflow-hidden">
      {/* Header */}
      <div className="px-8 pt-8 pb-4 border-b border-slate-200 dark:border-slate-800">
        {/* Search bar */}
        <div className="relative mt-5">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or email..."
            className="w-full pl-12 pr-4 py-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white placeholder:text-slate-500 dark:placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-all"
          />
        </div>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto px-8 py-6">
        {/* Friend Requests Section */}
        {requests && requests.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Clock className="w-3 h-3" />
              Lời mời kết bạn ({requests.length})
            </h2>
            <div className="grid gap-3">
              {requests.map((req: any) => (
                <div
                  key={req.id}
                  className="flex items-center gap-4 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-blue-100 dark:border-blue-900/30 shadow-sm shadow-blue-500/5 transition-all"
                >
                  <div className="w-12 h-12 rounded-xl bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-lg">
                    {req.sender?.name?.[0]?.toUpperCase() || req.sender?.email?.[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-900 dark:text-white truncate">{req.sender?.name || req.sender?.email}</p>
                    <p className="text-xs text-slate-400 truncate">Muốn kết bạn với bạn</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleAccept(req.id)}
                      className="p-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white transition-all shadow-lg shadow-blue-500/20"
                    >
                      <Check className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleReject(req.id)}
                      className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-300 transition-all"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-7 h-7 animate-spin text-blue-500" />
          </div>
        ) : !query.trim() ? (
          <>
            {/* Friends List Section */}
            {friends && friends.length > 0 ? (
              <div className="mb-8">
                <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <Users className="w-3 h-3" />
                  Fiends list ({friends.length})
                </h2>
                <div className="grid gap-3">
                  {friends.map((friend) => {
                    const isOnline = onlineUsers.includes(friend.id);
                    return (
                      <div
                        key={friend.id}
                        className="flex items-center gap-4 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 hover:border-blue-400/40 dark:hover:border-blue-500/30 transition-all shadow-sm"
                      >
                        <div className="relative flex-shrink-0">
                          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-lg">
                            {friend.name?.[0]?.toUpperCase() || friend.email?.[0]?.toUpperCase() || "?"}
                          </div>
                          <span className={`absolute -bottom-1 -right-1 w-4 h-4 border-2 border-white dark:border-slate-900 rounded-full ${isOnline ? "bg-emerald-500" : "bg-slate-400"}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-slate-900 dark:text-white truncate">{friend.name || "No name"}</p>
                          <div className="flex items-center gap-2">
                            <p className="text-sm text-slate-400 truncate">{friend.email}</p>
                            <span className="w-1 h-1 rounded-full bg-slate-300" />
                            <p className={`text-[11px] font-medium ${isOnline ? "text-emerald-500" : "text-slate-400"}`}>
                              {isOnline ? "Online" : "Offline"}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleStartChat(friend.id)}
                          disabled={startingChat === friend.id}
                          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold transition-all disabled:opacity-60 shadow-md shadow-blue-500/20"
                        >
                          {startingChat === friend.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <MessageSquare className="w-4 h-4" />
                          )}
                          Message
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-20 h-20 rounded-3xl bg-blue-500/10 dark:bg-blue-500/20 flex items-center justify-center mb-5">
                  <Search className="w-9 h-9 text-blue-500" />
                </div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">Find someone to chat with</h2>
                <p className="text-slate-500 dark:text-slate-400 text-sm mt-2">Type a name or email to search for new friends</p>
              </div>
            )}
          </>
        ) : users.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-20 h-20 rounded-3xl bg-slate-200 dark:bg-slate-800 flex items-center justify-center mb-5">
              <UserPlus className="w-9 h-9 text-slate-400" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">No users found</h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-2">Try a different name or email</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {users.map((u) => (
              <div
                key={u.id}
                className="flex items-center gap-4 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 hover:border-blue-400/40 dark:hover:border-blue-500/30 transition-all shadow-sm"
              >
                {/* Avatar */}
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                  {u.name?.[0]?.toUpperCase() || u.email?.[0]?.toUpperCase() || "?"}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-900 dark:text-white truncate">{u.name || "No name"}</p>
                  <p className="text-sm text-slate-400 truncate">{u.email}</p>
                  {u.bio && <p className="text-xs text-slate-400 truncate mt-0.5 italic">{u.bio}</p>}
                </div>

                {/* Action */}
                <button
                  onClick={() => handleStartChat(u.id)}
                  disabled={startingChat === u.id}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold transition-all disabled:opacity-60 shadow-md shadow-blue-500/20 flex-shrink-0"
                >
                  {startingChat === u.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <MessageSquare className="w-4 h-4" />
                  )}
                  Message
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
