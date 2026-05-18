import { redirect } from "next/navigation";

// Root: proxy.ts guards this route (no token → /login)
// If authenticated, redirect to /chat
export default function HomePage() {
  redirect("/chat");
}
