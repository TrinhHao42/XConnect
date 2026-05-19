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
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
          <p className="text-sm text-slate-400 font-medium animate-pulse">Đang xác thực...</p>
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
