"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/libs/api";
import { useAuthStore } from "@/store/auth.store";
import { useChatStore } from "@/store/chat.store";
import { Conversation } from "@/types";
import { toast } from "sonner";
import {
  ArrowLeft,
  Check,
  Loader2,
  Lock,
  LogOut,
  Plus,
  Search,
  Shield,
  ShieldCheck,
  Trash2,
  UserMinus,
  Users,
  UserCog,
  UserPlus,
  X,
} from "lucide-react";

interface Friend {
  id: string;
  name?: string;
  email: string;
  avatar?: string;
  bio?: string;
}

interface GroupManageModalProps {
  isOpen: boolean;
  conversation: Conversation | null;
  onClose: () => void;
}

type PermissionMode = "all" | "leader_only";
type SendMode = "all" | "restricted";

export default function GroupManageModal({ isOpen, conversation, onClose }: GroupManageModalProps) {
  const { user } = useAuthStore();
  const { setConversations, setActiveRoom } = useChatStore();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [friendSearch, setFriendSearch] = useState("");
  const [memberSearch, setMemberSearch] = useState("");
  const [pendingAddIds, setPendingAddIds] = useState<string[]>([]);
  const [memberAddMode, setMemberAddMode] = useState<PermissionMode>("all");
  const [messageSendMode, setMessageSendMode] = useState<SendMode>("all");
  const [allowedSenderIds, setAllowedSenderIds] = useState<string[]>([]);
  const [selectedLeaderId, setSelectedLeaderId] = useState<string>("");
  const [transferMode, setTransferMode] = useState(false);
  const [loadingFriends, setLoadingFriends] = useState(false);
  const [saving, setSaving] = useState(false);

  const currentUserId = user?.id || "";
  const members = conversation?.participants || [];
  const isLeader = conversation?.leaderId === currentUserId;
  const isGroup = conversation?.kind === "group";

  useEffect(() => {
    if (!isOpen || !conversation) return;

    setMemberAddMode(conversation.memberAddMode || "all");
    setMessageSendMode(conversation.messageSendMode || "all");
    setAllowedSenderIds(conversation.allowedSenderIds || (conversation.leaderId ? [conversation.leaderId] : []));
    setPendingAddIds([]);
    setFriendSearch("");
    setMemberSearch("");
    setSelectedLeaderId(conversation.participants?.find((member) => member.id !== currentUserId)?.id || "");
    setTransferMode(false);
  }, [conversation, currentUserId, isOpen]);

  useEffect(() => {
    if (!isOpen || !conversation || !isGroup) return;

    const loadFriends = async () => {
      setLoadingFriends(true);
      try {
        const data = await api.get<Friend[]>("/friend/list");
        setFriends(data || []);
      } catch (error) {
        console.error("Failed to load group friends", error);
        toast.error("Không tải được danh sách bạn bè");
      } finally {
        setLoadingFriends(false);
      }
    };

    loadFriends();
  }, [conversation, isGroup, isOpen]);

  const refreshConversations = async () => {
    const latest = await api.get<Conversation[]>("/chat/conversations");
    setConversations(latest as any);
  };

  const filteredMembers = useMemo(() => {
    const query = memberSearch.trim().toLowerCase();
    if (!query) return members;
    return members.filter((member) => {
      const label = `${member.name || ""} ${member.email || ""}`.toLowerCase();
      return label.includes(query);
    });
  }, [memberSearch, members]);

  const filteredFriends = useMemo(() => {
    const query = friendSearch.trim().toLowerCase();
    const available = friends.filter((friend) => !members.some((member) => member.id === friend.id));
    if (!query) return available;
    return available.filter((friend) => {
      const label = `${friend.name || ""} ${friend.email || ""}`.toLowerCase();
      return label.includes(query);
    });
  }, [friendSearch, friends, members]);

  if (!isOpen || !conversation || !isGroup) return null;

  const togglePendingFriend = (friendId: string) => {
    setPendingAddIds((current) =>
      current.includes(friendId) ? current.filter((id) => id !== friendId) : [...current, friendId]
    );
  };

  const toggleAllowedSender = (memberId: string) => {
    setAllowedSenderIds((current) =>
      current.includes(memberId) ? current.filter((id) => id !== memberId) : [...current, memberId]
    );
  };

  const handleSavePermissions = async () => {
    if (!isLeader) return;

    setSaving(true);
    try {
      await api.patch(`/chat/groups/${conversation.id}/permissions`, {
        memberAddMode,
        messageSendMode,
        allowedSenderIds,
      });
      await refreshConversations();
      toast.success("Đã cập nhật quyền nhóm");
    } catch (error: any) {
      toast.error(error?.message || "Không thể cập nhật quyền nhóm");
    } finally {
      setSaving(false);
    }
  };

  const handleAddMembers = async () => {
    if (!isLeader || pendingAddIds.length === 0) return;

    setSaving(true);
    try {
      await api.post(`/chat/groups/${conversation.id}/members`, { memberIds: pendingAddIds });
      setPendingAddIds([]);
      setFriendSearch("");
      await refreshConversations();
      toast.success("Đã thêm thành viên vào nhóm");
    } catch (error: any) {
      toast.error(error?.message || "Không thể thêm thành viên");
    } finally {
      setSaving(false);
    }
  };

  const handlePromote = async (memberId: string) => {
    if (!isLeader) return;

    setSaving(true);
    try {
      await api.post(`/chat/groups/${conversation.id}/leader`, { newLeaderId: memberId });
      await refreshConversations();
      toast.success("Đã chuyển nhóm trưởng");
    } catch (error: any) {
      toast.error(error?.message || "Không thể chuyển nhóm trưởng");
    } finally {
      setSaving(false);
    }
  };

  const handleKick = async (memberId: string) => {
    if (!isLeader) return;

    setSaving(true);
    try {
      await api.post(`/chat/groups/${conversation.id}/kick/${memberId}`, {});
      await refreshConversations();
      toast.success("Đã kick thành viên khỏi nhóm");
    } catch (error: any) {
      toast.error(error?.message || "Không thể kick thành viên");
    } finally {
      setSaving(false);
    }
  };

  const handleDissolve = async () => {
    if (!isLeader) return;

    setSaving(true);
    try {
      await api.delete(`/chat/groups/${conversation.id}`);
      await refreshConversations();
      setActiveRoom(null);
      toast.success("Đã giải tán nhóm");
      onClose();
    } catch (error: any) {
      toast.error(error?.message || "Không thể giải tán nhóm");
    } finally {
      setSaving(false);
    }
  };

  const handleLeave = async () => {
    if (isLeader) {
      setTransferMode(true);
      return;
    }

    setSaving(true);
    try {
      await api.post(`/chat/groups/${conversation.id}/leave`, {});
      await refreshConversations();
      setActiveRoom(null);
      toast.success("Bạn đã rời khỏi nhóm");
      onClose();
    } catch (error: any) {
      toast.error(error?.message || "Không thể rời nhóm");
    } finally {
      setSaving(false);
    }
  };

  const handleTransferAndLeave = async () => {
    if (!selectedLeaderId) {
      toast.error("Hãy chọn một thành viên để làm nhóm trưởng");
      return;
    }

    setSaving(true);
    try {
      await api.post(`/chat/groups/${conversation.id}/leader-and-leave`, { newLeaderId: selectedLeaderId });
      await refreshConversations();
      setActiveRoom(null);
      toast.success("Đã chuyển nhóm trưởng và rời nhóm");
      onClose();
    } catch (error: any) {
      toast.error(error?.message || "Không thể rời nhóm");
    } finally {
      setSaving(false);
    }
  };

  const selectedLeader = members.find((member) => member.id === selectedLeaderId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 backdrop-blur-md p-4">
      <div className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-[28px] border border-white/10 bg-slate-950 shadow-2xl shadow-black/40">
        <div className="flex items-start justify-between border-b border-white/10 px-6 py-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-400">Group settings</p>
            <h2 className="mt-2 text-2xl font-bold text-white">{conversation.name || "Nhóm chat"}</h2>
            <p className="mt-1 text-sm text-slate-400">{members.length} thành viên · {isLeader ? "Bạn là nhóm trưởng" : "Bạn là thành viên"}</p>
          </div>
          <button onClick={onClose} className="rounded-full bg-white/5 p-2 text-slate-300 transition-colors hover:bg-white/10">
            <X className="h-5 w-5" />
          </button>
        </div>

        {transferMode ? (
          <div className="flex-1 overflow-y-auto px-6 py-6">
            <button
              type="button"
              onClick={() => setTransferMode(false)}
              className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/5 px-4 py-2 text-sm font-semibold text-slate-300 transition-colors hover:bg-white/10"
            >
              <ArrowLeft className="h-4 w-4" />
              Quay lại
            </button>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
              <h3 className="text-lg font-semibold text-white">Out group</h3>
              <p className="mt-1 text-sm text-slate-400">Chọn một thành viên để làm nhóm trưởng rồi bạn sẽ rời nhóm.</p>

              <div className="relative mt-4">
                <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input
                  value={memberSearch}
                  onChange={(e) => setMemberSearch(e.target.value)}
                  placeholder="Tìm thành viên..."
                  className="w-full rounded-2xl border border-white/10 bg-slate-900 py-3 pl-10 pr-4 text-sm text-white outline-none focus:border-cyan-400/40"
                />
              </div>

              <div className="mt-4 space-y-2">
                {filteredMembers
                  .filter((member) => member.id !== currentUserId)
                  .map((member) => {
                    const isSelected = selectedLeaderId === member.id;
                    return (
                      <button
                        key={member.id}
                        type="button"
                        onClick={() => setSelectedLeaderId(member.id)}
                        className={`flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-colors ${isSelected ? "border-cyan-400/40 bg-cyan-500/10" : "border-white/10 bg-white/5 hover:bg-white/10"}`}
                      >
                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-linear-to-br from-indigo-500 to-cyan-500 text-sm font-bold text-white">
                          {(member.name || member.email || "?")[0]?.toUpperCase() || "?"}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-white">{member.name || member.email}</p>
                          <p className="truncate text-xs text-slate-400">{member.email}</p>
                        </div>
                        {isSelected && <Check className="h-5 w-5 text-cyan-400" />}
                      </button>
                    );
                  })}
              </div>

              <div className="mt-5 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setTransferMode(false)}
                  className="rounded-full px-5 py-2.5 text-sm font-semibold text-slate-300 transition-colors hover:bg-white/5"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={handleTransferAndLeave}
                  disabled={saving || !selectedLeaderId}
                  className="inline-flex items-center gap-2 rounded-full bg-cyan-500 px-5 py-2.5 text-sm font-semibold text-slate-950 transition-transform hover:scale-[1.01] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
                  Xác nhận và out
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid flex-1 gap-4 overflow-y-auto px-6 py-6 lg:grid-cols-[1fr_1fr]">
            <div className="space-y-4">
              {isLeader && (
                <section className="rounded-3xl border border-white/10 bg-white/5 p-5">
                  <div className="flex items-center gap-2">
                    <UserPlus className="h-4 w-4 text-cyan-400" />
                    <h3 className="text-sm font-semibold uppercase tracking-[0.25em] text-slate-400">Thêm thành viên</h3>
                  </div>

                  <div className="relative mt-4">
                    <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                    <input
                      value={friendSearch}
                      onChange={(e) => setFriendSearch(e.target.value)}
                      placeholder="Tìm bạn bè để thêm..."
                      className="w-full rounded-2xl border border-white/10 bg-slate-900 py-3 pl-10 pr-4 text-sm text-white outline-none focus:border-cyan-400/40"
                    />
                  </div>

                  <div className="mt-4 max-h-64 space-y-2 overflow-y-auto pr-1">
                    {loadingFriends ? (
                      <div className="flex items-center justify-center py-8 text-slate-400">
                        <Loader2 className="h-5 w-5 animate-spin" />
                      </div>
                    ) : filteredFriends.length === 0 ? (
                      <p className="py-8 text-center text-sm text-slate-400">Không có bạn bè phù hợp</p>
                    ) : (
                      filteredFriends.map((friend) => {
                        const isSelected = pendingAddIds.includes(friend.id);
                        return (
                          <button
                            key={friend.id}
                            type="button"
                            onClick={() => togglePendingFriend(friend.id)}
                            className={`flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-colors ${isSelected ? "border-cyan-400/40 bg-cyan-500/10" : "border-white/10 bg-slate-900 hover:bg-white/5"}`}
                          >
                            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-linear-to-br from-indigo-500 to-cyan-500 text-sm font-bold text-white">
                              {(friend.name || friend.email || "?")[0]?.toUpperCase() || "?"}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-semibold text-white">{friend.name || friend.email}</p>
                              <p className="truncate text-xs text-slate-400">{friend.email}</p>
                            </div>
                            <div className={`flex h-6 w-6 items-center justify-center rounded-full border ${isSelected ? "border-cyan-400 bg-cyan-400" : "border-slate-500"}`}>
                              {isSelected && <Plus className="h-3.5 w-3.5 text-slate-950" />}
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>

                  <div className="mt-4 flex items-center justify-between gap-3">
                    <p className="text-xs text-slate-400">Đã chọn: {pendingAddIds.length}</p>
                    <button
                      type="button"
                      onClick={handleAddMembers}
                      disabled={saving || pendingAddIds.length === 0}
                      className="inline-flex items-center gap-2 rounded-full bg-cyan-500 px-4 py-2.5 text-sm font-semibold text-slate-950 transition-transform hover:scale-[1.01] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                      Thêm vào nhóm
                    </button>
                  </div>
                </section>
              )}

              <section className="rounded-3xl border border-white/10 bg-white/5 p-5">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-cyan-400" />
                  <h3 className="text-sm font-semibold uppercase tracking-[0.25em] text-slate-400">Quyền thêm thành viên</h3>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setMemberAddMode("all")}
                    className={`rounded-2xl border px-4 py-3 text-sm font-semibold transition-colors ${memberAddMode === "all" ? "border-cyan-400/40 bg-cyan-500/10 text-white" : "border-white/10 bg-slate-900 text-slate-300 hover:bg-white/5"}`}
                  >
                    Mọi người đều thêm
                  </button>
                  <button
                    type="button"
                    onClick={() => setMemberAddMode("leader_only")}
                    className={`rounded-2xl border px-4 py-3 text-sm font-semibold transition-colors ${memberAddMode === "leader_only" ? "border-cyan-400/40 bg-cyan-500/10 text-white" : "border-white/10 bg-slate-900 text-slate-300 hover:bg-white/5"}`}
                  >
                    Chỉ nhóm trưởng
                  </button>
                </div>
              </section>

              <section className="rounded-3xl border border-white/10 bg-white/5 p-5">
                <div className="flex items-center gap-2">
                  <Lock className="h-4 w-4 text-cyan-400" />
                  <h3 className="text-sm font-semibold uppercase tracking-[0.25em] text-slate-400">Quyền gửi tin nhắn</h3>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setMessageSendMode("all")}
                    className={`rounded-2xl border px-4 py-3 text-sm font-semibold transition-colors ${messageSendMode === "all" ? "border-cyan-400/40 bg-cyan-500/10 text-white" : "border-white/10 bg-slate-900 text-slate-300 hover:bg-white/5"}`}
                  >
                    Mọi người gửi được
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMessageSendMode("restricted");
                      if (allowedSenderIds.length === 0 && conversation.leaderId) {
                        setAllowedSenderIds([conversation.leaderId]);
                      }
                    }}
                    className={`rounded-2xl border px-4 py-3 text-sm font-semibold transition-colors ${messageSendMode === "restricted" ? "border-cyan-400/40 bg-cyan-500/10 text-white" : "border-white/10 bg-slate-900 text-slate-300 hover:bg-white/5"}`}
                  >
                    Chỉ người được chọn
                  </button>
                </div>

                {messageSendMode === "restricted" && (
                  <div className="mt-4 rounded-2xl border border-white/10 bg-slate-900 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-400">Người được gửi tin nhắn</p>
                    <div className="mt-3 space-y-2">
                      {members.map((member) => {
                        const isAllowed = allowedSenderIds.includes(member.id) || member.id === conversation.leaderId;
                        return (
                          <button
                            key={member.id}
                            type="button"
                            onClick={() => member.id !== conversation.leaderId && toggleAllowedSender(member.id)}
                            className={`flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-colors ${isAllowed ? "border-cyan-400/40 bg-cyan-500/10" : "border-white/10 bg-white/5 hover:bg-white/10"}`}
                          >
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-linear-to-br from-indigo-500 to-cyan-500 text-xs font-bold text-white">
                              {(member.name || member.email || "?")[0]?.toUpperCase() || "?"}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-semibold text-white">{member.name || member.email}</p>
                              <p className="truncate text-xs text-slate-400">{member.id === conversation.leaderId ? "Nhóm trưởng" : "Thành viên"}</p>
                            </div>
                            {isAllowed ? <ShieldCheck className="h-5 w-5 text-cyan-400" /> : <Shield className="h-5 w-5 text-slate-500" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </section>
            </div>

            <div className="space-y-4">
              <section className="rounded-3xl border border-white/10 bg-white/5 p-5">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-cyan-400" />
                  <h3 className="text-sm font-semibold uppercase tracking-[0.25em] text-slate-400">Thành viên nhóm</h3>
                </div>

                <div className="relative mt-4">
                  <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <input
                    value={memberSearch}
                    onChange={(e) => setMemberSearch(e.target.value)}
                    placeholder="Tìm trong nhóm..."
                    className="w-full rounded-2xl border border-white/10 bg-slate-900 py-3 pl-10 pr-4 text-sm text-white outline-none focus:border-cyan-400/40"
                  />
                </div>

                <div className="mt-4 max-h-80 space-y-2 overflow-y-auto pr-1">
                  {filteredMembers.map((member) => {
                    const canPromote = isLeader && member.id !== conversation.leaderId;
                    const canKick = isLeader && member.id !== conversation.leaderId;
                    return (
                      <div key={member.id} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-900 px-4 py-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-linear-to-br from-indigo-500 to-cyan-500 text-sm font-bold text-white">
                          {(member.name || member.email || "?")[0]?.toUpperCase() || "?"}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-white">{member.name || member.email}</p>
                          <p className="truncate text-xs text-slate-400">
                            {member.id === conversation.leaderId ? "Nhóm trưởng" : "Thành viên"}
                          </p>
                        </div>

                        {member.id === currentUserId && (
                          <span className="rounded-full border border-cyan-400/30 bg-cyan-500/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.25em] text-cyan-300">
                            Bạn
                          </span>
                        )}

                        {canPromote && (
                          <button
                            type="button"
                            onClick={() => handlePromote(member.id)}
                            className="rounded-full bg-white/5 p-2 text-slate-300 transition-colors hover:bg-white/10"
                            title="Set làm nhóm trưởng"
                          >
                            <UserCog className="h-4 w-4" />
                          </button>
                        )}

                        {canKick && (
                          <button
                            type="button"
                            onClick={() => handleKick(member.id)}
                            className="rounded-full bg-rose-500/10 p-2 text-rose-300 transition-colors hover:bg-rose-500/20"
                            title="Kick khỏi nhóm"
                          >
                            <UserMinus className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>

              <section className="rounded-3xl border border-white/10 bg-white/5 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-400">Hành động nhóm</p>
                <div className="mt-4 flex flex-wrap gap-3">
                  {isLeader ? (
                    <>
                      <button
                        type="button"
                        onClick={handleLeave}
                        className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-white/10"
                      >
                        <LogOut className="h-4 w-4" />
                        Out group
                      </button>
                      <button
                        type="button"
                        onClick={handleDissolve}
                        disabled={saving}
                        className="inline-flex items-center gap-2 rounded-full bg-rose-500 px-4 py-2.5 text-sm font-semibold text-white transition-transform hover:scale-[1.01] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                        Giải tán nhóm
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={handleLeave}
                      className="inline-flex items-center gap-2 rounded-full bg-rose-500 px-4 py-2.5 text-sm font-semibold text-white transition-transform hover:scale-[1.01] active:scale-[0.99]"
                    >
                      <LogOut className="h-4 w-4" />
                      Leave group
                    </button>
                  )}
                </div>
                {isLeader && (
                  <p className="mt-3 text-xs text-slate-400">Khi bấm Out group, bạn phải chọn một thành viên để bổ nhiệm nhóm trưởng trước.</p>
                )}
              </section>
            </div>
          </div>
        )}

        {!transferMode && (
          <div className="flex items-center justify-end gap-3 border-t border-white/10 bg-black/20 px-6 py-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full px-5 py-2.5 text-sm font-semibold text-slate-300 transition-colors hover:bg-white/5 hover:text-white"
            >
              Đóng
            </button>
            <button
              type="button"
              onClick={handleSavePermissions}
              disabled={saving || !isLeader}
              className="inline-flex items-center gap-2 rounded-full bg-cyan-500 px-5 py-2.5 text-sm font-semibold text-slate-950 transition-transform hover:scale-[1.01] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              Lưu quyền
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
