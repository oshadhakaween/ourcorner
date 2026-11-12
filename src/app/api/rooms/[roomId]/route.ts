import { eq } from "drizzle-orm";
import { db } from "@/db";
import { rooms } from "@/db/schema";
import { getMe } from "@/lib/auth";

export async function GET(_req: Request, { params }: { params: Promise<{ roomId: string }> }) {
  const me = await getMe();
  if (!me) return new Response("Unauthorized", { status: 401 });

  const { roomId } = await params;
  const [room] = await db.select().from(rooms).where(eq(rooms.id, roomId));
  if (!room) return new Response("Not found", { status: 404 });
  return Response.json(room);
}
