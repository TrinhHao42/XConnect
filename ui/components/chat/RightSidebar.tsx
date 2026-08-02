"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/libs/api";
import { useAuthStore } from "@/store/auth.store";
import { useChatStore } from "@/store/chat.store";
import { Conversation } from "@/types";
import { toast } from "sonner";
import { useLanguageStore } from "@/store/language.store";
import {
  Bell,
  BellOff,
  Pin,
  UserPlus,
  Settings,
  ChevronDown,
  ChevronRight,
  FileText,
  Link2,
  Image as ImageIcon,
  Shield,
  Trash2,
  LogOut,
  X,
  Search,
  Plus,
  Loader2,
  Check,
  UserMinus,
  UserCog,
  Users,
} from "lucide-react";

interface Friend {
  id: string;
  name?: string;
  email: string;
  avatar?: string;
  bio?: string;
}

interface RightSidebarProps {
  isOpen: boolean;
  conversation: Conversation | null;
  onClose: () => void;
  onPreviewImage?: (url: string) => void;
}

const translations = {
  en: {
    groupInfo: "Group Info",
    conversationInfo: "Conversation Info",
    mute: "Mute",
    unmute: "Unmute",
    pin: "Pin",
    unpin: "Unpin",
    addMember: "Add member",
    manageGroup: "Manage group",
    createGroup: "Create group",
    members: "Group members",
    mutualGroups: "Mutual groups",
    media: "Photos/Videos",
    files: "Files",
    links: "Links",
    security: "Security settings",
    groupActions: "Group Actions",
    outGroup: "Out group",
    dissolveGroup: "Dissolve group",
    noMedia: "No photos or videos shared yet",
    noFiles: "No files shared yet",
    noLinks: "No links shared yet",
    searchMembers: "Search members...",
    addMemberTitle: "Add members to group",
    permissions: "Group Permissions",
    whoCanAdd: "Who can add members?",
    whoCanSend: "Who can send messages?",
    allMembers: "All members",
    leaderOnly: "Leader only",
    restricted: "Only selected members",
    save: "Save permissions",
    cancel: "Cancel",
    close: "Close",
    you: "You",
    kick: "Kick member",
    promote: "Set as leader",
    searchFriends: "Search friends...",
    done: "Done",
    bulletinBoard: "Group Bulletin Board",
    reminders: "Reminders List",
    notes: "Notes, pins, polls",
    emptyList: "Empty list",
  },
  vi: {
    groupInfo: "Thông tin nhóm",
    conversationInfo: "Thông tin hội thoại",
    mute: "Tắt thông báo",
    unmute: "Bật thông báo",
    pin: "Ghim hội thoại",
    unpin: "Bỏ ghim",
    addMember: "Thêm thành viên",
    manageGroup: "Quản lý nhóm",
    createGroup: "Tạo nhóm trò chuyện",
    members: "Thành viên nhóm",
    mutualGroups: "Nhóm chung",
    media: "Ảnh/Video",
    files: "File",
    links: "Link",
    security: "Thiết lập bảo mật",
    groupActions: "Hành động nhóm",
    outGroup: "Out group",
    dissolveGroup: "Giải tán nhóm",
    noMedia: "Chưa có Ảnh/Video được chia sẻ trong hội thoại này",
    noFiles: "Chưa có File được chia sẻ trong hội thoại này",
    noLinks: "Chưa có Link được chia sẻ trong hội thoại này",
    searchMembers: "Tìm thành viên...",
    addMemberTitle: "Thêm thành viên vào nhóm",
    permissions: "Quyền nhóm",
    whoCanAdd: "Quyền thêm thành viên",
    whoCanSend: "Quyền gửi tin nhắn",
    allMembers: "Mọi người đều thêm",
    leaderOnly: "Chỉ nhóm trưởng",
    restricted: "Chỉ người được chọn",
    save: "Lưu quyền",
    cancel: "Hủy",
    close: "Đóng",
    you: "Bạn",
    kick: "Kick khỏi nhóm",
    promote: "Set làm nhóm trưởng",
    searchFriends: "Tìm bạn bè để thêm...",
    done: "Hoàn tất",
    bulletinBoard: "Bảng tin nhóm",
    reminders: "Danh sách nhắc hẹn",
    notes: "Ghi chú, ghim, bình chọn",
    emptyList: "Chưa có mục nào",
  }
};

