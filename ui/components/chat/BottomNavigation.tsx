"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MessageSquare, Contact, Settings } from "lucide-react";
import { useLanguageStore } from "@/store/language.store";
import { useChatStore } from "@/store/chat.store";

const translations = {
  en: {
    chats: "Chats",
    contacts: "Contacts",
    settings: "Settings",
  },
  vi: {
    chats: "Tin nhắn",
    contacts: "Danh bạ",
    settings: "Cài đặt",
  }
};

export default function BottomNavigation() {
  const pathname = usePathname();
  const { language } = useLanguageStore();
  const { activeRoomId } = useChatStore();

  // If there is an active room on mobile, hide the bottom navigation to give room for keyboard and input
  if (activeRoomId) return null;

  const t = translations[language];

  const navLinks = [
    { id: "chat", name: t.chats, href: "/chat", icon: MessageSquare },
    { id: "contacts", name: t.contacts, href: "/contacts", icon: Contact },
    { id: "settings", name: t.settings, href: "/settings", icon: Settings },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 h-16 bg-slate-50 dark:bg-[#040815] border-t border-slate-200 dark:border-slate-900/50 flex md:hidden items-center justify-around px-4 z-40 shadow-lg backdrop-blur-md bg-opacity-90 dark:bg-opacity-90">
      {navLinks.map((link) => {
        const isActive = pathname === link.href || (link.href === "/chat" && pathname.startsWith("/chat/"));
        const Icon = link.icon;
        return (
          <Link
            key={link.name}
            href={link.href}
            className={`flex flex-col items-center justify-center w-20 h-full transition-all duration-200 relative ${
              isActive
                ? "text-blue-600 dark:text-blue-400"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
            }`}
          >
            {isActive && (
              <span className="absolute top-0 w-8 h-1 bg-blue-600 rounded-b-full shadow-[0_2px_8px_rgba(37,99,235,0.4)]" />
            )}
            <Icon className="w-5.5 h-5.5 mb-1" />
            <span className="text-[10px] font-semibold tracking-wide uppercase">
              {link.name}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
