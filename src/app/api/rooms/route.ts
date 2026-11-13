import { and, desc, gt, ne, or, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { rooms } from "@/db/schema";
import { games, GAME_NAMES } from "@/lib/games";
import { getMe } from "@/lib/auth";

// List games you can open or join: yours, or someone else's that is still waiting.
export async function GET() {
  const me = await getMe();
  if (!me) return new Response("Unauthorized", { status: 401 });

  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const rows = await db
    .select()
    .from(rooms)
    .where(
      and(
        ne(rooms.status, "finished"),
        gt(rooms.createdAt, dayAgo),
        or(eq(rooms.hostId, me.id), eq(rooms.guestId, me.id), eq(rooms.status, "waiting"))
      )
    )
    .orderBy(desc(rooms.createdAt))
    .limit(20);
  return Response.json(rows, { headers: { "Cache-Control": "private, no-store" } });
}

const Body = z.object({ game: z.enum(GAME_NAMES) });

export async function POST(req: Request) {
  const me = await getMe();
  if (!me) return new Response("Unauthorized", { status: 401 });

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return new Response("Bad request", { status: 400 });
  }
  const parsed = Body.safeParse(json);
  if (!parsed.success) return new Response("Bad request", { status: 400 });

  const [room] = await db
    .insert(rooms)
    .values({
      game: parsed.data.game,
      hostId: me.id,
      state: games[parsed.data.game].initialState(),
    })
    .returning();
  return Response.json(room);
}
