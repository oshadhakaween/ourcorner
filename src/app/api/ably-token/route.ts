import { eq, or } from "drizzle-orm";
import { db } from "@/db";
import { rooms } from "@/db/schema";
import { getMe } from "@/lib/auth";
import { ablyRest } from "@/lib/ably";

export async function GET() {
  const me = await getMe();
  if (!me) return new Response("Unauthorized", { status: 401 });

  const memberships = await db.select({ id: rooms.id }).from(rooms)
    .where(or(eq(rooms.hostId, me.id), eq(rooms.guestId, me.id)));

  const capability: Record<string, string[]> = { chat: ["subscribe"] };
  for (const room of memberships) capability[`room:${room.id}`] = ["subscribe"];

  const tokenRequest = await ablyRest.auth.createTokenRequest({ clientId: me.id, capability });
  return Response.json(tokenRequest);
}
