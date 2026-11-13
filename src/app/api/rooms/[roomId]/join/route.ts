import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { rooms } from "@/db/schema";
import { ablyRest } from "@/lib/ably";
import { getMe } from "@/lib/auth";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(_req: Request, { params }: { params: Promise<{ roomId: string }> }) {
  const me = await getMe();
  if (!me) return new Response("Unauthorized", { status: 401 });

  const { roomId } = await params;
  if (!UUID.test(roomId)) return new Response("Not found", { status: 404 });

  const [room] = await db.select().from(rooms).where(eq(rooms.id, roomId));
  if (!room) return new Response("Not found", { status: 404 });
  if (room.guestId === me.id || room.hostId === me.id) return Response.json(room); // already in
  if (room.status !== "waiting") return new Response("This game already started", { status: 409 });

  const [updated] = await db
    .update(rooms)
    .set({
      guestId: me.id,
      status: "playing",
      turn: room.hostId, // the host moves first
      version: room.version + 1,
      updatedAt: new Date(),
    })
    .where(and(eq(rooms.id, roomId), eq(rooms.status, "waiting")))
    .returning();
  if (!updated) return new Response("This game already started", { status: 409 });

  try {
    await ablyRest.channels.get(`room:${roomId}`).publish("update", updated);
  } catch {}
  return Response.json(updated);
}
