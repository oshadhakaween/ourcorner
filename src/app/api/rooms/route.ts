import { desc, ne } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { rooms } from "@/db/schema";
import { games } from "@/lib/games";
import { getMe } from "@/lib/auth";

// List games that are waiting or being played.
export async function GET() {
  const me = await getMe();
  if (!me) return new Response("Unauthorized", { status: 401 });

  const rows = await db
    .select()
    .from(rooms)
    .where(ne(rooms.status, "finished"))
    .orderBy(desc(rooms.createdAt))
    .limit(20);
  return Response.json(rows);
}

// When you add a game, add its name to this list too.
const Body = z.object({ game: z.enum(["tictactoe", "connect4"]) });

export async function POST(req: Request) {
  const me = await getMe();
  if (!me) return new Response("Unauthorized", { status: 401 });

  const parsed = Body.safeParse(await req.json());
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
