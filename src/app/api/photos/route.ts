import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { desc } from "drizzle-orm";
import { db } from "@/db";
import { photos } from "@/db/schema";
import { r2 } from "@/lib/r2";
import { getMe } from "@/lib/auth";

// List photos, each with a 1 hour viewing link.
export async function GET() {
  const me = await getMe();
  if (!me) return new Response("Unauthorized", { status: 401 });

  const rows = await db.select().from(photos).orderBy(desc(photos.createdAt)).limit(100);
  const withUrls = await Promise.all(
    rows.map(async (p) => ({
      ...p,
      url: await getSignedUrl(
        r2,
        new GetObjectCommand({ Bucket: process.env.R2_BUCKET!, Key: p.key }),
        { expiresIn: 3600 }
      ),
    }))
  );
  return Response.json(withUrls);
}

// Remember a photo after the browser finished uploading it.
export async function POST(req: Request) {
  const me = await getMe();
  if (!me) return new Response("Unauthorized", { status: 401 });

  const { key, caption } = await req.json();
  if (typeof key !== "string" || !key.startsWith("photos/")) {
    return new Response("Bad request", { status: 400 });
  }
  await db.insert(photos).values({
    key,
    caption: typeof caption === "string" ? caption.slice(0, 200) : null,
    uploaderId: me.id,
  });
  return Response.json({ ok: true });
}
