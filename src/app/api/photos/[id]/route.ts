import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { photos } from "@/db/schema";
import { r2 } from "@/lib/r2";
import { getMe } from "@/lib/auth";

// The vault belongs to both of you, so either of you can rename or remove a photo.

async function load(params: Promise<{ id: string }>) {
  const { id } = await params;
  const photoId = Number(id);
  if (!Number.isInteger(photoId)) return null;
  const [photo] = await db.select().from(photos).where(eq(photos.id, photoId));
  return photo ?? null;
}

// Change the caption.
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const me = await getMe();
  if (!me) return new Response("Unauthorized", { status: 401 });

  const photo = await load(params);
  if (!photo) return new Response("Not found", { status: 404 });

  let json: { caption?: unknown };
  try {
    json = await req.json();
  } catch {
    return new Response("Bad request", { status: 400 });
  }
  if (typeof json.caption !== "string") return new Response("Bad request", { status: 400 });
  const caption = json.caption.trim().slice(0, 120) || null;

  const [updated] = await db.update(photos).set({ caption }).where(eq(photos.id, photo.id)).returning();
  return Response.json(updated);
}

// Delete the photo (and its file).
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const me = await getMe();
  if (!me) return new Response("Unauthorized", { status: 401 });

  const photo = await load(params);
  if (!photo) return new Response("Not found", { status: 404 });

  try {
    await r2.send(new DeleteObjectCommand({ Bucket: process.env.R2_BUCKET!, Key: photo.key }));
  } catch {}
  await db.delete(photos).where(eq(photos.id, photo.id));
  return Response.json({ ok: true });
}
