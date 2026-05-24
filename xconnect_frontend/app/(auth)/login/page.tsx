"use client";

import Link from "next/link";
import { Mail, Lock, Eye, Sparkles, ShieldCheck, Loader2 } from "lucide-react";
import { useState } from "react";
import { useAuthStore } from "@/store/auth.store";
import { api } from "@/libs/api";
import { toast } from "sonner";
import { supabase } from "@/libs/supabase";
import { useLanguageStore } from "@/store/language.store";

const translations = {
  en: {
    welcomeBack: "Welcome back",
    signInTo: "Sign in to your XConnect account",
    emailAddress: "Email address",
    password: "Password",
    signIn: "Sign in",
    or: "or",
    continueWithGoogle: "Continue with Google",
    dontHaveAccount: "Don't have an account?",
    createAccount: "Create account",
    loginSuccess: "Login successful!",
    loginFailed: "Login failed. Please check your credentials.",
    googleLoginFailed: "Unable to login with Google."
  },
  vi: {
    welcomeBack: "Chào mừng trở lại",
    signInTo: "Đăng nhập vào tài khoản XConnect",
    emailAddress: "Địa chỉ Email",
    password: "Mật khẩu",
    signIn: "Đăng nhập",
    or: "hoặc",
    continueWithGoogle: "Tiếp tục với Google",
    dontHaveAccount: "Chưa có tài khoản?",
    createAccount: "Tạo tài khoản",
    loginSuccess: "Đăng nhập thành công!",
    loginFailed: "Đăng nhập thất bại. Vui lòng kiểm tra lại.",
    googleLoginFailed: "Không thể đăng nhập bằng Google."
  }
};

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const { setAuth } = useAuthStore();
  const { language } = useLanguageStore();
  const t = translations[language];

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const data = await api.post<{ accessToken: string; user: any }>("/auth/login", {
        email,
        password,
      });
      setAuth(data.user, data.accessToken);
      toast.success(t.loginSuccess);
      window.location.replace("/chat");
    } catch (e: any) {
      toast.error(e.message || t.loginFailed);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const isCapacitor = typeof window !== "undefined" && (window as any).Capacitor;

      if (isCapacitor) {
        setLoading(true);
        const { GoogleAuth } = await import("@codetrix-studio/capacitor-google-auth");

        console.log("Google login checkpoint: initializing native auth");
        await GoogleAuth.initialize();
        console.log("Google login checkpoint: starting signIn");
        const googleUser = await GoogleAuth.signIn();
        console.log("Google login checkpoint: signIn returned", {
          hasUser: !!googleUser,
          hasAuthentication: !!googleUser?.authentication,
          hasIdToken: !!googleUser?.authentication?.idToken,
          email: googleUser?.email,
          name: googleUser?.name,
        });

        const idToken = googleUser?.authentication?.idToken;
        if (!idToken) {
          throw new Error("No Identity Token returned from Google Auth.");
        }

        console.log("Google login checkpoint: exchanging idToken with Supabase");
        const { data, error } = await supabase.auth.signInWithIdToken({
          provider: "google",
          token: idToken,
        });

        if (error) throw error;

        console.log("Google login checkpoint: Supabase exchange succeeded", {
          hasSession: !!data.session,
          userId: data.user?.id,
        });

        if (!data.session) {
          throw new Error("Failed to create Supabase session.");
        }

        const response = await api.post<{ accessToken: string; user: any }>("/auth/supabase-login", {
          access_token: data.session.access_token,
        });

        setAuth(response.user, response.accessToken);
        toast.success(t.loginSuccess);
        window.location.replace("/chat");
        return;
      }

      const redirectTo = `${window.location.origin}/auth/callback`;

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo,
        },
      });

      if (error) throw error;
    } catch (e: any) {
      console.error("Google login error:", e);
      toast.error(e.message || t.googleLoginFailed);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative z-10 w-full max-w-110 animate-in fade-in zoom-in duration-500">
      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl shadow-slate-200/50 dark:shadow-none p-8 md:p-12 flex flex-col items-center border border-slate-100 dark:border-slate-800">
        {/* App Logo & Identity */}
        <div className="mb-3 flex flex-col items-center text-center">
          <h1 className="font-black text-3xl text-slate-900 dark:text-white tracking-tight mb-2 uppercase">{t.welcomeBack}</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">{t.signInTo}</p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleLogin} className="w-full space-y-6">
          {/* Email Input */}
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

          {/* Password Input */}
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

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white py-4 rounded-2xl font-bold text-sm shadow-xl shadow-blue-500/25 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-70 disabled:hover:scale-100"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : t.signIn}
          </button>
        </form>

        <div className="w-full flex items-center gap-4 my-6">
          <div className="h-px bg-slate-200 dark:bg-slate-800 flex-1"></div>
          <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest">{t.or}</span>
          <div className="h-px bg-slate-200 dark:bg-slate-800 flex-1"></div>
        </div>

        <button
          type="button"
          onClick={handleGoogleLogin}
          className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 text-slate-700 dark:text-slate-200 py-4 rounded-2xl font-bold text-sm transition-all duration-300 flex items-center justify-center gap-3"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
          </svg>
          {t.continueWithGoogle}
        </button>

        <p className="mt-10 text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
          {t.dontHaveAccount}{" "}
          <Link href="/register" className="text-blue-600 dark:text-blue-400 hover:underline ml-1">
            {t.createAccount}
          </Link>
        </p>
      </div>
    </main>
  );
}
