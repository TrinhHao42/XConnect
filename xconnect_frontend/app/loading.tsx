export default function RootLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="relative w-full max-w-md overflow-hidden rounded-[2rem] glass-panel aurora-shimmer px-8 py-10 text-center fade-up">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-400/12 via-transparent to-indigo-500/12" />
        <div className="relative flex flex-col items-center gap-5">
          <div className="relative flex h-20 w-20 items-center justify-center rounded-[1.75rem] bg-white/8 ring-1 ring-white/10 shadow-2xl shadow-cyan-500/10">
            <div className="absolute inset-0 rounded-[1.75rem] border border-white/10" />
            <div className="absolute inset-3 rounded-[1.25rem] border border-white/12 border-t-cyan-300 animate-spin" />
            <div className="absolute inset-[22%] rounded-full bg-cyan-300/30 blur-xl" />
            <span className="relative text-2xl font-black tracking-[0.2em] text-cyan-100">X</span>
          </div>
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.32em] text-cyan-100/70">XConnect</p>
            <p className="text-sm text-slate-200/80 font-medium">Loading your connection space...</p>
          </div>
        </div>
      </div>
    </div>
  );
}
