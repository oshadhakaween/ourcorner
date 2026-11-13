import { eq } from "drizzle-orm";
import { db } from "@/db";
import { rooms } from "@/db/schema";
import { ablyRest } from "@/lib/ably";
import { getMe } from "@/lib/auth";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Read one game (used for the first load and as a backup to live updates).
export async function GET(_req: Request, { params }: { params: Promise<{ roomId: string }> }) {
  const me = await getMe();
  if (!me) return new Response("Unauthorized", { status: 401 });

  const { roomId } = await params;
  if (!UUID.test(roomId)) return new Response("Not found", { status: 404 });

  const [room] = await db.select().from(rooms).where(eq(rooms.id, roomId));
  if (!room) return new Response("Not found", { status: 404 });
  return Response.json(room, { headers: { "Cache-Control": "private, no-store" } });
}

// Leave / cancel a game. Either player can end it.
export async function DELETE(_req: Request, { params }: { params: Promise<{ roomId: string }> }) {
  const me = await getMe();
  if (!me) return new Response("Unauthorized", { status: 401 });

  const { roomId } = await params;
  if (!UUID.test(roomId)) return new Response("Not found", { status: 404 });

  const [room] = await db.select().from(rooms).where(eq(rooms.id, roomId));
  if (!room) return new Response("Not found", { status: 404 });
  if (room.hostId !== me.id && room.guestId !== me.id) return new Response("Not your game", { status: 403 });
  if (room.status === "finished") return Response.json(room);

  const [updated] = await db
    .update(rooms)
    .set({ status: "finished", turn: null, winner: null, version: room.version + 1, updatedAt: new Date() })
    .where(eq(rooms.id, roomId))
    .returning();

  try {
    await ablyRest.channels.get(`room:${roomId}`).publish("update", updated);
  } catch {}
  return Response.json(updated);
}
