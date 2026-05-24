"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion, useScroll, useSpring, useTransform } from "framer-motion";
import { ArrowRight, BrainCircuit, Bot, ChevronRight, CircuitBoard, Layers3, LockKeyhole, MessageSquareText, Mic, Palette, PlayCircle, ShieldCheck, Sparkles, Stars, Telescope, Zap } from "lucide-react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useAuthStore } from "@/store/auth.store";
import InteractiveParticleField from "./InteractiveParticleField";
import brandIcon from "../../assets/icon.png";

gsap.registerPlugin(ScrollTrigger);

const features = [
  {
    icon: CircuitBoard,
    title: "AI-native UX",
    desc: "Layouts and interactions tuned for an AI product reveal, not a generic SaaS page.",
  },
  {
    icon: Zap,
    title: "High-FPS motion",
    desc: "GPU-friendly motion with optimized hero effects, smooth parallax, and scroll-based storytelling.",
  },
  {
    icon: ShieldCheck,
    title: "Secure by design",
    desc: "Authentication pathways remain clear and accessible, while the landing stays premium and inviting.",
  },
  {
    icon: Palette,
    title: "Brand-level polish",
    desc: "Neon gradients, glass panels, scanlines, and layered depth create a futuristic startup aesthetic.",
  },
];

const demoScript = [
  { role: "system", text: "XConnect AI is ready. I can summarize threads, draft replies, and keep context alive." },
  { role: "user", text: "Build me a response that sounds concise but friendly." },
  { role: "assistant", text: "Absolutely. Here’s a clean, human reply with a warm tone and clear next step." },
  { role: "system", text: "It can also prioritize voice, image, file, and group workflows in real time." },
];

const testimonials = [
  {
    name: "Product Lead, Neon Labs",
    quote: "It feels like a premium operating system for conversations. The motion system alone sells the product.",
  },
  {
    name: "Founder, Atlas AI",
    quote: "The interface has that rare mix of futuristic and readable. It looks expensive in the right way.",
  },
  {
    name: "Design Director, Flux Studio",
    quote: "This is the kind of landing page that makes people stop scrolling. Great depth and control.",
  },
  {
    name: "CTO, Northstar",
    quote: "The hero, particles, and reveal timing feel coordinated. It has real product-launch energy.",
  },
];

const pricing = [
  {
    tier: "Launch",
    price: "$0",
    desc: "For early access and demos.",
    items: ["Core chat", "AI preview", "Basic calls"],
  },
  {
    tier: "Pro",
    price: "$19",
    desc: "For teams that want speed and polish.",
    items: ["Advanced AI assistant", "Group workflows", "Priority calling"],
    featured: true,
  },
  {
    tier: "Scale",
    price: "$49",
    desc: "For product teams and startups shipping hard.",
    items: ["Custom branding", "Workspace controls", "Analytics"],
  },
];

function AnimatedTitle() {
  const title = "XConnect AI";
  return (
    <div className="flex flex-wrap items-center gap-3 text-5xl font-black tracking-tight text-white sm:text-7xl lg:text-[6.6rem]">
      {title.split("").map((char, index) => (
        <motion.span
          key={`${char}-${index}`}
          initial={{ opacity: 0, y: 26, filter: "blur(10px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 0.55, delay: index * 0.05, ease: [0.22, 1, 0.36, 1] }}
          className={char === " " ? "w-3" : "inline-block"}
        >
          {char === " " ? "\u00a0" : char}
        </motion.span>
      ))}
    </div>
  );
}

function DemoConversation() {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setStep((value) => (value + 1) % (demoScript.length + 1));
    }, 1800);

    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="rounded-4xl border border-white/10 bg-slate-950/55 p-5 shadow-2xl shadow-cyan-500/10 backdrop-blur-xl">
      <div className="mb-4 flex items-center justify-between border-b border-white/10 pb-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-cyan-100/60">AI Demo</p>
          <h3 className="mt-2 text-lg font-semibold text-white">Live conversation flow</h3>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs text-cyan-100">
          <span className="h-2 w-2 rounded-full bg-cyan-300 shadow-[0_0_18px_rgba(0,240,255,0.8)]" />
          typing
        </div>
      </div>

      <div className="space-y-3">
        {demoScript.slice(0, Math.max(step, 1)).map((message, index) => (
          <motion.div
            key={`${message.role}-${index}`}
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.45 }}
            className={`max-w-[90%] rounded-2xl px-4 py-3 text-sm leading-6 ${
              message.role === "assistant"
                ? "ml-auto bg-linear-to-r from-cyan-400/15 to-indigo-500/15 text-white"
                : message.role === "user"
                  ? "bg-white/8 text-slate-100"
                  : "border border-white/10 bg-slate-900/70 text-slate-300"
            }`}
          >
            {message.text}
          </motion.div>
        ))}

        {step > 0 && step <= demoScript.length && (
          <div className="ml-auto flex max-w-[80%] items-center gap-2 rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-sm text-slate-100/70">
            <span className="h-2 w-2 animate-pulse rounded-full bg-cyan-300" />
            XConnect AI is generating a response...
          </div>
        )}
      </div>
    </div>
  );
}

