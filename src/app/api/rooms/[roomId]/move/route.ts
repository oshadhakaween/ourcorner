import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { rooms } from "@/db/schema";
import { games, type GameName } from "@/lib/games";
import { ablyRest } from "@/lib/ably";
import { getMe } from "@/lib/auth";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// The heart of multiplayer: the SERVER checks every move, saves it, and tells both players.
export async function POST(req: Request, { params }: { params: Promise<{ roomId: string }> }) {
  const me = await getMe();
  if (!me) return new Response("Unauthorized", { status: 401 });

  const { roomId } = await params;
  if (!UUID.test(roomId)) return new Response("Not found", { status: 404 });

  let body: { move?: unknown };
  try {
    body = await req.json();
  } catch {
    return new Response("Bad request", { status: 400 });
  }

  const [room] = await db.select().from(rooms).where(eq(rooms.id, roomId));
  if (!room) return new Response("Not found", { status: 404 });
  if (room.status !== "playing") return new Response("This game is not being played", { status: 409 });
  if (room.turn !== me.id) return new Response("Not your turn", { status: 409 });

  const game = games[room.game as GameName];
  if (!game) return new Response("Unknown game", { status: 400 });

  const player = room.hostId === me.id ? 0 : 1;
  const result = game.applyMove(room.state, body.move, player);
  if ("error" in result) return new Response(result.error, { status: 400 });

  const finished = result.winner !== null;
  const winnerId =
    result.winner === 0 ? room.hostId : result.winner === 1 ? room.guestId : result.winner; // an id, "draw" or null

  // "version" guard: if both of you tap at the same instant, only one move is saved.
  const [updated] = await db
    .update(rooms)
    .set({
      state: result.state,
      turn: finished ? null : result.nextTurn === 0 ? room.hostId : room.guestId,
      status: finished ? "finished" : "playing",
      winner: winnerId,
      version: room.version + 1,
      updatedAt: new Date(),
    })
    .where(and(eq(rooms.id, roomId), eq(rooms.version, room.version)))
    .returning();
  if (!updated) return new Response("Conflict, try again", { status: 409 });

  try {
    await ablyRest.channels.get(`room:${roomId}`).publish("update", updated);
  } catch {}
  return Response.json(updated);
}
