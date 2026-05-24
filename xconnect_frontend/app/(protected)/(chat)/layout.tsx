"use client";

import Sidebar from "@/components/chat/Sidebar";
import BottomNavigation from "@/components/chat/BottomNavigation";
import GlobalCallManager from "@/components/call/GlobalCallManager";
import { ReactNode, useEffect, useState } from "react";
import { useAuthStore } from "@/store/auth.store";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function ChatLayout({ children }: { children: ReactNode }) {
  const { token, isAuthenticated } = useAuthStore();
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (!token || !isAuthenticated) {
      router.push("/login");
    } else {
      setChecking(false);
    }
  }, [token, isAuthenticated, router]);

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="relative w-full max-w-md overflow-hidden rounded-4xl glass-panel aurora-shimmer px-8 py-10 text-center pop-in">
          <div className="absolute inset-0 bg-linear-to-br from-cyan-400/12 via-transparent to-indigo-500/12" />
          <div className="relative flex flex-col items-center gap-5">
            <div className="relative flex h-20 w-20 items-center justify-center rounded-[1.75rem] bg-white/8 ring-1 ring-white/10 shadow-2xl shadow-cyan-500/10">
              <div className="absolute inset-0 rounded-[1.75rem] border border-white/10" />
              <Loader2 className="relative h-9 w-9 animate-spin text-cyan-200" />
              <div className="absolute inset-[22%] rounded-full bg-cyan-300/30 blur-xl" />
            </div>
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.32em] text-cyan-100/70">XConnect</p>
              <p className="text-sm text-slate-200/80 font-medium animate-pulse">Đang xác thực phiên làm việc...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background overflow-hidden relative">
      <Sidebar />
      <main className="flex-1 overflow-hidden">
        {children}
      </main>
      <BottomNavigation />
      <GlobalCallManager />
    </div>
  );
}
