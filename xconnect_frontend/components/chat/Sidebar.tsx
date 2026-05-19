"use client";

import Link from "next/link";
import { MessageSquare, Contact, Settings, HelpCircle } from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { usePathname } from "next/navigation";
import { useLanguageStore } from "@/store/language.store";

const translations = {
  en: {
    chats: "Chats",
    contacts: "Contacts",
    settings: "Settings",
    help: "Help"
  },
  vi: {
    chats: "Tin nhắn",
    contacts: "Danh bạ",
    settings: "Cài đặt",
    help: "Trợ giúp"
  }
};

export default function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuthStore();
  const { language } = useLanguageStore();
  
  const t = translations[language];

  const navLinks = [
    { id: "chat", name: t.chats, href: "/chat", icon: MessageSquare },
    { id: "contacts", name: t.contacts, href: "/contacts", icon: Contact },
    { id: "settings", name: t.settings, href: "/settings", icon: Settings },
  ];

  return (
    <aside className="h-screen w-16 shrink-0 bg-slate-50 dark:bg-[#040815] flex flex-col py-6 border-r border-slate-200 dark:border-slate-900/50">
      {/* User Avatar Top */}
      <div className="px-2 mb-8 flex justify-center">
        <div className="relative">
          <div className="w-12 h-12 rounded-2xl bg-linear-to-br from-indigo-500 to-blue-600 flex items-center justify-center text-white font-bold text-lg uppercase shadow-lg shadow-blue-500/20 overflow-hidden">
            {user?.avatar ? (
              <img src={user.avatar} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              user?.name?.[0] || "U"
            )}
          </div>
        </div>
      </div>

      <nav className="grow space-y-2 px-2">
        {navLinks.map((link) => {
          const isActive = pathname === link.href;
          const Icon = link.icon;
          return (
            <Link
              key={link.name}
              href={link.href}
              title={link.name}
              className={`relative flex items-center justify-center py-3 px-2 transition-all duration-200 rounded-xl ${isActive
                ? "bg-blue-600/10 text-blue-600 dark:text-blue-400"
                : "text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-200"
                }`}
            >
              {isActive && (
                <div className="absolute left-0 w-1 h-5 bg-blue-600 rounded-r-full" />
              )}
              <Icon className="w-5 h-5" />
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto px-2">
        <button
          title={t.help}
          className="flex w-full items-center justify-center py-3 px-2 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors duration-200 rounded-xl"
        >
          <HelpCircle className="w-5 h-5" />
        </button>
      </div>
    </aside>
  );
}