export default function RightSidebar({ isOpen, conversation, onClose, onPreviewImage }: RightSidebarProps) {
  const { user } = useAuthStore();
  const { conversations, setConversations, setActiveRoom, messagesByRoom } = useChatStore();
  const { language } = useLanguageStore();
  const t = translations[language];

  // Accordion states
  const [showMembers, setShowMembers] = useState(true);
  const [showMedia, setShowMedia] = useState(true);
  const [showFiles, setShowFiles] = useState(false);
  const [showBulletin, setShowBulletin] = useState(false);
  const [showSecurity, setShowSecurity] = useState(false);

  // Group sub-views
  const [isManagingGroup, setIsManagingGroup] = useState(false);
  const [isAddingMembers, setIsAddingMembers] = useState(false);
  const [isTransferringLeader, setIsTransferringLeader] = useState(false);

  // Friends & Members Search
  const [friends, setFriends] = useState<Friend[]>([]);
  const [friendSearch, setFriendSearch] = useState("");
  const [memberSearch, setMemberSearch] = useState("");
  const [pendingAddIds, setPendingAddIds] = useState<string[]>([]);
  const [loadingFriends, setLoadingFriends] = useState(false);
  const [saving, setSaving] = useState(false);

  // Mute & Pin state
  const [isMuted, setIsMuted] = useState(false);
  const [isPinned, setIsPinned] = useState(false);

  // Group permissions state
  const [memberAddMode, setMemberAddMode] = useState<"all" | "leader_only">("all");
  const [messageSendMode, setMessageSendMode] = useState<"all" | "restricted">("all");
  const [allowedSenderIds, setAllowedSenderIds] = useState<string[]>([]);
  const [selectedLeaderId, setSelectedLeaderId] = useState<string>("");

  const currentUserId = user?.id || "";
  const isGroup = conversation?.kind === "group";
  const members = conversation?.participants || [];
  const isLeader = conversation?.leaderId === currentUserId;
  const otherParticipant = conversation?.participants?.find((p) => p.id !== currentUserId);

  useEffect(() => {
    if (!isOpen || !conversation) return;
    setIsManagingGroup(false);
    setIsAddingMembers(false);
    setIsTransferringLeader(false);
    setMemberAddMode(conversation.memberAddMode || "all");
    setMessageSendMode(conversation.messageSendMode || "all");
    setAllowedSenderIds(conversation.allowedSenderIds || (conversation.leaderId ? [conversation.leaderId] : []));
    setPendingAddIds([]);
    setFriendSearch("");
    setMemberSearch("");
    setSelectedLeaderId(conversation.participants?.find((m) => m.id !== currentUserId)?.id || "");
  }, [conversation, currentUserId, isOpen]);

  // Load friends list when panel is opened and it is a group
  useEffect(() => {
    if (!isOpen || !conversation || !isGroup || !isAddingMembers) return;

    const loadFriends = async () => {
      setLoadingFriends(true);
      try {
        const data = await api.get<Friend[]>("/friend/list");
        setFriends(data || []);
      } catch (error) {
        console.error("Failed to load friends in RightSidebar", error);
        toast.error(language === "vi" ? "Không tải được danh sách bạn bè" : "Failed to load friends list");
      } finally {
        setLoadingFriends(false);
      }
    };

    loadFriends();
  }, [conversation, isGroup, isOpen, isAddingMembers, language]);

  // Extract shared media (images) from current conversation's message history
  const sharedImages = useMemo(() => {
    if (!conversation) return [];
    const room = messagesByRoom[conversation.id];
    if (!room || !room.messages) return [];
    return room.messages
      .filter((msg) => msg.type === "image" || msg.content.startsWith("data:image/"))
      .map((msg) => msg.content);
  }, [conversation, messagesByRoom]);

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

  if (!isOpen || !conversation) return null;

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
      toast.success(language === "vi" ? "Đã cập nhật quyền nhóm" : "Permissions updated successfully");
      setIsManagingGroup(false);
    } catch (error: any) {
      toast.error(error?.message || (language === "vi" ? "Không thể cập nhật quyền" : "Failed to update permissions"));
    } finally {
      setSaving(false);
    }
  };

  const handleAddMembers = async () => {
    if (pendingAddIds.length === 0) return;

    setSaving(true);
    try {
      await api.post(`/chat/groups/${conversation.id}/members`, { memberIds: pendingAddIds });
      setPendingAddIds([]);
      setFriendSearch("");
      await refreshConversations();
      toast.success(language === "vi" ? "Đã thêm thành viên" : "Members added successfully");
      setIsAddingMembers(false);
    } catch (error: any) {
      toast.error(error?.message || (language === "vi" ? "Không thể thêm thành viên" : "Failed to add members"));
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
      toast.success(language === "vi" ? "Đã chuyển nhóm trưởng" : "Leader promoted successfully");
    } catch (error: any) {
      toast.error(error?.message || (language === "vi" ? "Không thể chuyển nhóm trưởng" : "Failed to promote leader"));
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
      toast.success(language === "vi" ? "Đã loại bỏ thành viên" : "Member removed successfully");
    } catch (error: any) {
      toast.error(error?.message || (language === "vi" ? "Không thể loại bỏ thành viên" : "Failed to remove member"));
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
      toast.success(language === "vi" ? "Đã giải tán nhóm" : "Group dissolved successfully");
      onClose();
    } catch (error: any) {
      toast.error(error?.message || (language === "vi" ? "Không thể giải tán nhóm" : "Failed to dissolve group"));
    } finally {
      setSaving(false);
    }
  };

  const handleLeave = async () => {
    if (isLeader) {
      setIsTransferringLeader(true);
      return;
    }

    setSaving(true);
    try {
      await api.post(`/chat/groups/${conversation.id}/leave`, {});
      await refreshConversations();
      setActiveRoom(null);
      toast.success(language === "vi" ? "Bạn đã rời nhóm" : "You have left the group");
      onClose();
    } catch (error: any) {
      toast.error(error?.message || (language === "vi" ? "Không thể rời nhóm" : "Failed to leave group"));
    } finally {
      setSaving(false);
    }
  };

  const handleTransferAndLeave = async () => {
    if (!selectedLeaderId) {
      toast.error(language === "vi" ? "Vui lòng chọn nhóm trưởng mới" : "Please select a new group leader");
      return;
    }

    setSaving(true);
    try {
      await api.post(`/chat/groups/${conversation.id}/leader-and-leave`, { newLeaderId: selectedLeaderId });
      await refreshConversations();
      setActiveRoom(null);
      toast.success(language === "vi" ? "Đã chuyển quyền và rời nhóm" : "Transferred leadership and left the group");
      onClose();
    } catch (error: any) {
      toast.error(error?.message || (language === "vi" ? "Không thể thực hiện rời nhóm" : "Failed to leave group"));
    } finally {
      setSaving(false);
    }
  };

  const chatTitle = isGroup
    ? conversation.name || `Group (${members.length})`
    : otherParticipant?.name || otherParticipant?.email || "Chat";

  return (
    <div className="w-full md:w-80 lg:w-96 absolute md:relative inset-y-0 right-0 z-50 bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 h-full flex flex-col shrink-0 overflow-hidden shadow-2xl transition-all duration-300">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 px-5 py-4">
        <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
          {isGroup ? <Users className="w-5 h-5 text-cyan-500" /> : <Shield className="w-5 h-5 text-indigo-500" />}
          {isGroup ? t.groupInfo : t.conversationInfo}
        </h2>
        <button onClick={onClose} className="rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 p-1.5 text-slate-500 dark:text-slate-400">
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Main Contents Area */}
      <div className="flex-1 overflow-y-auto">
        {isAddingMembers ? (
          /* View: Add Members to Group */
          <div className="p-4 space-y-4">
            <button
              onClick={() => setIsAddingMembers(false)}
              className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-cyan-500"
            >
              ← {t.cancel}
            </button>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">{t.addMemberTitle}</h3>
            
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                value={friendSearch}
                onChange={(e) => setFriendSearch(e.target.value)}
                placeholder={t.searchFriends}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:border-cyan-500 text-slate-900 dark:text-white"
              />
            </div>

            <div className="space-y-1 max-h-[380px] overflow-y-auto pr-1">
              {loadingFriends ? (
                <div className="flex items-center justify-center py-8 text-slate-400">
                  <Loader2 className="h-5 w-5 animate-spin" />
                </div>
              ) : filteredFriends.length === 0 ? (
                <p className="py-8 text-center text-xs text-slate-400">{language === "vi" ? "Không có bạn bè mới nào để thêm" : "No new friends to add"}</p>
              ) : (
                filteredFriends.map((friend) => {
                  const isSelected = pendingAddIds.includes(friend.id);
                  return (
                    <button
                      key={friend.id}
                      onClick={() => togglePendingFriend(friend.id)}
                      className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2 text-left transition-colors ${isSelected ? "border-cyan-500 bg-cyan-500/10" : "border-slate-100 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50"}`}
                    >
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-linear-to-br from-indigo-500 to-cyan-500 text-xs font-bold text-white">
                        {(friend.name || friend.email || "?")[0]?.toUpperCase() || "?"}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-semibold text-slate-900 dark:text-white">{friend.name || friend.email}</p>
                        <p className="truncate text-[10px] text-slate-500">{friend.email}</p>
                      </div>
                      <div className={`flex h-5 w-5 items-center justify-center rounded-full border ${isSelected ? "border-cyan-500 bg-cyan-500 text-white" : "border-slate-300 dark:border-slate-600"}`}>
                        {isSelected && <Plus className="h-3 w-3 text-white dark:text-slate-900" />}
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            <div className="flex items-center justify-end border-t border-slate-100 dark:border-slate-800 pt-3">
              <button
                onClick={handleAddMembers}
                disabled={saving || pendingAddIds.length === 0}
                className="inline-flex items-center gap-1.5 rounded-full bg-cyan-500 px-4 py-1.5 text-xs font-bold text-slate-950 hover:scale-[1.03] disabled:opacity-50"
              >
                {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {t.done}
              </button>
            </div>
          </div>
        ) : isManagingGroup ? (
          /* View: Manage Group settings & permissions */
          <div className="p-4 space-y-4">
            <button
              onClick={() => setIsManagingGroup(false)}
              className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-cyan-500"
            >
              ← {t.cancel}
            </button>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">{t.permissions}</h3>

            <div className="space-y-4">
              {/* Add permission */}
              <div className="space-y-1.5">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t.whoCanAdd}</span>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    onClick={() => setMemberAddMode("all")}
                    className={`rounded-xl border px-3 py-2 text-xs font-semibold ${memberAddMode === "all" ? "border-cyan-500 bg-cyan-500/10 text-cyan-600 dark:text-cyan-400" : "border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40"}`}
                  >
                    {t.allMembers}
                  </button>
                  <button
                    onClick={() => setMemberAddMode("leader_only")}
                    className={`rounded-xl border px-3 py-2 text-xs font-semibold ${memberAddMode === "leader_only" ? "border-cyan-500 bg-cyan-500/10 text-cyan-600 dark:text-cyan-400" : "border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40"}`}
                  >
                    {t.leaderOnly}
                  </button>
                </div>
              </div>

              {/* Message permission */}
              <div className="space-y-1.5">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t.whoCanSend}</span>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    onClick={() => setMessageSendMode("all")}
                    className={`rounded-xl border px-3 py-2 text-xs font-semibold ${messageSendMode === "all" ? "border-cyan-500 bg-cyan-500/10 text-cyan-600 dark:text-cyan-400" : "border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40"}`}
                  >
                    {t.allMembers}
                  </button>
                  <button
                    onClick={() => {
                      setMessageSendMode("restricted");
                      if (allowedSenderIds.length === 0 && conversation.leaderId) {
                        setAllowedSenderIds([conversation.leaderId]);
                      }
                    }}
                    className={`rounded-xl border px-3 py-2 text-xs font-semibold ${messageSendMode === "restricted" ? "border-cyan-500 bg-cyan-500/10 text-cyan-600 dark:text-cyan-400" : "border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40"}`}
                  >
                    {t.restricted}
                  </button>
                </div>
              </div>

              {/* Restricted Sender Selection list */}
              {messageSendMode === "restricted" && (
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-3 bg-slate-50/50 dark:bg-slate-900/50 max-h-48 overflow-y-auto space-y-1.5">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Allowed senders list</p>
                  {members.map((m) => {
                    const isAllowed = allowedSenderIds.includes(m.id) || m.id === conversation.leaderId;
                    const canToggle = m.id !== conversation.leaderId;
                    return (
                      <button
                        key={m.id}
                        disabled={!canToggle}
                        onClick={() => toggleAllowedSender(m.id)}
                        className={`flex w-full items-center gap-2 rounded-lg border p-2 text-left text-xs ${isAllowed ? "border-cyan-500 bg-cyan-500/5" : "border-slate-100 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800"}`}
                      >
                        <div className="w-6 h-6 rounded-md bg-linear-to-br from-indigo-500 to-cyan-500 text-[10px] font-bold text-white flex items-center justify-center">
                          {(m.name || m.email || "?")[0]?.toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="truncate font-semibold text-slate-700 dark:text-slate-300">{m.name || m.email}</p>
                        </div>
                        {isAllowed ? <Check className="w-4 h-4 text-cyan-500" /> : <div className="w-4 h-4 rounded-full border border-slate-300 dark:border-slate-700" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <button
              onClick={handleSavePermissions}
              disabled={saving}
              className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-cyan-500 py-2.5 text-xs font-bold text-slate-950 shadow-md hover:scale-[1.01]"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {t.save}
            </button>
          </div>
        ) : isTransferringLeader ? (
          /* View: Transfer leadership and leave */
          <div className="p-4 space-y-4">
            <button
              onClick={() => setIsTransferringLeader(false)}
              className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-cyan-500"
            >
              ← {t.cancel}
            </button>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">{t.outGroup}</h3>
            <p className="text-xs text-slate-400">Chọn một thành viên khác để làm nhóm trưởng trước khi bạn rời nhóm.</p>

            <div className="space-y-1 max-h-64 overflow-y-auto">
              {members
                .filter((m) => m.id !== currentUserId)
                .map((m) => {
                  const isSelected = selectedLeaderId === m.id;
                  return (
                    <button
                      key={m.id}
                      onClick={() => setSelectedLeaderId(m.id)}
                      className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2 text-left ${isSelected ? "border-cyan-500 bg-cyan-500/10" : "border-slate-100 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800"}`}
                    >
                      <div className="w-8 h-8 rounded-lg bg-linear-to-br from-indigo-500 to-cyan-500 text-xs font-bold text-white flex items-center justify-center">
                        {(m.name || m.email || "?")[0]?.toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-semibold text-slate-900 dark:text-white">{m.name || m.email}</p>
                        <p className="truncate text-[10px] text-slate-500">{m.email}</p>
                      </div>
                      {isSelected && <Check className="w-4 h-4 text-cyan-500" />}
                    </button>
                  );
                })}
            </div>

            <button
              onClick={handleTransferAndLeave}
              disabled={saving || !selectedLeaderId}
              className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-rose-500 py-2.5 text-xs font-bold text-white shadow-md hover:scale-[1.01]"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              Xác nhận và rời nhóm
            </button>
          </div>
        ) : (
          /* Normal Sidebar View */
          <div className="pb-6">
            {/* Top Area: Avatar & Profile */}
            <div className="flex flex-col items-center justify-center text-center px-4 py-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/20">
              <div className="w-20 h-20 rounded-full bg-linear-to-tr from-indigo-500 to-cyan-500 text-white flex items-center justify-center text-3xl font-bold shadow-lg overflow-hidden mb-3">
                {isGroup ? (
                  chatTitle[0]?.toUpperCase() || "?"
                ) : otherParticipant?.avatar ? (
                  <img src={otherParticipant.avatar} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  chatTitle[0]?.toUpperCase() || "?"
                )}
              </div>
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center justify-center gap-1.5">
                {chatTitle}
              </h3>
              {!isGroup && otherParticipant?.bio && (
                <p className="text-xs text-slate-500 max-w-[80%] truncate mt-1 italic">"{otherParticipant.bio}"</p>
              )}

              {/* Action Circle Buttons */}
              <div className="flex items-center gap-4 mt-6">
                {/* Mute Button */}
                <button
                  onClick={() => {
                    setIsMuted(!isMuted);
                    toast.success(isMuted ? "Bật thông báo" : "Tắt thông báo thành công");
                  }}
                  className="flex flex-col items-center gap-1 cursor-pointer group"
                >
                  <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center group-hover:scale-105 active:scale-95 transition-transform">
                    {isMuted ? <BellOff className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
                  </div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{t.mute}</span>
                </button>

                {/* Pin Button */}
                <button
                  onClick={() => {
                    setIsPinned(!isPinned);
                    toast.success(isPinned ? "Bỏ ghim thành công" : "Ghim hội thoại thành công");
                  }}
                  className="flex flex-col items-center gap-1 cursor-pointer group"
                >
                  <div className={`w-10 h-10 rounded-full text-slate-600 dark:text-slate-300 flex items-center justify-center group-hover:scale-105 active:scale-95 transition-transform ${isPinned ? "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400" : "bg-slate-100 dark:bg-slate-800"}`}>
                    <Pin className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{isPinned ? t.unpin : t.pin}</span>
                </button>

                {/* Add member (Group) / Create Group (1-1) */}
                {isGroup ? (
                  <button
                    onClick={() => setIsAddingMembers(true)}
                    className="flex flex-col items-center gap-1 cursor-pointer group"
                  >
                    <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center group-hover:scale-105 active:scale-95 transition-transform">
                      <UserPlus className="w-4 h-4" />
                    </div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{t.addMember}</span>
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      toast.info("Tính năng tạo nhóm nhanh đang được xây dựng!");
                    }}
                    className="flex flex-col items-center gap-1 cursor-pointer group"
                  >
                    <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center group-hover:scale-105 active:scale-95 transition-transform">
                      <UserPlus className="w-4 h-4" />
                    </div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{t.createGroup}</span>
                  </button>
                )}

                {/* Manage Settings (Group only) */}
                {isGroup && isLeader && (
                  <button
                    onClick={() => setIsManagingGroup(true)}
                    className="flex flex-col items-center gap-1 cursor-pointer group"
                  >
                    <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center group-hover:scale-105 active:scale-95 transition-transform">
                      <Settings className="w-4 h-4" />
                    </div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{t.manageGroup}</span>
                  </button>
                )}
              </div>
            </div>

            {/* Accordion 1: Members (Groups only) */}
            {isGroup && (
              <div className="border-b border-slate-100 dark:border-slate-800">
                <button
                  onClick={() => setShowMembers(!showMembers)}
                  className="w-full flex items-center justify-between px-5 py-4 text-left font-bold text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider hover:bg-slate-50 dark:hover:bg-slate-800/40"
                >
                  <span className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    {t.members} ({members.length})
                  </span>
                  {showMembers ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </button>
                {showMembers && (
                  <div className="px-5 pb-4 space-y-2 max-h-64 overflow-y-auto">
                    {/* Member search inside panel */}
                    <div className="relative mb-3">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                      <input
                        value={memberSearch}
                        onChange={(e) => setMemberSearch(e.target.value)}
                        placeholder={t.searchMembers}
                        className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs outline-none focus:border-cyan-500 text-slate-900 dark:text-white"
                      />
                    </div>
                    
                    {filteredMembers.map((m) => {
                      const canPromote = isLeader && m.id !== conversation.leaderId;
                      const canKick = isLeader && m.id !== conversation.leaderId;
                      return (
                        <div key={m.id} className="flex items-center gap-2.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 p-2 group/member">
                          <div className="w-7 h-7 rounded-md bg-linear-to-br from-indigo-500 to-cyan-500 text-[10px] font-bold text-white flex items-center justify-center shrink-0">
                            {(m.name || m.email || "?")[0]?.toUpperCase()}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-semibold text-slate-800 dark:text-slate-200">
                              {m.name || m.email}
                              {m.id === currentUserId && <span className="text-[10px] text-cyan-600 dark:text-cyan-400 font-medium ml-1">({t.you})</span>}
                            </p>
                            <p className="truncate text-[9px] text-slate-400">
                              {m.id === conversation.leaderId ? (language === "vi" ? "Nhóm trưởng" : "Leader") : (language === "vi" ? "Thành viên" : "Member")}
                            </p>
                          </div>

                          {/* Member actions (Leader cog, Kick button) */}
                          <div className="hidden group-hover/member:flex items-center gap-1 transition-opacity">
                            {canPromote && (
                              <button
                                onClick={() => handlePromote(m.id)}
                                className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded text-slate-500"
                                title={t.promote}
                              >
                                <UserCog className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {canKick && (
                              <button
                                onClick={() => handleKick(m.id)}
                                className="p-1 hover:bg-rose-100 dark:hover:bg-rose-950 rounded text-rose-500"
                                title={t.kick}
                              >
                                <UserMinus className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Accordion 2: Bulletin Board (Group Bulletin/Reminders - Group only) */}
            {isGroup && (
              <div className="border-b border-slate-100 dark:border-slate-800">
                <button
                  onClick={() => setShowBulletin(!showBulletin)}
                  className="w-full flex items-center justify-between px-5 py-4 text-left font-bold text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider hover:bg-slate-50 dark:hover:bg-slate-800/40"
                >
                  <span className="flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    {t.bulletinBoard}
                  </span>
                  {showBulletin ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </button>
                {showBulletin && (
                  <div className="px-5 pb-4 space-y-3">
                    <div className="rounded-xl border border-slate-100 dark:border-slate-800 p-3 bg-slate-50/50 dark:bg-slate-900/30">
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">{t.reminders}</p>
                      <p className="text-xs text-slate-400 italic">{t.emptyList}</p>
                    </div>
                    <div className="rounded-xl border border-slate-100 dark:border-slate-800 p-3 bg-slate-50/50 dark:bg-slate-900/30">
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">{t.notes}</p>
                      <p className="text-xs text-slate-400 italic">{t.emptyList}</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Accordion 3: Shared Media (Photos/Videos) */}
            <div className="border-b border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setShowMedia(!showMedia)}
                className="w-full flex items-center justify-between px-5 py-4 text-left font-bold text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider hover:bg-slate-50 dark:hover:bg-slate-800/40"
              >
                <span className="flex items-center gap-2">
                  <ImageIcon className="w-4 h-4" />
                  {t.media} ({sharedImages.length})
                </span>
                {showMedia ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </button>
              {showMedia && (
                <div className="px-5 pb-4">
                  {sharedImages.length === 0 ? (
                    <p className="text-xs text-slate-400 italic text-center py-4">{t.noMedia}</p>
                  ) : (
                    <div className="grid grid-cols-4 gap-1.5">
                      {sharedImages.map((src, index) => (
                        <button
                          key={index}
                          type="button"
                          onClick={() => onPreviewImage?.(src)}
                          className="aspect-square rounded-lg bg-slate-100 dark:bg-slate-800 overflow-hidden border border-slate-200 dark:border-slate-700 block hover:scale-[1.02] active:scale-[0.98] transition-all"
                          title="Bấm để xem ảnh lớn"
                        >
                          <img src={src} alt="Shared" className="w-full h-full object-cover hover:scale-110 transition-transform duration-300" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Accordion 4: Files */}
            <div className="border-b border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setShowFiles(!showFiles)}
                className="w-full flex items-center justify-between px-5 py-4 text-left font-bold text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider hover:bg-slate-50 dark:hover:bg-slate-800/40"
              >
                <span className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  {t.files}
                </span>
                {showFiles ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </button>
              {showFiles && (
                <div className="px-5 pb-4">
                  <p className="text-xs text-slate-400 italic text-center py-4">{t.noFiles}</p>
                </div>
              )}
            </div>

            {/* Accordion 5: Shared Links (1-1 only) */}
            {!isGroup && (
              <div className="border-b border-slate-100 dark:border-slate-800">
                <button
                  className="w-full flex items-center justify-between px-5 py-4 text-left font-bold text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider hover:bg-slate-50 dark:hover:bg-slate-800/40"
                >
                  <span className="flex items-center gap-2">
                    <Link2 className="w-4 h-4" />
                    {t.links}
                  </span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Accordion 6: Security Settings / Thiết lập bảo mật (1-1 only) */}
            {!isGroup && (
              <div className="border-b border-slate-100 dark:border-slate-800">
                <button
                  onClick={() => setShowSecurity(!showSecurity)}
                  className="w-full flex items-center justify-between px-5 py-4 text-left font-bold text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider hover:bg-slate-50 dark:hover:bg-slate-800/40"
                >
                  <span className="flex items-center gap-2">
                    <Shield className="w-4 h-4" />
                    {t.security}
                  </span>
                  {showSecurity ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </button>
                {showSecurity && (
                  <div className="px-5 pb-4 pt-1 space-y-2">
                    <button
                      onClick={() => toast.warning("Tính năng chặn bạn bè đang được hoàn thiện!")}
                      className="w-full text-left text-xs font-semibold text-rose-500 hover:underline py-1.5"
                    >
                      {language === "vi" ? "Chặn người dùng này" : "Block this user"}
                    </button>
                    <button
                      onClick={() => toast.warning("Tính năng báo cáo người dùng đang được hoàn thiện!")}
                      className="w-full text-left text-xs font-semibold text-slate-500 hover:underline py-1.5"
                    >
                      {language === "vi" ? "Báo cáo vi phạm" : "Report user"}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Accordion 7: Actions Group (Out group, Dissolve Group) */}
            {isGroup && (
              <div className="px-5 pt-5 space-y-2">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{t.groupActions}</p>
                <div className="flex gap-2">
                  <button
                    onClick={handleLeave}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-800/80 px-4 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-200 transition-all"
                  >
                    <LogOut className="w-4 h-4 text-slate-500" />
                    {t.outGroup}
                  </button>
                  {isLeader && (
                    <button
                      onClick={handleDissolve}
                      disabled={saving}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-rose-500 hover:bg-rose-600 px-4 py-2.5 text-xs font-bold text-white transition-all shadow-md disabled:opacity-50"
                    >
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                      {t.dissolveGroup}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
