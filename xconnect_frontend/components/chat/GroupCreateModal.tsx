"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Plus, Search, X } from "lucide-react";
import { api } from "@/libs/api";
import { useAuthStore } from "@/store/auth.store";
import { useChatStore } from "@/store/chat.store";
import { toast } from "sonner";

interface Friend {
  id: string;
  name?: string;
  email: string;
  avatar?: string;
  bio?: string;
}

interface GroupCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function GroupCreateModal({ isOpen, onClose }: GroupCreateModalProps) {
  const { conversations, setConversations, setActiveRoom } = useChatStore();
  const { user } = useAuthStore();
  const [groupName, setGroupName] = useState("");
  const [search, setSearch] = useState("");
  const [friends, setFriends] = useState<Friend[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const loadFriends = async () => {
      setLoading(true);
      try {
        const data = await api.get<Friend[]>("/friend/list");
        setFriends(data || []);
      } catch (error) {
        console.error("Failed to load friends for group creation", error);
        toast.error("Không tải được danh sách bạn bè");
      } finally {
        setLoading(false);
      }
    };

    setGroupName("");
    setSearch("");
    setSelectedIds([]);
    loadFriends();
  }, [isOpen]);

  const filteredFriends = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return friends;
    return friends.filter((friend) => {
      const displayName = friend.name || friend.email;
      return displayName.toLowerCase().includes(query) || friend.email.toLowerCase().includes(query);
    });
  }, [friends, search]);

  const toggleFriend = (friendId: string) => {
    setSelectedIds((current) =>
      current.includes(friendId) ? current.filter((id) => id !== friendId) : [...current, friendId]
    );
  };

  const handleCreateGroup = async () => {
    if (!user) return;

    const memberIds = selectedIds.filter(Boolean);
    if (memberIds.length < 2) {
      toast.error("Nhóm cần ít nhất 3 người để tạo");
      return;
    }

    setSubmitting(true);
    try {
      const created = await api.post<any>("/chat/groups", {
        name: groupName.trim() || "New group",
        memberIds,
      });

      const nextConversations = [created, ...conversations.filter((conv) => conv.id !== created.id)];
      setConversations(nextConversations as any);
      setActiveRoom(created.id);
      toast.success("Đã tạo nhóm thành công");
      onClose();
    } catch (error: any) {
      console.error("Failed to create group", error);
      toast.error(error?.message || "Không thể tạo nhóm");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-md p-4">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-[28px] border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-950 shadow-2xl shadow-black/10 dark:shadow-black/40">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 px-6 py-5">
          <div>
            <h2 className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">Tạo nhóm chat</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Chọn ít nhất 2 bạn bè để tạo nhóm mới</p>
          </div>
          <button onClick={onClose} className="rounded-full bg-slate-100 dark:bg-white/5 p-2 text-slate-600 dark:text-slate-300 transition-colors hover:bg-slate-200 dark:hover:bg-white/10">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="border-b border-slate-200 dark:border-white/10 px-6 py-5">
          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.25em] text-slate-500 dark:text-slate-400">Tên nhóm</span>
            <input
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="Ví dụ: Team XConnect"
              className="w-full rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 px-4 py-3 text-sm text-slate-900 dark:text-white outline-none transition focus:border-cyan-500/40 dark:focus:border-cyan-400/40 focus:bg-slate-100 dark:focus:bg-white/10"
            />
          </label>
        </div>

        <div className="px-6 pb-4 pt-5">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm bạn bè để thêm vào nhóm..."
              className="w-full rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 py-3 pl-11 pr-4 text-sm text-slate-900 dark:text-white outline-none transition focus:border-cyan-500/40 dark:focus:border-cyan-400/40 focus:bg-slate-100 dark:focus:bg-white/10"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-4">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-slate-500 dark:text-slate-400">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : filteredFriends.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center text-slate-500 dark:text-slate-400">
              <p className="text-lg font-semibold text-slate-900 dark:text-white">Không có bạn bè phù hợp</p>
              <p className="mt-1 text-sm">Thử tìm tên hoặc email khác</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredFriends.map((friend) => {
                const isSelected = selectedIds.includes(friend.id);
                return (
                  <button
                    key={friend.id}
                    type="button"
                    onClick={() => toggleFriend(friend.id)}
                    className={`flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-colors ${isSelected ? "border-cyan-500 bg-cyan-500/10 dark:border-cyan-400/40 dark:bg-cyan-500/10" : "border-slate-200 bg-slate-50 hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
                      }`}
                  >
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-linear-to-br from-indigo-500 to-cyan-500 text-sm font-bold text-white">
                      {(friend.name || friend.email || "?")[0]?.toUpperCase() || "?"}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{friend.name || friend.email}</p>
                      <p className="truncate text-xs text-slate-500 dark:text-slate-400">{friend.email}</p>
                    </div>
                    <div className={`flex h-6 w-6 items-center justify-center rounded-full border ${isSelected ? "border-cyan-500 bg-cyan-500 text-white" : "border-slate-300 dark:border-slate-500"
                      }`}>
                      {isSelected && <Plus className="h-3.5 w-3.5 text-white dark:text-slate-950" />}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-black/20 px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-full px-5 py-2.5 text-sm font-semibold text-slate-600 dark:text-slate-300 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-white/5 dark:hover:text-white"
          >
            Hủy
          </button>
          <button
            onClick={handleCreateGroup}
            disabled={submitting || selectedIds.length < 2}
            className="inline-flex items-center gap-2 rounded-full bg-cyan-500 px-6 py-2.5 text-sm font-semibold text-slate-950 transition-transform hover:scale-[1.01] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Tạo nhóm
          </button>
        </div>
      </div>
    </div>
  );
}