function SectionLabel({ eyebrow, title, desc }: { eyebrow: string; title: string; desc: string }) {
  return (
    <div className="max-w-3xl space-y-4">
      <p className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.32em] text-cyan-100/70">
        <Stars className="h-3.5 w-3.5" />
        {eyebrow}
      </p>
      <h2 className="text-3xl font-black tracking-tight text-white sm:text-5xl">{title}</h2>
      <p className="max-w-2xl text-base leading-7 text-slate-200/75 sm:text-lg">{desc}</p>
    </div>
  );
}

export default function LandingPage() {
  const { token, isAuthenticated } = useAuthStore();
  const router = useRouter();
  const prefersReducedMotion = useReducedMotion();
  const [isDesktop, setIsDesktop] = useState(false);
  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 24, mass: 0.4 });
  const mouseX = useSpring(0, { stiffness: 50, damping: 18, mass: 0.2 });
  const mouseY = useSpring(0, { stiffness: 50, damping: 18, mass: 0.2 });
  const glowX = useTransform(mouseX, (value) => value - 240);
  const glowY = useTransform(mouseY, (value) => value - 240);
  const sectionsRef = useRef<HTMLElement[]>([]);

  const marqueeItems = useMemo(
    () => ["Real-time AI", "Glassmorphism", "Scroll storytelling", "Cursor-reactive particles", "Neon motion"],
    []
  );

  useEffect(() => {
    const update = () => setIsDesktop(window.innerWidth >= 1024);
    update();

    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const enableHeavyEffects = isDesktop && !prefersReducedMotion;

  useEffect(() => {
    if (token && isAuthenticated) {
      router.replace("/chat");
    }
  }, [token, isAuthenticated, router]);

  useEffect(() => {
    if (prefersReducedMotion) return;

    const ctx = gsap.context(() => {
      sectionsRef.current.forEach((section, index) => {
        if (!section) return;

        const targets = section.querySelectorAll<HTMLElement>("[data-reveal]");

        gsap.fromTo(
          section,
          { opacity: 0, y: 80, filter: "blur(10px)" },
          {
            opacity: 1,
            y: 0,
            filter: "blur(0px)",
            duration: 1,
            ease: "power3.out",
            scrollTrigger: {
              trigger: section,
              start: "top 80%",
              end: "bottom 70%",
              toggleActions: "play none none reverse",
            },
          }
        );

        if (targets.length) {
          gsap.fromTo(
            targets,
            { opacity: 0, y: 22 },
            {
              opacity: 1,
              y: 0,
              duration: 0.85,
              ease: "power3.out",
              stagger: 0.08,
              scrollTrigger: {
                trigger: section,
                start: "top 75%",
              },
            }
          );
        }

        gsap.to(section, {
          y: index % 2 === 0 ? -12 : 12,
          ease: "none",
          scrollTrigger: {
            trigger: section,
            start: "top bottom",
            end: "bottom top",
            scrub: true,
          },
        });
      });
    });

    return () => ctx.revert();
  }, [prefersReducedMotion]);

  const addSectionRef = (index: number) => (element: HTMLElement | null) => {
    if (element) sectionsRef.current[index] = element;
  };

  return (
    <main
      className="relative min-h-screen overflow-hidden bg-[#0A0A0A] text-white"
      onPointerMove={(event) => {
        mouseX.set(event.clientX);
        mouseY.set(event.clientY);
      }}
    >
      <motion.div
        aria-hidden="true"
        className="pointer-events-none fixed left-0 top-0 z-20 h-1 w-full origin-left bg-linear-to-r from-cyan-400 via-fuchsia-500 to-violet-500"
        style={{ scaleX: progress }}
      />

      {enableHeavyEffects ? (
        <motion.div
          aria-hidden="true"
          className="pointer-events-none fixed z-10 h-32 w-32 rounded-full bg-[#00F0FF]/10 blur-3xl"
          style={{ x: glowX, y: glowY }}
        />
      ) : null}

      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(0,240,255,0.16),transparent_22%),radial-gradient(circle_at_80%_10%,rgba(255,0,200,0.16),transparent_20%),radial-gradient(circle_at_50%_80%,rgba(122,0,255,0.16),transparent_28%)]" />
      <div className="scanlines absolute inset-0 opacity-16" />
      <InteractiveParticleField enabled={enableHeavyEffects} />

      <header className="relative z-10 mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-6 sm:px-6 lg:px-8">
        <Link href="/" className="group flex items-center gap-3">
          <div className="relative flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/6 shadow-[0_0_30px_rgba(0,240,255,0.18)] backdrop-blur-xl">
            <Image src={brandIcon} alt="XConnect AI logo" className="h-6 w-6 object-contain transition-transform duration-300 group-hover:scale-110" priority />
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-cyan-100/50">XConnect AI</p>
            <p className="text-sm text-slate-100/80">Futuristic chat intelligence</p>
          </div>
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          {[
            ["Features", "#features"],
            ["Demo", "#demo"],
            ["Showcase", "#showcase"],
            ["Pricing", "#pricing"],
          ].map(([label, href]) => (
            <a key={label} href={href as string} className="text-sm font-medium text-slate-200/75 transition-colors hover:text-white">
              {label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <Link href="/login" className="rounded-full border border-white/10 bg-white/6 px-4 py-2.5 text-sm font-medium text-white backdrop-blur-xl transition-transform hover:scale-[1.02]">
            Login
          </Link>
          <Link href="/register" className="hidden rounded-full bg-white px-4 py-2.5 text-sm font-bold text-slate-950 transition-transform hover:scale-[1.02] sm:inline-flex">
            Start free
          </Link>
        </div>
      </header>

      <section ref={addSectionRef(0)} className="relative z-10 mx-auto grid w-full max-w-7xl gap-10 px-5 pb-20 pt-8 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:px-8 lg:pt-10">
        <div className="flex flex-col justify-center gap-8">
          <motion.div data-reveal className="inline-flex w-fit items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-400/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.35em] text-cyan-100 shadow-[0_0_35px_rgba(0,240,255,0.12)]">
            <Image src={brandIcon} alt="XConnect AI" className="h-4 w-4 object-contain" />
            AI chat product reveal
          </motion.div>

          <div data-reveal className="space-y-5">
            <AnimatedTitle />
            <p className="max-w-2xl text-lg leading-8 text-slate-200/78 sm:text-xl">
              A futuristic AI chat platform shaped like a cinematic product launch. Every surface reacts, glows, and breathes with motion design built for a premium startup experience.
            </p>
          </div>

          <div data-reveal className="flex flex-col gap-3 sm:flex-row">
            <Link href="/login" className="group inline-flex items-center justify-center gap-2 rounded-full bg-linear-to-r from-[#00F0FF] via-[#7A00FF] to-[#FF00C8] px-6 py-3.5 text-sm font-bold text-black shadow-[0_0_35px_rgba(0,240,255,0.35)] transition-transform hover:scale-[1.02] active:scale-[0.98]">
              Launch app
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <a href="#demo" className="inline-flex items-center justify-center gap-2 rounded-full border border-white/12 bg-white/6 px-6 py-3.5 text-sm font-bold text-white backdrop-blur-xl transition-transform hover:scale-[1.02] active:scale-[0.98]">
              <PlayCircle className="h-4 w-4" />
              Watch AI demo
            </a>
          </div>

          <div data-reveal className="grid gap-3 sm:grid-cols-3">
            {[
              ["Realtime", "Sub-100ms interactions"],
              ["Voice + video", "Immersive communication"],
              ["Secure", "Capacitor-ready auth flow"],
            ].map(([title, subtitle]) => (
              <div key={title} className="rounded-3xl border border-white/10 bg-white/6 p-4 backdrop-blur-xl">
                <p className="text-sm font-semibold text-white">{title}</p>
                <p className="mt-1 text-sm text-slate-200/65">{subtitle}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="relative flex items-center justify-center">
          <motion.div
            data-reveal
            className="relative w-full max-w-140"
            animate={prefersReducedMotion ? {} : { y: [0, -10, 0] }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          >
            <div className="absolute -left-8 top-16 h-32 w-32 rounded-full bg-[#00F0FF]/20 blur-3xl" />
            <div className="absolute -right-10 bottom-20 h-40 w-40 rounded-full bg-[#FF00C8]/20 blur-3xl" />

            <div className="relative overflow-hidden rounded-4xl border border-white/10 bg-white/6 p-4 shadow-[0_30px_120px_rgba(0,0,0,0.55)] backdrop-blur-2xl">
              <div className="absolute inset-0 bg-linear-to-br from-white/8 via-transparent to-transparent" />
              <div className="absolute inset-0 hologram-grid opacity-50" />

              <div className="relative grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
                <div className="rounded-[1.6rem] border border-white/10 bg-slate-950/40 p-5">
                  <div className="mb-5 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-cyan-100/60">Mission Control</p>
                      <h3 className="mt-2 text-lg font-bold text-white">AI command center</h3>
                    </div>
                    <div className="rounded-2xl border border-cyan-300/20 bg-cyan-400/10 p-3 text-cyan-100">
                      <BrainCircuit className="h-5 w-5" />
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    {[
                      ["99.9%", "Uptime ready"],
                      ["12x", "Faster workflow"],
                      ["24/7", "AI assistance"],
                      ["∞", "Conversation context"],
                    ].map(([value, label]) => (
                      <div key={label} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                        <p className="text-2xl font-black text-white">{value}</p>
                        <p className="mt-1 text-sm text-slate-200/65">{label}</p>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200/75">
                    <LockKeyhole className="h-4 w-4 text-cyan-100" />
                    End-to-end authenticated experience for mobile and web.
                  </div>
                </div>

                <div className="grid gap-4">
                  <motion.div
                    className="rounded-[1.6rem] border border-white/10 bg-[linear-gradient(180deg,rgba(0,240,255,0.16),rgba(255,255,255,0.04))] p-4"
                    whileHover={{ rotate: -1.2, scale: 1.02 }}
                    transition={{ type: "spring", stiffness: 180, damping: 18 }}
                  >
                    <p className="text-xs uppercase tracking-[0.32em] text-cyan-100/60">Floating UI</p>
                    <h4 className="mt-3 text-lg font-semibold text-white">Magnetic cards, neon edge glow</h4>
                    <div className="mt-4 flex h-24 items-center justify-center rounded-3xl border border-white/10 bg-slate-950/40 text-slate-100/70">
                      <MessageSquareText className="h-8 w-8 text-cyan-200" />
                    </div>
                  </motion.div>

                  <motion.div
                    className="rounded-[1.6rem] border border-white/10 bg-white/6 p-4 backdrop-blur-xl"
                    whileHover={{ rotate: 1.2, scale: 1.02 }}
                    transition={{ type: "spring", stiffness: 180, damping: 18 }}
                  >
                    <p className="text-xs uppercase tracking-[0.32em] text-cyan-100/60">Live audio</p>
                    <div className="mt-3 flex items-center justify-between">
                      <div>
                        <h4 className="text-lg font-semibold text-white">Voice and video glow</h4>
                        <p className="text-sm text-slate-200/65">Smooth realtime calls with animated signal energy.</p>
                      </div>
                      <Mic className="h-5 w-5 text-[#FF00C8]" />
                    </div>
                  </motion.div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <section ref={addSectionRef(1)} id="features" className="relative z-10 mx-auto w-full max-w-7xl px-5 py-20 sm:px-6 lg:px-8">
        <SectionLabel
          eyebrow="Features"
          title="Interactive systems for premium AI storytelling"
          desc="The landing behaves like a living product experience. Every card, border, and layer is designed to animate into view with intention, not noise."
        />

        <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {features.map((feature) => (
            <motion.div
              key={feature.title}
              data-reveal
              whileHover={{ y: -6, scale: 1.02 }}
              transition={{ type: "spring", stiffness: 200, damping: 20 }}
              className="group rounded-4xl border border-white/10 bg-white/6 p-5 backdrop-blur-2xl"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-300/20 bg-cyan-400/10 text-cyan-100 shadow-[0_0_32px_rgba(0,240,255,0.12)] transition-transform group-hover:scale-110">
                <feature.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-5 text-lg font-semibold text-white">{feature.title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-200/70">{feature.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <section ref={addSectionRef(2)} id="demo" className="relative z-10 mx-auto w-full max-w-7xl px-5 py-20 sm:px-6 lg:px-8">
        <SectionLabel
          eyebrow="AI Demo"
          title="A conversation that feels alive"
          desc="This section simulates an AI exchange with motion, typing rhythm, and layered UI state so the product feels active even before login."
        />

        <div className="mt-10 grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <motion.div data-reveal className="rounded-4xl border border-white/10 bg-white/6 p-6 backdrop-blur-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.35em] text-cyan-100/60">Adaptive AI</p>
                <h3 className="mt-2 text-2xl font-bold text-white">Smart response engine</h3>
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-3">
                <Telescope className="h-5 w-5 text-[#00F0FF]" />
              </div>
            </div>

            <div className="mt-5 space-y-3">
              {[
                "Rewrite replies in a cleaner tone.",
                "Summarize long threads into a single card.",
                "Keep the next action visible at all times.",
              ].map((item) => (
                <div key={item} className="flex items-start gap-3 rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-sm text-slate-200/75">
                  <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-cyan-200" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </motion.div>

          <div data-reveal>
            <DemoConversation />
          </div>
        </div>
      </section>

      <section ref={addSectionRef(3)} id="showcase" className="relative z-10 mx-auto w-full max-w-7xl px-5 py-20 sm:px-6 lg:px-8">
        <SectionLabel
          eyebrow="Showcase"
          title="A cinematic product surface with depth"
          desc="The showcase uses floating panels, parallax, and layered composition so the app looks premium even in still moments."
        />

        <div className="mt-10 grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
          <motion.div
            data-reveal
            className="relative overflow-hidden rounded-[2.2rem] border border-white/10 bg-white/6 p-5 backdrop-blur-2xl"
            whileHover={{ rotateX: 2, rotateY: -4, scale: 1.01 }}
            style={{ transformStyle: "preserve-3d" }}
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(0,240,255,0.14),transparent_25%),radial-gradient(circle_at_bottom_left,rgba(255,0,200,0.12),transparent_30%)]" />
            <div className="absolute inset-0 cyber-grid opacity-35" />

            <div className="relative grid gap-4 md:grid-cols-[1.1fr_0.9fr]">
              <div className="rounded-[1.6rem] border border-white/10 bg-slate-950/50 p-5">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-cyan-100/60">Device preview</p>
                    <h3 className="mt-2 text-xl font-bold text-white">Floating screens, synchronized depth</h3>
                  </div>
                  <Layers3 className="h-5 w-5 text-cyan-100" />
                </div>

                <div className="space-y-3">
                  <div className="h-40 rounded-[1.4rem] border border-white/10 bg-[linear-gradient(135deg,rgba(0,240,255,0.12),rgba(255,255,255,0.05))] p-4">
                    <div className="flex h-full items-center justify-between rounded-[1.1rem] border border-white/10 bg-slate-950/45 px-4">
                      <div>
                        <p className="text-xs uppercase tracking-[0.3em] text-cyan-100/55">Chat canvas</p>
                        <p className="mt-2 text-lg font-semibold text-white">Messages, reactions, pinned context</p>
                      </div>
                      <MessageSquareText className="h-8 w-8 text-[#00F0FF]" />
                    </div>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {[
                      ["Glass panels", "Transparent UI with strong depth."],
                      ["AI overlays", "Neon indicators and glow states."],
                    ].map(([title, desc]) => (
                      <div key={title} className="rounded-[1.2rem] border border-white/10 bg-white/5 p-4">
                        <p className="text-sm font-semibold text-white">{title}</p>
                        <p className="mt-1 text-sm text-slate-200/65">{desc}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                {[
                  ["Zero-friction onboarding", "Animated entry points into login and register."],
                  ["Motion on every layer", "Cards, buttons, grids, and glow all move together."],
                  ["Responsive by default", "Scales from mobile launch screens to desktop reveal pages."],
                ].map(([title, desc]) => (
                  <div key={title} className="rounded-[1.4rem] border border-white/10 bg-slate-950/45 p-5">
                    <p className="text-base font-semibold text-white">{title}</p>
                    <p className="mt-2 text-sm leading-6 text-slate-200/70">{desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          <div className="grid gap-4">
            <motion.div data-reveal className="rounded-4xl border border-white/10 bg-white/6 p-6 backdrop-blur-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-cyan-100/60">Ambient tech</p>
              <div className="mt-4 flex flex-wrap gap-3">
                {marqueeItems.map((item) => (
                  <span key={item} className="rounded-full border border-white/10 bg-slate-950/45 px-4 py-2 text-sm text-slate-100/80">
                    {item}
                  </span>
                ))}
              </div>
            </motion.div>

            <motion.div data-reveal className="rounded-4xl border border-white/10 bg-white/6 p-6 backdrop-blur-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-cyan-100/60">Signal</p>
              <div className="mt-4 flex h-40 items-center justify-center rounded-3xl border border-white/10 bg-slate-950/45">
                <div className="flex items-end gap-2">
                  {[38, 58, 26, 72, 44, 64, 36].map((bar, index) => (
                    <motion.span
                      key={`${bar}-${index}`}
                      className="w-2 rounded-full bg-linear-to-t from-[#7A00FF] via-[#FF00C8] to-[#00F0FF]"
                      animate={prefersReducedMotion ? {} : { blockSize: [bar, bar + 18, bar] }}
                      transition={{ duration: 2.4, repeat: Infinity, delay: index * 0.14, ease: "easeInOut" }}
                    />
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      <section ref={addSectionRef(4)} className="relative z-10 mx-auto w-full max-w-7xl px-5 py-20 sm:px-6 lg:px-8">
        <SectionLabel
          eyebrow="Testimonials"
          title="What premium teams would say"
          desc="A rapid testimonial rail gives the page momentum and adds another layer of social proof without slowing the experience down."
        />

        <div className="mt-10 overflow-hidden rounded-4xl border border-white/10 bg-white/6 py-6 backdrop-blur-2xl">
          <div className="marquee-track flex gap-4 px-4">
            {[...testimonials, ...testimonials].map((item, index) => (
              <div key={`${item.name}-${index}`} className="w-[min(88vw,360px)] shrink-0 rounded-[1.6rem] border border-white/10 bg-slate-950/45 p-5">
                <p className="text-sm leading-6 text-slate-100/80">“{item.quote}”</p>
                <p className="mt-4 text-xs font-semibold uppercase tracking-[0.28em] text-cyan-100/55">{item.name}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section ref={addSectionRef(5)} id="pricing" className="relative z-10 mx-auto w-full max-w-7xl px-5 py-20 sm:px-6 lg:px-8">
        <SectionLabel
          eyebrow="Pricing"
          title="Built like a startup launch page"
          desc="The pricing block anchors the experience with a familiar conversion pattern, but keeps the cyberpunk visual language intact."
        />

        <div className="mt-10 grid gap-5 lg:grid-cols-3">
          {pricing.map((plan) => (
            <motion.div
              key={plan.tier}
              data-reveal
              whileHover={{ y: -8, scale: 1.02 }}
              transition={{ type: "spring", stiffness: 180, damping: 18 }}
              className={`rounded-4xl border p-6 backdrop-blur-2xl ${plan.featured ? "border-cyan-300/30 bg-[linear-gradient(180deg,rgba(0,240,255,0.14),rgba(255,255,255,0.06))]" : "border-white/10 bg-white/6"}`}
            >
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-cyan-100/60">{plan.tier}</p>
              <div className="mt-4 flex items-end gap-2">
                <h3 className="text-4xl font-black text-white">{plan.price}</h3>
                <span className="pb-1 text-sm text-slate-200/55">/ month</span>
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-200/70">{plan.desc}</p>
              <div className="mt-5 space-y-3">
                {plan.items.map((item) => (
                  <div key={item} className="flex items-center gap-3 text-sm text-slate-100/85">
                    <div className="h-2.5 w-2.5 rounded-full bg-[#00F0FF] shadow-[0_0_16px_rgba(0,240,255,0.75)]" />
                    {item}
                  </div>
                ))}
              </div>
              <Link
                href="/register"
                className={`mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-bold transition-transform hover:scale-[1.02] active:scale-[0.98] ${
                  plan.featured
                    ? "bg-white text-slate-950"
                    : "border border-white/10 bg-slate-950/50 text-white"
                }`}
              >
                Choose {plan.tier}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      <footer className="relative z-10 border-t border-white/10 px-5 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 rounded-4xl border border-white/10 bg-white/5 px-6 py-8 backdrop-blur-2xl lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-cyan-100/60">XConnect AI</p>
            <h2 className="mt-2 text-2xl font-bold text-white">A next-generation AI chat experience.</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-200/70">
              Designed to feel alive from the first frame: neon depth, motion storytelling, interactive particles, and a clear path into the product.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link href="/login" className="rounded-full border border-white/10 bg-white/6 px-5 py-3 text-sm font-medium text-white backdrop-blur-xl transition-transform hover:scale-[1.02]">
              Login
            </Link>
            <Link href="/register" className="rounded-full bg-white px-5 py-3 text-sm font-bold text-slate-950 transition-transform hover:scale-[1.02]">
              Get started
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
