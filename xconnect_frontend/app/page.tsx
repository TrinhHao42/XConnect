"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth.store";
import { Loader2 } from "lucide-react";

export default function HomePage() {
  const router = useRouter();
  const { token, isAuthenticated } = useAuthStore();

  useEffect(() => {
    // Client-side SPA redirect to avoid Capacitor native server routing hangs
    if (token && isAuthenticated) {
      router.replace("/chat");
    } else {
      router.replace("/login");
    }
  }, [token, isAuthenticated, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
        <p className="text-sm text-slate-400 font-medium">XConnect đang khởi động...</p>
      </div>
    </div>
  );
}
