import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import { Providers } from "./providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "XConnect | Messaging Portfolio",
  description: "XConnect is a polished messaging app with chat, calling, and a modern animated UI.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col relative isolate">
        <div aria-hidden="true" className="fixed inset-0 -z-20 overflow-hidden pointer-events-none">
          <div className="absolute inset-0 hero-grid opacity-35" />
          <div className="ambient-orb absolute -top-16 left-[-3%] h-40 w-40 rounded-full bg-cyan-400/18" />
          <div className="ambient-orb ambient-orb-alt absolute top-1/4 right-[-2%] h-48 w-48 rounded-full bg-indigo-500/16" />
          <div className="absolute bottom-[-10%] left-1/3 h-56 w-56 rounded-full bg-sky-500/10 blur-[90px]" />
        </div>
        <Providers>
          <Toaster
            position="top-right"
            closeButton
            richColors
            theme="system"
            toastOptions={{
              className: "cursor-pointer active:scale-95 transition-transform",
            }}
          />
          {children}
        </Providers>
      </body>
    </html>
  );
}
