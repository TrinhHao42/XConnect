import Sidebar from "@/components/chat/Sidebar";
import ConversationList from "@/components/chat/ConversationList";
import { ReactNode } from "react";

export default function ChatLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <Sidebar />
      <main className="flex-1 flex flex-col md:flex-row h-full">
        <ConversationList />
        {children}
      </main>
    </div>
  );
}
