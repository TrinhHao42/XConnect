"use client";

import Link from "next/link";
import { Mail, Lock, Eye, Sparkles, User, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { useAuthStore } from "@/store/auth.store";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const [showPassword, setShowPassword] = useState(false);
  const { setAuth } = useAuthStore();
  const router = useRouter();

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setAuth({ id: "1", email: "demo@lumina.chat", name: "New User" }, "mock-jwt-token");
    router.push("/");
  };

  return (
    <main className="relative z-10 w-full max-w-[440px]">
      <div className="bg-surface-container-lowest rounded-2xl shadow-[0_12px_32px_rgba(25,28,30,0.06)] p-8 md:p-12 flex flex-col items-center">
        <div className="mb-8 flex flex-col items-center">
          <div className="w-16 h-16 rounded-2xl bg-primary-container flex items-center justify-center mb-6 shadow-lg shadow-primary/10">
            <Sparkles className="text-on-primary w-8 h-8 flex-shrink-0" />
          </div>
          <h1 className="font-extrabold text-3xl text-on-surface tracking-tight mb-2">Create account</h1>
          <p className="text-on-surface-variant text-sm font-medium">Join Lumina Chat today</p>
        </div>

        <form onSubmit={handleRegister} className="w-full space-y-5">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-on-surface-variant ml-1">Full Name</label>
            <div className="relative group">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 text-outline w-5 h-5" />
              <input
                type="text"
                required
                className="w-full pl-11 pr-4 py-3.5 bg-surface-container-low border-none ghost-border rounded-xl focus:ring-2 focus:ring-primary/20 transition-all text-sm text-foreground outline-none placeholder:text-outline"
                placeholder="John Doe"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-on-surface-variant ml-1">Email address</label>
            <div className="relative group">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-outline w-5 h-5" />
              <input
                type="email"
                required
                className="w-full pl-11 pr-4 py-3.5 bg-surface-container-low border-none ghost-border rounded-xl focus:ring-2 focus:ring-primary/20 transition-all text-sm text-foreground outline-none placeholder:text-outline"
                placeholder="name@example.com"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-on-surface-variant ml-1">Password</label>
            <div className="relative group">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-outline w-5 h-5" />
              <input
                type={showPassword ? "text" : "password"}
                required
                className="w-full pl-11 pr-12 py-3.5 bg-surface-container-low border-none ghost-border rounded-xl focus:ring-2 focus:ring-primary/20 transition-all text-sm text-foreground outline-none placeholder:text-outline"
                placeholder="••••••••"
              />
              <button
                type="button"
                className="absolute right-4 top-1/2 -translate-y-1/2 text-outline hover:text-primary transition-colors"
                onClick={() => setShowPassword(!showPassword)}
              >
                <Eye className="w-5 h-5" />
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="w-full primary-gradient text-on-primary py-3.5 rounded-full font-semibold text-sm shadow-lg shadow-primary/20 hover:scale-[1.01] active:scale-[0.98] transition-all duration-200"
          >
            Create Account
          </button>
        </form>

        <p className="mt-10 text-xs text-on-surface-variant font-medium">
          Already have an account?{" "}
          <Link href="/login" className="text-primary font-bold hover:underline">
            Login
          </Link>
        </p>
      </div>
      
      <div className="mt-8 flex justify-center items-center gap-6 opacity-40 grayscale hover:opacity-100 hover:grayscale-0 transition-all duration-500">
        <div className="flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-on-surface" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface">Secure Registration</span>
        </div>
      </div>
    </main>
  );
}
