"use client";

import { Search, Edit } from "lucide-react";
import { useChatStore } from "@/store/chat.store";

export default function ConversationList() {
  const { conversations, activeRoomId, setActiveRoom } = useChatStore();

  // MOCK DATA for layout visual testing since API is not connected yet
  const mockConversations = [
    {
      id: "room-1",
      name: "Elena Vance",
      avatar: "E",
      lastMessage: "Typing...",
      time: "10:42 AM",
      isActive: activeRoomId === "room-1",
      isTyping: true,
      unread: 0,
    },
    {
      id: "room-2",
      name: "Design Team Sync",
      avatar: "D",
      lastMessage: "Sarah: Can everyone check the latest figma?",
      time: "Mon",
      isActive: activeRoomId === "room-2",
      isTyping: false,
      unread: 3,
    },
  ];

  const renderList = conversations.length > 0 ? conversations : mockConversations;

  return (
    <section className="w-full md:w-80 lg:w-96 bg-surface-container-low flex flex-col overflow-hidden border-r border-slate-200 dark:border-slate-800 z-10">
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold tracking-tight">Messages</h1>
          <button className="w-10 h-10 rounded-full bg-primary-container text-white flex items-center justify-center hover:opacity-90 transition-opacity shadow-sm">
            <Edit className="w-5 h-5 fill-current" />
          </button>
        </div>
        <div className="relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-outline w-5 h-5" />
          <input
            type="text"
            className="w-full pl-10 pr-4 py-3 bg-surface-container-lowest border-none rounded-xl text-sm focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-outline/60 outline-none"
            placeholder="Search conversations..."
          />
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto px-3 space-y-1 pb-6">
        {renderList.map((item: any) => {
          const isActive = item.id === activeRoomId || item.isActive;
          return (
            <div
              key={item.id}
              onClick={() => setActiveRoom(item.id)}
              className={`relative group cursor-pointer p-3 rounded-xl transition-all ${
                isActive ? "bg-surface-container-lowest shadow-sm" : "hover:bg-surface-container-high"
              }`}
            >
              {isActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary rounded-r-full"></div>}
              
              <div className="flex gap-3">
                <div className="relative flex-shrink-0">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-400 to-primary text-white flex items-center justify-center font-bold text-lg">
                    {item.name ? item.name[0] : item.avatar}
                  </div>
                  {item.unread > 0 ? (
                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-[10px] text-white flex flex-col items-center justify-center rounded-full border-2 border-surface-container-low font-bold">
                      {item.unread}
                    </div>
                  ) : (
                    <span className={`absolute -bottom-1 -right-1 w-4 h-4 border-4 rounded-full ${
                      isActive ? "bg-emerald-500 border-surface-container-lowest" 
                        : "bg-slate-300 border-surface-container-low group-hover:border-surface-container-high transition-colors"
                    }`}></span>
                  )}
                </div>
                
                <div className="flex-1 min-w-0 flex flex-col justify-center">
                  <div className="flex justify-between items-start mb-0.5">
                    <h3 className="font-semibold text-sm truncate font-sans text-on-surface">{item.name}</h3>
                    <span className="text-[10px] text-outline font-medium">{item.time}</span>
                  </div>
                  <p className={`text-xs truncate ${item.isTyping ? "text-primary font-medium" : "text-on-surface-variant font-medium"}`}>
                    {item.lastMessage}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
