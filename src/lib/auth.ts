import { cookies } from "next/headers";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { SESSION_COOKIE, verifySession } from "@/lib/session";

export type Person = { id: string; name: string; email: string; imageUrl: string };

// ---------------------------------------------------------------------
// Who may use the site: only the emails in ALLOWED_EMAILS (comma separated).
// ---------------------------------------------------------------------
export function allowedEmails(): string[] {
  return (process.env.ALLOWED_EMAILS ?? "")
    .toLowerCase()
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean);
}

export function displayName(u: {
  firstName?: string | null;
  username?: string | null;
  email?: string;
}) {
  return u.firstName || u.username || (u.email ? u.email.split("@")[0] : "") || "Someone";
}

// ---------------------------------------------------------------------
// Step 1: is someone logged in? Either Clerk says so right now, or they
// logged in recently and carry the signed cookie (see src/lib/session.ts).
// "via" tells the page server whether to hand out a fresh cookie.
// ---------------------------------------------------------------------
export async function getAuth(): Promise<{ userId: string; via: "clerk" | "cookie" } | null> {
  const { userId } = await auth();
  if (userId) return { userId, via: "clerk" };

  const jar = await cookies();
  const value = jar.get(SESSION_COOKIE)?.value;
  const id = value ? await verifySession(value) : null;
  return id ? { userId: id, via: "cookie" } : null;
}

export async function getUserId(): Promise<string | null> {
  return (await getAuth())?.userId ?? null;
}

// ---------------------------------------------------------------------
// Step 2: is that person on the allowed list? Every image, script and API
// call asks, so the answer is remembered for a few minutes instead of
// asking Clerk's servers each time.
// ---------------------------------------------------------------------
type ClerkUserLike = {
  id: string;
  firstName: string | null;
  username: string | null;
  imageUrl: string;
  emailAddresses: Array<{ emailAddress: string }>;
};

const meCache = new Map<string, { me: Person | null; at: number }>();
const YES_MS = 10 * 60 * 1000;
const NO_MS = 60 * 1000;

export async function getMe(): Promise<Person | null> {
  const userId = await getUserId();
  if (!userId) return null;

  const hit = meCache.get(userId);
  if (hit && Date.now() - hit.at < (hit.me ? YES_MS : NO_MS)) return hit.me;

  let me: Person | null = null;
  try {
    const client = await clerkClient();
    const user = (await client.users.getUser(userId)) as unknown as ClerkUserLike;
    const allowed = allowedEmails();
    const email = user.emailAddresses.map((e) => e.emailAddress.toLowerCase()).find((e) => allowed.includes(e));
    if (email) {
      me = {
        id: userId,
        name: displayName({ firstName: user.firstName, username: user.username, email }),
        email,
        imageUrl: user.imageUrl ?? "",
      };
    }
  } catch {
    me = null; // unknown or deleted account
  }

  meCache.set(userId, { me, at: Date.now() });
  return me;
}

// ---------------------------------------------------------------------
// The other person (shown next to you in the profile menu and in games).
// ---------------------------------------------------------------------
let partnerCache: { key: string; person: Person | null; at: number } | null = null;

export async function getPartner(me: Person): Promise<Person | null> {
  const others = allowedEmails().filter((e) => e !== me.email);
  if (others.length === 0) return null;

  const key = me.id + "|" + others.join(",");
  if (partnerCache && partnerCache.key === key && Date.now() - partnerCache.at < (partnerCache.person ? YES_MS : NO_MS)) {
    return partnerCache.person;
  }

  let person: Person | null = null;
  try {
    const client = await clerkClient();
    const res = (await client.users.getUserList({ emailAddress: others, limit: 5 })) as unknown;
    const list = (Array.isArray(res) ? res : ((res as { data?: unknown[] }).data ?? [])) as ClerkUserLike[];
    const u = list.find((x) => x.id !== me.id);
    if (u) {
      const email =
        u.emailAddresses.map((e) => e.emailAddress.toLowerCase()).find((e) => others.includes(e)) ?? others[0];
      person = {
        id: u.id,
        name: displayName({ firstName: u.firstName, username: u.username, email }),
        email,
        imageUrl: u.imageUrl ?? "",
      };
    }
  } catch {
    // not fatal: the profile menu simply shows no partner yet
  }

  partnerCache = { key, person, at: Date.now() };
  return person;
}
