import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { z } from "zod";
import { r2 } from "@/lib/r2";
import { getMe } from "@/lib/auth";

const Body = z.object({
  filename: z.string().min(1).max(120),
  contentType: z.string().regex(/^image\//),
});

// Hands out a 5 minute link the browser uses to upload one photo straight to R2.
export async function POST(req: Request) {
  const me = await getMe();
  if (!me) return new Response("Unauthorized", { status: 401 });

  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) return new Response("Bad request", { status: 400 });

  const safe = parsed.data.filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  const key = `photos/${Date.now()}-${Math.random().toString(36).slice(2, 7)}-${safe}`;

  const url = await getSignedUrl(
    r2,
    new PutObjectCommand({
      Bucket: process.env.R2_BUCKET!,
      Key: key,
      ContentType: parsed.data.contentType,
    }),
    { expiresIn: 300 }
  );
  return Response.json({ url, key });
}
