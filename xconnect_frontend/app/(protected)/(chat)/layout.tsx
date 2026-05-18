import Sidebar from "@/components/chat/Sidebar";
import ConversationList from "@/components/chat/ConversationList";
import GlobalCallManager from "@/components/call/GlobalCallManager";
import { ReactNode } from "react";

export default function ChatLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-hidden">
        {children}
      </main>
      <GlobalCallManager />
    </div>
  );
}
