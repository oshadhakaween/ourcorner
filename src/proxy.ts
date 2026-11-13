import { clerkMiddleware } from "@clerk/nextjs/server";
import { SESSION_COOKIE, verifySession } from "@/lib/session";

// Pages anyone may open: the login screen, the logout screen and the
// "this corner is private" notice. Everything else needs a login.
const PUBLIC_PREFIXES = ["/sign-in", "/sign-out", "/not-allowed", "/api/logout"];

export default clerkMiddleware(async (auth, req) => {
  const { pathname } = req.nextUrl;
  if (PUBLIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"))) return;

  // 1. logged in with Clerk right now
  const { userId } = await auth();
  if (userId) return;

  // 2. or logged in recently (signed cookie, see src/lib/session.ts)
  const cookie = req.cookies.get(SESSION_COOKIE)?.value;
  if (cookie && (await verifySession(cookie))) return;

  // 3. not logged in: pages go to the login screen, everything else gets a plain 401
  const wantsPage =
    req.headers.get("sec-fetch-dest") === "document" || (req.headers.get("accept") ?? "").includes("text/html");
  if (wantsPage) {
    await auth.protect();
    return;
  }
  return new Response("Unauthorized", { status: 401 });
});

// Runs on everything except Next.js internals, because your original site
// (pages, scripts, photos) is served from a private folder behind the login.
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)", "/(api|trpc)(.*)"],
};
