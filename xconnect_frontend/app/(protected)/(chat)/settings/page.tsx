"use client";

import { useEffect, useState } from "react";
import { api } from "@/libs/api";
import { useAuthStore } from "@/store/auth.store";
import { Loader2, Save, LogOut, User, Mail, FileText, Camera, Globe, Moon, Sun } from "lucide-react";
import { useRouter } from "next/navigation";
import { disconnectSocket } from "@/libs/socket";
import { useTheme } from "next-themes";

interface Profile {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  bio?: string;
}

export default function SettingsPage() {
  const router = useRouter();
  const { logout, user } = useAuthStore();
  const { theme, setTheme } = useTheme();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [language, setLanguage] = useState<"en" | "vi">("en");
  const [mounted, setMounted] = useState(false);
  const [form, setForm] = useState({ name: "", bio: "", avatar: "" });

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await api.get<Profile>("/users/profile");
        setProfile(data);
        setForm({ name: data.name || "", bio: data.bio || "", avatar: data.avatar || "" });
        const saved = (localStorage.getItem("language") as "en" | "vi") || "en";
        setLanguage(saved);
      } catch (e) {
        console.error("Failed to load profile:", e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      const updated = await api.put<Profile>("/users/profile", {
        name: form.name,
        bio: form.bio,
        avatar: form.avatar,
      });
      setProfile(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      console.error("Failed to update profile:", e);
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    disconnectSocket();
    logout();
    router.push("/login");
  };

  const handleLanguageChange = (lang: "en" | "vi") => {
    setLanguage(lang);
    localStorage.setItem("language", lang);
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-50 dark:bg-slate-950 h-full">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-slate-50 dark:bg-slate-950 h-full">
      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="w-full px-12 py-12 space-y-8">
          {/* Profile & Preferences in 2 column grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Profile Card - Compact */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-8 shadow-sm">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-3">
                <User className="w-6 h-6 text-blue-500" />
                Profile
              </h2>

              {/* Quick Info */}
              <div className="flex items-center gap-4 mb-6 pb-6 border-b border-slate-200 dark:border-slate-700">
                <div className="w-16 h-16 rounded-lg bg-linear-to-br from-indigo-500 to-blue-600 flex items-center justify-center text-white font-bold text-xl shrink-0">
                  {profile?.name?.[0]?.toUpperCase() || profile?.email?.[0]?.toUpperCase() || "?"}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-base text-slate-900 dark:text-white truncate">{profile?.name || "No name"}</p>
                  <p className="text-sm text-slate-400 truncate">{profile?.email}</p>
                </div>
              </div>

              {/* Edit Fields - Compact */}
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 block">
                    Name
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500/40 transition-all"
                    placeholder="Name"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 block">
                    Bio
                  </label>
                  <textarea
                    value={form.bio}
                    onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
                    rows={2}
                    className="w-full px-3 py-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500/40 transition-all resize-none"
                    placeholder="Bio..."
                  />
                </div>
              </div>

              <button
                onClick={handleSave}
                disabled={saving}
                className="w-full mt-4 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm transition-all shadow-sm disabled:opacity-60"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save
              </button>
              {saved && <span className="text-xs text-emerald-500 text-center block mt-1.5">✓ Saved!</span>}
            </div>

            {/* Preferences Card */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-8 shadow-sm">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-3">
                <Globe className="w-6 h-6 text-purple-500" />
                Preferences
              </h2>

              {/* Language */}
              <div className="mb-7">
                <label className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3 block">
                  Language
                </label>
                <div className="flex gap-3">
                  {[
                    { code: "en" as const, label: "EN", flag: "English" },
                    { code: "vi" as const, label: "VI", flag: "Việt Nam" },
                  ].map(({ code, label, flag }) => (
                    <button
                      key={code}
                      onClick={() => handleLanguageChange(code)}
                      className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-base font-semibold transition-all border ${language === code
                        ? "bg-purple-600/10 border-purple-500 text-purple-600 dark:text-purple-400"
                        : "bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                        }`}
                    >
                      <span className="text-lg">{flag}</span>
                      ({label})
                    </button>
                  ))}
                </div>
              </div>

              {/* Theme */}
              <div>
                <label className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3 block">
                  Theme
                </label>
                <div className="flex gap-3">
                  {mounted && [
                    { mode: "light" as const, label: "☀️", icon: Sun },
                    { mode: "dark" as const, label: "🌙", icon: Moon },
                    { mode: "system" as const, label: "⚙️", icon: Globe },
                  ].map(({ mode, label }) => (
                    <button
                      key={mode}
                      onClick={() => setTheme(mode)}
                      className={`flex-1 flex items-center justify-center px-4 py-3 rounded-lg text-2xl font-semibold transition-all border ${theme === mode
                        ? "bg-blue-600/10 border-blue-500 text-blue-600 dark:text-blue-400"
                        : "bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                        }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Danger Zone - Full Width */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-red-200 dark:border-red-900/40 p-8 shadow-sm">
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 px-4 py-4 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-500 font-semibold text-base transition-all border border-red-500/20"
            >
              <LogOut className="w-5 h-5" />
              Sign out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
