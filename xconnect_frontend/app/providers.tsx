"use client";

import { ThemeProvider } from "next-themes";
import { ReactNode, useEffect } from "react";
import { toast } from "sonner";
import { CallProvider } from "@/components/call";
import { useLanguageStore } from "@/store/language.store";

export function Providers({ children }: { children: ReactNode }) {
  useEffect(() => {
    useLanguageStore.getState().initialize();
  }, []);

  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const toastEl = target.closest("[data-sonner-toast]");
      if (toastEl) {
        const id = toastEl.getAttribute("data-id");
        if (id) {
          toast.dismiss(id);
        }
      }
    };

    document.addEventListener("click", handleGlobalClick);
    return () => document.removeEventListener("click", handleGlobalClick);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const cap = (window as any).Capacitor;
    if (!cap) return;

    const initDeepLinks = async () => {
      try {
        const { App } = await import("@capacitor/app");
        App.addListener("appUrlOpen", (data: any) => {
          if (data.url && data.url.includes("auth/callback")) {
            // Replace custom scheme to safely parse path and hash
            const parsed = new URL(data.url.replace("xconnect://", "http://localhost/"));
            const path = "/auth/callback" + parsed.search + parsed.hash;
            window.location.href = path;
          }
        });
      } catch (err) {
        console.error("Failed to initialize Capacitor Deep Links:", err);
      }
    };
    initDeepLinks();
  }, []);

  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
      <CallProvider>{children}</CallProvider>
    </ThemeProvider>
  );
}
