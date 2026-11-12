import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { rooms } from "@/db/schema";
import { ablyRest } from "@/lib/ably";
import { getMe } from "@/lib/auth";

export async function POST(_req: Request, { params }: { params: Promise<{ roomId: string }> }) {
  const me = await getMe();
  if (!me) return new Response("Unauthorized", { status: 401 });

  const { roomId } = await params;
  const [room] = await db.select().from(rooms).where(eq(rooms.id, roomId));
  if (!room || room.status !== "waiting" || room.hostId === me.id) {
    return new Response("Cannot join", { status: 409 });
  }

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
  if (!updated) return new Response("Cannot join", { status: 409 });

  await ablyRest.channels.get(`room:${roomId}`).publish("update", updated);
  return Response.json(updated);
}
