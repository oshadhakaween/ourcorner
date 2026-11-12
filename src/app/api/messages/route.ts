import { desc } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { messages } from "@/db/schema";
import { ablyRest } from "@/lib/ably";
import { getMe } from "@/lib/auth";

export async function GET() {
  const me = await getMe();
  if (!me) return new Response("Unauthorized", { status: 401 });

  const rows = await db.select().from(messages).orderBy(desc(messages.id)).limit(100);
  return Response.json(rows.reverse());
}

const Body = z.object({ body: z.string().trim().min(1).max(2000) });

export async function POST(req: Request) {
  const me = await getMe();
  if (!me) return new Response("Unauthorized", { status: 401 });

  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) return new Response("Bad request", { status: 400 });

  const [row] = await db
    .insert(messages)
    .values({ senderId: me.id, senderName: me.name, body: parsed.data.body })
    .returning();

  await ablyRest.channels.get("chat").publish("message", row);
  return Response.json(row);
}
