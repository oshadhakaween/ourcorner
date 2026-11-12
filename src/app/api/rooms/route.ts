import { and, desc, eq, ne, or } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { rooms } from "@/db/schema";
import { games } from "@/lib/games";
import { getMe } from "@/lib/auth";

export async function GET() {
  const me = await getMe();
  if (!me) return new Response("Unauthorized", { status: 401 });

  const rows = await db.select().from(rooms).where(and(
    ne(rooms.status, "finished"),
    or(eq(rooms.status, "waiting"), eq(rooms.hostId, me.id), eq(rooms.guestId, me.id))
  )).orderBy(desc(rooms.createdAt)).limit(20);

  return Response.json(rows);
}

const Body = z.object({ game: z.enum(["tictactoe", "connect4"]) });

export async function POST(req: Request) {
  const me = await getMe();
  if (!me) return new Response("Unauthorized", { status: 401 });

  let body: unknown;
  try { body = await req.json(); } catch { return new Response("Bad request", { status: 400 }); }
  const parsed = Body.safeParse(body);
  if (!parsed.success) return new Response("Bad request", { status: 400 });

  const [room] = await db.insert(rooms).values({
    game: parsed.data.game,
    hostId: me.id,
    state: games[parsed.data.game].initialState(),
  }).returning();

  return Response.json(room);
}
