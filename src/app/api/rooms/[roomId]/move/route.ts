import { and, eq, or } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { rooms } from "@/db/schema";
import { games } from "@/lib/games";
import { ablyRest } from "@/lib/ably";
import { getMe } from "@/lib/auth";

const Body = z.object({ move: z.unknown() });

export async function POST(req: Request, { params }: { params: Promise<{ roomId: string }> }) {
  const me = await getMe();
  if (!me) return new Response("Unauthorized", { status: 401 });

  const { roomId } = await params;
  if (!z.string().uuid().safeParse(roomId).success) return new Response("Not found", { status: 404 });

  let body: unknown;
  try { body = await req.json(); } catch { return new Response("Bad request", { status: 400 }); }
  const parsed = Body.safeParse(body);
  if (!parsed.success) return new Response("Bad request", { status: 400 });

  const [room] = await db.select().from(rooms).where(and(
    eq(rooms.id, roomId),
    or(eq(rooms.hostId, me.id), eq(rooms.guestId, me.id))
  ));
  if (!room || room.status !== "playing") return new Response("Not playing", { status: 409 });
  if (room.turn !== me.id) return new Response("Not your turn", { status: 409 });

  const player = room.hostId === me.id ? 0 : 1;
  const game = games[room.game as keyof typeof games];
  if (!game) return new Response("Unknown game", { status: 400 });
  const result = game.applyMove(room.state, parsed.data.move, player);
  if ("error" in result) return new Response(result.error, { status: 400 });

  const finished = result.winner !== null;
  const winnerId = result.winner === 0 ? room.hostId : result.winner === 1 ? room.guestId : result.winner;
  const [updated] = await db.update(rooms).set({
    state: result.state,
    turn: finished ? null : result.nextTurn === 0 ? room.hostId : room.guestId,
    status: finished ? "finished" : "playing",
    winner: winnerId,
    version: room.version + 1,
    updatedAt: new Date(),
  }).where(and(eq(rooms.id, roomId), eq(rooms.version, room.version))).returning();

  if (!updated) return new Response("Conflict, try again", { status: 409 });
  await ablyRest.channels.get(`room:${roomId}`).publish("update", updated);
  return Response.json(updated);
}
