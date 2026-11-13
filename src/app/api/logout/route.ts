import { clearCookieHeader } from "@/lib/session";

// Removes the "stay logged in" cookie. The /sign-out page calls this, then signs out of Clerk.
export async function POST() {
  return new Response(null, { status: 204, headers: { "Set-Cookie": clearCookieHeader() } });
}
