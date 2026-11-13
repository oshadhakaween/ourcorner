import { asc, desc, gt } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { messages } from "@/db/schema";
import { ablyRest } from "@/lib/ably";
import { getMe } from "@/lib/auth";

// GET /api/messages            -> the last 100 messages
// GET /api/messages?after=123  -> only messages newer than id 123 (cheap refresh)
export async function GET(req: Request) {
  const me = await getMe();
  if (!me) return new Response("Unauthorized", { status: 401 });

  const afterRaw = new URL(req.url).searchParams.get("after");
  const after = afterRaw === null ? NaN : Number(afterRaw);

  if (Number.isInteger(after) && after >= 0) {
    const rows = await db
      .select()
      .from(messages)
      .where(gt(messages.id, after))
      .orderBy(asc(messages.id))
      .limit(100);
    return Response.json(rows, { headers: { "Cache-Control": "private, no-store" } });
  }

  const rows = await db.select().from(messages).orderBy(desc(messages.id)).limit(100);
  return Response.json(rows.reverse(), { headers: { "Cache-Control": "private, no-store" } });
}

const Body = z.object({ body: z.string().trim().min(1).max(2000) });

export async function POST(req: Request) {
  const me = await getMe();
  if (!me) return new Response("Unauthorized", { status: 401 });

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return new Response("Bad request", { status: 400 });
  }
  const parsed = Body.safeParse(json);
  if (!parsed.success) return new Response("Bad request", { status: 400 });

  const [row] = await db
    .insert(messages)
    .values({ senderId: me.id, senderName: me.name, body: parsed.data.body })
    .returning();

  // Live delivery is a bonus: if Ably is down the message is still saved,
  // and the other browser picks it up on its next refresh.
  try {
    await ablyRest.channels.get("chat").publish("message", row);
  } catch {}

  return Response.json(row);
}
