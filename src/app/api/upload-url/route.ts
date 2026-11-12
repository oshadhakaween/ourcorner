import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { z } from "zod";
import { r2 } from "@/lib/r2";
import { getMe } from "@/lib/auth";

const MAX_PHOTO_BYTES = 10 * 1024 * 1024;
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"] as const;
const Body = z.object({
  filename: z.string().min(1).max(120),
  contentType: z.enum(IMAGE_TYPES),
  size: z.number().int().positive().max(MAX_PHOTO_BYTES),
});

export async function POST(req: Request) {
  const me = await getMe();
  if (!me) return new Response("Unauthorized", { status: 401 });

  let body: unknown;
  try { body = await req.json(); } catch { return new Response("Bad request", { status: 400 }); }
  const parsed = Body.safeParse(body);
  if (!parsed.success) return new Response("Bad request", { status: 400 });

  const safe = parsed.data.filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  const key = `photos/${me.id}/${crypto.randomUUID()}-${safe}`;
  const url = await getSignedUrl(r2, new PutObjectCommand({
    Bucket: process.env.R2_BUCKET!,
    Key: key,
    ContentType: parsed.data.contentType,
    Metadata: { uploader: me.id },
  }), { expiresIn: 300 });

  return Response.json({
    url, key,
    headers: { "Content-Type": parsed.data.contentType, "x-amz-meta-uploader": me.id },
  });
}
