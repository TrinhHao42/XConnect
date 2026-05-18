import { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="bg-slate-50 dark:bg-slate-950 font-sans text-slate-900 dark:text-white min-h-screen flex items-center justify-center p-6 relative overflow-hidden transition-colors duration-500">
      {/* Background Decor */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-blue-500/10 dark:bg-blue-600/10 blur-[120px] animate-pulse"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-500/10 dark:bg-indigo-600/10 blur-[120px] animate-pulse"></div>
      </div>

      {children}

      {/* Visual Polish: Floating Shapes */}
      <div className="fixed top-20 right-[15%] w-32 h-32 rounded-3xl bg-blue-500/5 dark:bg-blue-400/5 rotate-12 -z-10 blur-2xl"></div>
      <div className="fixed bottom-40 left-[10%] w-40 h-40 rounded-full bg-indigo-500/5 dark:bg-indigo-400/5 -z-10 blur-3xl"></div>
    </div>
  );
}
