import { readFile } from "node:fs/promises";
import path from "node:path";
import { getAuth, getMe } from "@/lib/auth";
import { sessionCookieHeader, signSession } from "@/lib/session";

// Serves your original site (the files in the "private-site" folder),
// but ONLY to the two people who are logged in. Everything stays private.
//   "/"            -> index.html
//   "/chat"        -> chat.html   (".html" is optional)
//   "/img1.jpg"    -> img1.jpg

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

function decode(s: string) {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

async function read(file: string) {
  try {
    return await readFile(file);
  } catch {
    return null;
  }
}

export async function GET(req: Request, { params }: { params: Promise<{ path?: string[] }> }) {
  // 1. must be logged in at all
  const login = await getAuth();
  if (!login) return new Response("Unauthorized", { status: 401 });

  const { path: parts = [] } = await params;
  let rel = parts.length ? parts.map(decode).join("/") : "index.html";
  if (!path.extname(rel)) rel += ".html"; // "/chat" works like "/chat.html"

  const isPage = rel.endsWith(".html");

  // 2. must be one of the two allowed people
  const me = await getMe();
  if (!me) {
    return isPage
      ? Response.redirect(new URL("/not-allowed", req.url), 302)
      : new Response("Forbidden", { status: 403 });
  }

  // 3. never allow paths that climb out of the private-site folder
  const full = path.resolve(ROOT, rel);
  if (!full.startsWith(ROOT + path.sep)) return new Response("Not found", { status: 404 });

  const type = TYPES[path.extname(full).toLowerCase()];
  if (!type) return new Response("Not found", { status: 404 });

  const file = await read(full);
  if (!file) return new Response("Not found", { status: 404 });

  const isCode = /\.(html|css|js|txt|json)$/.test(full);
  const headers = new Headers({
    "Content-Type": type,
    // private: only this browser may keep a copy, never a shared cache.
    // pages and scripts always re-check, so updates show up right away.
    "Cache-Control": isCode ? "private, no-cache" : "private, max-age=86400",
    "X-Robots-Tag": "noindex",
  });

  // Opening a page while logged in with Clerk: hand out the 12 hour "stay logged in"
  // cookie so chat and games keep working on these plain pages (see src/lib/session.ts).
  if (isPage && login.via === "clerk") {
    const value = await signSession(login.userId);
    if (value) headers.append("Set-Cookie", sessionCookieHeader(value));
  }

  return new Response(new Uint8Array(file), { headers });
}
