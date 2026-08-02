"use client";

import ChatArea from "@/components/chat/ChatArea";
import ConversationList from "@/components/chat/ConversationList";
import { useChatStore } from "@/store/chat.store";

export default function ChatPage() {
  const { activeRoomId, setActiveRoom } = useChatStore();

  return (
    <div className="flex h-full overflow-hidden">
      {/* ConversationList: luôn hiện trên desktop, ẩn trên mobile khi đang xem chat */}
      <div
        className={`
          ${activeRoomId ? "hidden md:flex" : "flex"}
          w-full md:w-80 lg:w-96 shrink-0 pb-16 md:pb-0
        `}
      >
        <ConversationList />
      </div>

      {/* ChatArea: ẩn trên mobile khi chưa chọn room */}
      <div
        className={`
          ${activeRoomId ? "flex" : "hidden md:flex"}
          flex-1 flex-col overflow-hidden
        `}
      >
        <ChatArea onBack={() => setActiveRoom(null)} />
      </div>
    </div>
  );
}

