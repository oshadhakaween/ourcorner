import { GetObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { desc } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { photos } from "@/db/schema";
import { r2 } from "@/lib/r2";
import { getMe } from "@/lib/auth";

const MAX_PHOTO_BYTES = 10 * 1024 * 1024;
const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"]);

export async function GET() {
  const me = await getMe();
  if (!me) return new Response("Unauthorized", { status: 401 });

  const rows = await db.select().from(photos).orderBy(desc(photos.createdAt)).limit(100);
  const withUrls = await Promise.all(rows.map(async (photo) => ({
    ...photo,
    url: await getSignedUrl(r2, new GetObjectCommand({ Bucket: process.env.R2_BUCKET!, Key: photo.key }), { expiresIn: 3600 }),
  })));
  return Response.json(withUrls);
}

const Body = z.object({ key: z.string().min(1).max(512), caption: z.string().max(200).nullable().optional() });

export async function POST(req: Request) {
  const me = await getMe();
  if (!me) return new Response("Unauthorized", { status: 401 });

  let body: unknown;
  try { body = await req.json(); } catch { return new Response("Bad request", { status: 400 }); }
  const parsed = Body.safeParse(body);
  if (!parsed.success) return new Response("Bad request", { status: 400 });

  const { key, caption } = parsed.data;
  if (!key.startsWith(`photos/${me.id}/`)) return new Response("Bad photo key", { status: 400 });

  try {
    const object = await r2.send(new HeadObjectCommand({ Bucket: process.env.R2_BUCKET!, Key: key }));
    if (object.Metadata?.uploader !== me.id || typeof object.ContentLength !== "number" ||
        object.ContentLength > MAX_PHOTO_BYTES || !object.ContentType || !IMAGE_TYPES.has(object.ContentType)) {
      return new Response("Invalid photo upload", { status: 400 });
    }
  } catch {
    return new Response("Uploaded photo not found", { status: 400 });
  }

  await db.insert(photos).values({ key, caption: caption ?? null, uploaderId: me.id });
  return Response.json({ ok: true });
}
