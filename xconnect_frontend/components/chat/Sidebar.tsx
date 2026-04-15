"use client";

import Link from "next/link";
import { MessageSquare, Users, Phone, Settings, HelpCircle, Triangle } from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { usePathname } from "next/navigation";

export default function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuthStore();

  const navLinks = [
    { name: "Chats", href: "/", icon: MessageSquare },
    { name: "Contacts", href: "/contacts", icon: Users },
    { name: "Calls", href: "/calls", icon: Phone },
    { name: "Settings", href: "/settings", icon: Settings },
  ];

  return (
    <aside className="h-screen w-20 md:w-64 flex-shrink-0 bg-slate-100 dark:bg-slate-900 flex flex-col py-6 border-r border-slate-200 dark:border-slate-800">
      <div className="px-6 mb-10 flex items-center gap-3">
        <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white">
          <Triangle className="w-4 h-4 fill-current" />
        </div>
        <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-50 font-manrope hidden md:block">Lumina Chat</span>
      </div>

      <nav className="flex-grow space-y-1">
        {navLinks.map((link) => {
          const isActive = pathname === link.href;
          const Icon = link.icon;
          return (
            <Link
              key={link.name}
              href={link.href}
              className={`relative flex items-center gap-3 px-4 py-3 transition-colors duration-200 ${
                isActive
                  ? "text-blue-700 dark:text-blue-400 before:content-[''] before:absolute before:left-0 before:w-1 before:h-6 before:bg-blue-600 before:rounded-r-full"
                  : "text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800"
              }`}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              <span className="font-sans text-sm font-semibold hidden md:block">{link.name}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto px-4 space-y-1">
        <button className="flex w-full items-center gap-3 px-4 py-3 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors duration-200 rounded-xl">
          <HelpCircle className="w-5 h-5 flex-shrink-0" />
          <span className="font-sans text-sm hidden md:block">Help</span>
        </button>

        <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center gap-3 px-4">
          <div className="relative">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
              {user?.name?.[0] || "U"}
            </div>
            <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-slate-100 dark:border-slate-900 rounded-full"></span>
          </div>
          <div className="hidden md:block">
            <p className="font-bold text-sm text-slate-900 dark:text-slate-50 truncate max-w-[120px]">{user?.name || "User"}</p>
            <p className="text-xs text-slate-500">Online</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
