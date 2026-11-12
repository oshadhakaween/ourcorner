import { readFile } from "node:fs/promises";
import path from "node:path";
import { getMe } from "@/lib/auth";

// Serves your original 3D site (the files in the "private-site" folder),
// but ONLY to the two people who are logged in. Everything is private.
// "/"  ->  index.html,   "/games.html" -> games.html,   "/img1.jpg" -> img1.jpg ...

const ROOT = path.join(process.cwd(), "private-site");

const TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".mp3": "audio/mpeg",
  ".mp4": "video/mp4",
};

export async function GET(_req: Request, { params }: { params: Promise<{ path?: string[] }> }) {
  const me = await getMe();
  if (!me) return new Response("Unauthorized", { status: 401 });

  const { path: parts = [] } = await params;
  const decode = (s: string) => {
    try {
      return decodeURIComponent(s);
    } catch {
      return s;
    }
  };
  const rel = parts.length ? parts.map(decode).join("/") : "index.html";

  // safety: never allow paths that climb out of the private-site folder
  const full = path.resolve(ROOT, rel);
  if (full !== ROOT && !full.startsWith(ROOT + path.sep)) {
    return new Response("Not found", { status: 404 });
  }

  const type = TYPES[path.extname(full).toLowerCase()];
  if (!type) return new Response("Not found", { status: 404 });

  try {
    const file = await readFile(full);
    return new Response(new Uint8Array(file), {
      headers: {
        "Content-Type": type,
        // private: only this browser may keep a copy, never shared caches
        "Cache-Control": "private, max-age=300",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
