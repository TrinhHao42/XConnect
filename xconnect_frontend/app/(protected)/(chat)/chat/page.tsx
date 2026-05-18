import ChatArea from "@/components/chat/ChatArea";
import ConversationList from "@/components/chat/ConversationList";

export default function ChatPage() {
  return (
    <div className="flex flex-col md:flex-row h-full overflow-hidden">
      <ConversationList />
      <ChatArea />
    </div>
  );
}
