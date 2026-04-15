import { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="bg-background font-sans text-foreground min-h-screen flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary/5 blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-secondary-container/10 blur-[120px]"></div>
      </div>

      {children}

      {/* Visual Polish: Floating Shapes */}
      <div className="fixed top-20 right-[15%] w-24 h-24 rounded-3xl bg-primary/5 rotate-12 -z-10 blur-xl"></div>
      <div className="fixed bottom-40 left-[10%] w-32 h-32 rounded-full bg-secondary-container/10 -z-10 blur-2xl"></div>
    </div>
  );
}
