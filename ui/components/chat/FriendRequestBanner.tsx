"use client";

import { UserPlus, MoreHorizontal, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { api } from "@/libs/api";
import { toast } from "sonner";
import { useLanguageStore } from "@/store/language.store";

interface FriendRequestBannerProps {
  receiverId: string;
  onSendRequest: () => void;
}

const translations = {
  en: {
    friendReqSent: "Friend request sent!",
    friendReqFailed: "Failed to send friend request",
    friendReqRejected: "Friend request rejected",
    sendAgain: "Send again?",
    sendReqToThisPerson: "Send a friend request to this person",
    send: "Send"
  },
  vi: {
    friendReqSent: "Đã gửi yêu cầu kết bạn!",
    friendReqFailed: "Không thể gửi yêu cầu kết bạn",
    friendReqRejected: "Yêu cầu kết bạn bị từ chối",
    sendAgain: "Gửi lại?",
    sendReqToThisPerson: "Gửi lời mời kết bạn cho người này",
    send: "Gửi"
  }
};

export default function FriendRequestBanner({ receiverId, onSendRequest }: FriendRequestBannerProps) {
  const [status, setStatus] = useState<"none" | "loading" | "sent" | "rejected" | "friends">("none");
  const { language } = useLanguageStore();
  const t = translations[language];

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const res = await api.get<{ status: string; side: string }>(`/friend/status/${receiverId}`);
        if (res.status === "friends") setStatus("friends");
        else if (res.status === "pending" && res.side === "sender") setStatus("sent");
        else if (res.status === "rejected" && res.side === "sender") setStatus("rejected");
        else setStatus("none");
      } catch (e) {
        console.error("Failed to check friend status:", e);
      }
    };
    checkStatus();
  }, [receiverId]);

  const handleSend = async () => {
    setStatus("loading");
    try {
      await api.post(`/friend/request/${receiverId}`, {});
      setStatus("sent");
      toast.success(t.friendReqSent);
      onSendRequest();
    } catch (e: any) {
      toast.error(e.message || t.friendReqFailed);
      setStatus("none");
    }
  };

  if (status === "friends") {
    return null;
  }

  if (status === "sent") {
    return (
      <div className="w-full bg-slate-50/80 dark:bg-slate-950/80 backdrop-blur-sm border-b border-slate-200 dark:border-slate-800 p-2 animate-in fade-in slide-in-from-top-2 duration-300">
        <div className="flex justify-center">
          <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 rounded-xl px-4 py-2 flex items-center gap-2">
            <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">
              {t.friendReqSent}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (status === "rejected") {
    return (
      <div className="w-full bg-slate-50/80 dark:bg-slate-950/80 backdrop-blur-sm border-b border-slate-200 dark:border-slate-800 p-2 animate-in fade-in slide-in-from-top-2 duration-300">
        <div className="flex justify-center">
          <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 rounded-xl px-4 py-2 flex items-center gap-4">
            <p className="text-[10px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-widest">
              {t.friendReqRejected}
            </p>
            <button 
              onClick={handleSend}
              className="text-[10px] font-bold text-rose-600 dark:text-rose-400 uppercase hover:underline"
            >
              {t.sendAgain}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl py-2 px-4 mx-4 my-2 flex items-center justify-center shadow-sm shadow-slate-200/50 dark:shadow-none transition-all">
      <div className="flex items-center gap-6 max-w-full">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400 shrink-0">
            <UserPlus className="w-4 h-4" />
          </div>

          <div className="min-w-0">
            <p className="font-semibold sm:text-base text-xs text-slate-700 dark:text-slate-200 truncate">
              {t.sendReqToThisPerson}
            </p>
          </div>
        </div>

        <button
          onClick={handleSend}
          disabled={status === "loading"}
          className="flex items-center justify-center min-w-[80px] h-10 px-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-slate-100 sm:text-sm text-xs font-bold rounded-lg transition-all active:scale-95 disabled:opacity-50 shrink-0"
        >
          {status === "loading" ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            t.send
          )}
        </button>
      </div>
    </div>
  );
}
