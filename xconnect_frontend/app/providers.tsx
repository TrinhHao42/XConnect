"use client";

import { ThemeProvider } from "next-themes";
import { ReactNode, useEffect } from "react";
import { toast } from "sonner";
import { CallProvider } from "@/components/call";

export function Providers({ children }: { children: ReactNode }) {
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

  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
      <CallProvider>{children}</CallProvider>
    </ThemeProvider>
  );
}
