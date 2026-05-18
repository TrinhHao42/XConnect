"use client";

import Link from "next/link";
import { Mail, Lock, Eye, Sparkles, ShieldCheck, Loader2 } from "lucide-react";
import { useState } from "react";
import { useAuthStore } from "@/store/auth.store";
import { useRouter } from "next/navigation";
import { api } from "@/libs/api";
import { toast } from "sonner";

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const { setAuth } = useAuthStore();
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const data = await api.post<{ accessToken: string; user: any }>("/auth/login", {
        email,
        password,
      });
      setAuth(data.user, data.accessToken);
      toast.success("Đăng nhập thành công!");
      router.push("/chat");
    } catch (e: any) {
      toast.error(e.message || "Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative z-10 w-full max-w-[440px] animate-in fade-in zoom-in duration-500">
      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl shadow-slate-200/50 dark:shadow-none p-8 md:p-12 flex flex-col items-center border border-slate-100 dark:border-slate-800">
        {/* App Logo & Identity */}
        <div className="mb-10 flex flex-col items-center text-center">
          <div className="w-20 h-20 rounded-3xl bg-linear-to-br from-indigo-500 to-blue-600 flex items-center justify-center mb-6 shadow-xl shadow-blue-500/30 transform hover:rotate-12 transition-transform duration-300">
            <Sparkles className="text-white w-10 h-10" />
          </div>
          <h1 className="font-black text-3xl text-slate-900 dark:text-white tracking-tight mb-2 uppercase">Welcome back</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Sign in to your XConnect account</p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleLogin} className="w-full space-y-6">
          {/* Email Input */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] ml-1">Email address</label>
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
            <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] ml-1">Password</label>
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
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Sign in"}
          </button>
        </form>

        <p className="mt-10 text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
          Don't have an account?{" "}
          <Link href="/register" className="text-blue-600 dark:text-blue-400 hover:underline ml-1">
            Create account
          </Link>
        </p>
      </div>

      <div className="mt-10 flex justify-center items-center gap-8 opacity-40 hover:opacity-100 transition-opacity duration-500">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-600 dark:text-slate-400">Systems Operational</span>
        </div>
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-slate-600 dark:text-slate-400" />
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-600 dark:text-slate-400">End-to-End Encrypted</span>
        </div>
      </div>
    </main>
  );
}
