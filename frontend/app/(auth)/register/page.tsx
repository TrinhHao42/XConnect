"use client";

import Link from "next/link";
import { Mail, Lock, Eye, Sparkles, User, ShieldCheck, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { useAuthStore } from "@/store/auth.store";
import { api } from "@/libs/api";
import { toast } from "sonner";
import { useLanguageStore } from "@/store/language.store";

const translations = {
  en: {
    createAccount: "Create account",
    fullName: "Full Name",
    emailAddress: "Email address",
    password: "Password",
    confirmPassword: "Confirm Password",
    createAccountBtn: "Create Account",
    alreadyHaveAccount: "Already have an account?",
    login: "Login",
    passwordsNotMatch: "Passwords do not match",
    registerSuccess: "Account registered successfully!",
    registerFailed: "Registration failed. Please try again."
  },
  vi: {
    createAccount: "Tạo tài khoản",
    fullName: "Họ và Tên",
    emailAddress: "Địa chỉ Email",
    password: "Mật khẩu",
    confirmPassword: "Xác nhận mật khẩu",
    createAccountBtn: "Đăng ký",
    alreadyHaveAccount: "Đã có tài khoản?",
    login: "Đăng nhập",
    passwordsNotMatch: "Mật khẩu không khớp",
    registerSuccess: "Đăng ký tài khoản thành công!",
    registerFailed: "Đăng ký thất bại. Vui lòng thử lại."
  }
};

export default function RegisterPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [repassword, setRepassword] = useState("");
  const [loading, setLoading] = useState(false);

  const { setAuth, isAuthenticated, isInitialized } = useAuthStore();
  const { language } = useLanguageStore();
  const t = translations[language];

  useEffect(() => {
    if (isInitialized && isAuthenticated) {
      window.location.replace("/chat");
    }
  }, [isInitialized, isAuthenticated]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (password !== repassword) {
      toast.error(t.passwordsNotMatch);
      setLoading(false);
      return;
    }

    try {
      await api.post<any>("/auth/register", {
        email,
        repassword,
        password,
        name,
      });
      toast.success(t.registerSuccess);
      window.location.replace("/login");
    } catch (e: any) {
      toast.error(e.message || t.registerFailed);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative z-10 w-full max-w-[440px] animate-in fade-in zoom-in duration-500">
      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl shadow-slate-200/50 dark:shadow-none p-4 md:p-12 flex flex-col items-center border border-slate-100 dark:border-slate-800">
        <div className="mb-3 flex flex-col items-center text-center">
          <h1 className="font-black text-3xl text-slate-900 dark:text-white tracking-tight mb-2 uppercase">{t.createAccount}</h1>
        </div>

        <form onSubmit={handleRegister} className="w-full space-y-5">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] ml-1">{t.fullName}</label>
            <div className="relative group">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors w-5 h-5" />
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500/50 transition-all text-sm text-slate-900 dark:text-white outline-none placeholder:text-slate-400 dark:placeholder:text-slate-600"
                placeholder="John Doe"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] ml-1">{t.emailAddress}</label>
            <div className="relative group">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors w-5 h-5" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500/50 transition-all text-sm text-slate-900 dark:text-white outline-none placeholder:text-slate-400 dark:placeholder:text-slate-600"
                placeholder="name@example.com"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] ml-1">{t.password}</label>
            <div className="relative group">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors w-5 h-5" />
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-12 pr-12 py-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500/50 transition-all text-sm text-slate-900 dark:text-white outline-none placeholder:text-slate-400 dark:placeholder:text-slate-600"
                placeholder="••••••••"
              />
              <button
                type="button"
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <Eye className="w-5 h-5 text-blue-500" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] ml-1">{t.confirmPassword}</label>
            <div className="relative group">
              <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors w-5 h-5" />
              <input
                type={showPassword ? "text" : "password"}
                required
                value={repassword}
                onChange={(e) => setRepassword(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500/50 transition-all text-sm text-slate-900 dark:text-white outline-none placeholder:text-slate-400 dark:placeholder:text-slate-600"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white py-4 rounded-2xl font-bold text-sm shadow-xl shadow-blue-500/25 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-70 disabled:hover:scale-100"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : t.createAccountBtn}
          </button>
        </form>

        <p className="mt-8 text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
          {t.alreadyHaveAccount}{" "}
          <Link href="/login" className="text-blue-600 dark:text-blue-400 hover:underline ml-1">
            {t.login}
          </Link>
        </p>
      </div>
    </main>
  );
}
