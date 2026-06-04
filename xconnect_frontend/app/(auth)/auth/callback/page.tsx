"use client";

import { useEffect } from "react";
import { supabase } from "@/libs/supabase";
import { api } from "@/libs/api";
import { useAuthStore } from "@/store/auth.store";
import { Loader2 } from "lucide-react";

export default function AuthCallbackPage() {
  const { setAuth } = useAuthStore();

  useEffect(() => {
    let active = true;

    const exchangeToken = async (session: any) => {
      if (!active) return;
      try {
        const response = await api.post<{ accessToken: string; user: any }>("/auth/supabase-login", {
          access_token: session.access_token,
        });
        if (active) {
          setAuth(response.user, response.accessToken);
          window.location.replace("/chat");
        }
      } catch (err) {
        console.error("Backend Auth Error:", err);
        if (active) {
          window.location.replace("/login?error=server_auth_failed");
        }
      }
    };

    // 1. Listen for auth state changes — standard way for Supabase to notify when OAuth is parsed
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("Supabase OAuth Event:", event, !!session);
      if (session && (event === "SIGNED_IN" || event === "INITIAL_SESSION")) {
        await exchangeToken(session);
      }
    });

    // 2. Immediate getSession check with a slight delay fallback if not signed in yet
    const init = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) {
        console.error("Supabase Auth Error:", error);
        window.location.replace("/login?error=auth_failed");
        return;
      }
      if (session) {
        await exchangeToken(session);
      } else {
        // Wait 1.5s for hash parsing if no session is immediately available
        setTimeout(async () => {
          if (!active) return;
          const { data: { session: delayedSession } } = await supabase.auth.getSession();
          if (delayedSession) {
            await exchangeToken(delayedSession);
          } else {
            console.warn("OAuth Session callback timed out with no session found.");
            window.location.replace("/login?error=auth_failed");
          }
        }, 1500);
      }
    };

    init();

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [setAuth]);

  return (
    <main className="relative z-10 w-full max-w-110 animate-in fade-in zoom-in duration-500">
      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl shadow-slate-200/50 dark:shadow-none p-8 md:p-12 flex flex-col items-center justify-center border border-slate-100 dark:border-slate-800 min-h-75">
        <div className="w-20 h-20 rounded-3xl bg-linear-to-br from-indigo-500 to-blue-600 flex items-center justify-center mb-6 shadow-xl shadow-blue-500/30">
          <Loader2 className="w-10 h-10 text-white animate-spin" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2 text-center">
          Authenticating...
        </h2>
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400 text-center">
          Connecting securely to Google
        </p>
      </div>
    </main>
  );
}
