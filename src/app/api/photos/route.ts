import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { asc } from "drizzle-orm";
import { db } from "@/db";
import { photos } from "@/db/schema";
import { r2 } from "@/lib/r2";
import { getMe } from "@/lib/auth";

// List the vault photos (oldest first = the order you fly through them), each with a 1 hour viewing link.
export async function GET() {
  const me = await getMe();
  if (!me) return new Response("Unauthorized", { status: 401 });

  const rows = await db.select().from(photos).orderBy(asc(photos.id)).limit(60);
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

  let json: { key?: unknown; caption?: unknown };
  try {
    json = await req.json();
  } catch {
    return new Response("Bad request", { status: 400 });
  }
  const { key, caption } = json;
  if (typeof key !== "string" || !key.startsWith("photos/") || key.length > 300) {
    return new Response("Bad request", { status: 400 });
  }
  const [row] = await db
    .insert(photos)
    .values({
      key,
      caption: typeof caption === "string" && caption.trim() ? caption.trim().slice(0, 120) : null,
      uploaderId: me.id,
    })
    .returning();
  return Response.json(row);
}
