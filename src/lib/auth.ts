import { auth, currentUser } from "@clerk/nextjs/server";

// Second lock: even if a stranger somehow got a Clerk account,
// only the emails listed in ALLOWED_EMAILS can use the site.
export async function getMe() {
  const { userId } = await auth();
  if (!userId) return null;

  const user = await currentUser();
  const email = user?.primaryEmailAddress?.emailAddress?.toLowerCase();
  const allowed = (process.env.ALLOWED_EMAILS ?? "")
    .toLowerCase()
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean);

  if (!email || !allowed.includes(email)) return null;
  return { id: userId, name: user?.firstName ?? "Someone", email };
}
