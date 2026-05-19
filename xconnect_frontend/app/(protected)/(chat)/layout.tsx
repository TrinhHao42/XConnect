import Sidebar from "@/components/chat/Sidebar";
import BottomNavigation from "@/components/chat/BottomNavigation";
import GlobalCallManager from "@/components/call/GlobalCallManager";
import { ReactNode } from "react";

export default function ChatLayout({ children }: { children: ReactNode }) {
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
