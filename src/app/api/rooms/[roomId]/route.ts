import { and, eq, or } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { rooms } from "@/db/schema";
import { getMe } from "@/lib/auth";

export async function GET(_req: Request, { params }: { params: Promise<{ roomId: string }> }) {
  const me = await getMe();
  if (!me) return new Response("Unauthorized", { status: 401 });

  const { roomId } = await params;
  if (!z.string().uuid().safeParse(roomId).success) return new Response("Not found", { status: 404 });

  const [room] = await db.select().from(rooms).where(and(
    eq(rooms.id, roomId),
    or(eq(rooms.hostId, me.id), eq(rooms.guestId, me.id))
  ));
  if (!room) return new Response("Not found", { status: 404 });
  return Response.json(room);
}
