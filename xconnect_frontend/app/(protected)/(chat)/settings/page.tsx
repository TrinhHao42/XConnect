"use client";

import { useEffect, useState, useRef } from "react";
import { api } from "@/libs/api";
import { useAuthStore } from "@/store/auth.store";
import { Loader2, Save, LogOut, User, Mail, FileText, Camera, Globe, Moon, Sun } from "lucide-react";
import { useRouter } from "next/navigation";
import { disconnectSocket } from "@/libs/socket";
import { useTheme } from "next-themes";
import { useLanguageStore } from "@/store/language.store";
import { toast } from "sonner";

interface Profile {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  bio?: string;
}

const translations = {
  en: {
    profile: "Profile",
    noName: "No name",
    nameLabel: "Name",
    namePlaceholder: "Name",
    bioLabel: "Bio",
    bioPlaceholder: "Bio...",
    save: "Save",
    saved: "Saved!",
    preferences: "Preferences",
    language: "Language",
    theme: "Theme",
    signOut: "Sign out"
  },
  vi: {
    profile: "Hồ sơ",
    noName: "Không có tên",
    nameLabel: "Tên",
    namePlaceholder: "Tên",
    bioLabel: "Tiểu sử",
    bioPlaceholder: "Tiểu sử...",
    save: "Lưu",
    saved: "Đã lưu!",
    preferences: "Tùy chọn",
    language: "Ngôn ngữ",
    theme: "Giao diện",
    signOut: "Đăng xuất"
  }
};

export default function SettingsPage() {
  const router = useRouter();
  const { logout, user, updateUser } = useAuthStore();
  const { theme, setTheme } = useTheme();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const { language, setLanguage } = useLanguageStore();
  const [mounted, setMounted] = useState(false);
  const [form, setForm] = useState({ name: "", bio: "", avatar: "" });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const t = translations[language];

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setForm(f => ({ ...f, avatar: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await api.get<Profile>("/users/profile");
        setProfile(data);
        setForm({ name: data.name || "", bio: data.bio || "", avatar: data.avatar || "" });
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
      updateUser({ name: updated.name, avatar: updated.avatar });
      setSaved(true);
      toast.success(language === "vi" ? "Cập nhật thành công!" : "Profile updated successfully!");
      setTimeout(() => setSaved(false), 3000);
    } catch (e: any) {
      console.error("Failed to update profile:", e);
      toast.error(language === "vi" ? "Lỗi: " + (e.message || "File quá lớn") : "Error: " + (e.message || "File too large"));
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
                {t.profile}
              </h2>

              {/* Quick Info */}
              <div className="flex items-center gap-4 mb-6 pb-6 border-b border-slate-200 dark:border-slate-700">
                <div 
                  className="relative w-16 h-16 rounded-lg bg-linear-to-br from-indigo-500 to-blue-600 flex items-center justify-center text-white font-bold text-xl shrink-0 cursor-pointer overflow-hidden group"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {form.avatar ? (
                    <img src={form.avatar} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    profile?.name?.[0]?.toUpperCase() || profile?.email?.[0]?.toUpperCase() || "?"
                  )}
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Camera className="w-6 h-6 text-white" />
                  </div>
                </div>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleAvatarChange} 
                  accept="image/*" 
                  className="hidden" 
                />
                <div className="min-w-0">
                  <p className="font-semibold text-base text-slate-900 dark:text-white truncate">{profile?.name || t.noName}</p>
                  <p className="text-sm text-slate-400 truncate">{profile?.email}</p>
                </div>
              </div>

              {/* Edit Fields - Compact */}
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 block">
                    {t.nameLabel}
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500/40 transition-all"
                    placeholder={t.namePlaceholder}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 block">
                    {t.bioLabel}
                  </label>
                  <textarea
                    value={form.bio}
                    onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
                    rows={2}
                    className="w-full px-3 py-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500/40 transition-all resize-none"
                    placeholder={t.bioPlaceholder}
                  />
                </div>
              </div>

              <button
                onClick={handleSave}
                disabled={saving}
                className="w-full mt-4 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm transition-all shadow-sm disabled:opacity-60"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {t.save}
              </button>
              {saved && <span className="text-xs text-emerald-500 text-center block mt-1.5">✓ {t.saved}</span>}
            </div>

            {/* Preferences Card */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-8 shadow-sm">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-3">
                <Globe className="w-6 h-6 text-purple-500" />
                {t.preferences}
              </h2>

              {/* Language */}
              <div className="mb-7">
                <label className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3 block">
                  {t.language}
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
                  {t.theme}
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
              {t.signOut}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
