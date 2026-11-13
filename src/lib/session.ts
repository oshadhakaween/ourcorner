// A small signed cookie that keeps you logged in on your original site's pages.
//
// Why: Clerk's own login token only lasts about 60 seconds and is refreshed by
// Clerk's browser script. Your original pages are plain HTML, so nothing there
// would refresh it, and chat/games would stop working after a minute.
// So: right after a real Clerk login, the server hands out this cookie (12 hours).
// It only says "this Clerk user id logged in recently". The server still checks
// the allowed-emails list on top, and it cannot be forged without CLERK_SECRET_KEY.

export const SESSION_COOKIE = "oc_session";
export const SESSION_MAX_AGE = 12 * 60 * 60; // seconds

const enc = new TextEncoder();

function secret(): string {
  return process.env.SESSION_SECRET || process.env.CLERK_SECRET_KEY || "";
}

function toB64Url(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromB64Url(str: string): Uint8Array | null {
  try {
    const s = str.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (str.length % 4)) % 4);
    const bin = atob(s);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  } catch {
    return null;
  }
}

async function hmacKey(): Promise<CryptoKey | null> {
  const k = secret();
  if (!k) return null;
  return crypto.subtle.importKey("raw", enc.encode("oc-session:" + k), { name: "HMAC", hash: "SHA-256" }, false, [
    "sign",
    "verify",
  ]);
}

// Make a cookie value for this Clerk user id.
export async function signSession(userId: string, now = Date.now()): Promise<string | null> {
  const key = await hmacKey();
  if (!key) return null;
  const payload = toB64Url(enc.encode(JSON.stringify({ u: userId, e: now + SESSION_MAX_AGE * 1000 })));
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", key, enc.encode(payload)));
  return payload + "." + toB64Url(sig);
}

// Check a cookie value. Returns the Clerk user id, or null if fake, broken or expired.
export async function verifySession(value: string, now = Date.now()): Promise<string | null> {
  const key = await hmacKey();
  if (!key) return null;
  const [payload, sig, extra] = value.split(".");
  if (!payload || !sig || extra !== undefined) return null;

  const sigBytes = fromB64Url(sig);
  if (!sigBytes) return null;
  const ok = await crypto.subtle.verify("HMAC", key, sigBytes as BufferSource, enc.encode(payload));
  if (!ok) return null;

  const bodyBytes = fromB64Url(payload);
  if (!bodyBytes) return null;
  try {
    const body = JSON.parse(new TextDecoder().decode(bodyBytes)) as { u?: unknown; e?: unknown };
    if (typeof body.u !== "string" || typeof body.e !== "number" || body.e < now) return null;
    return body.u;
  } catch {
    return null;
  }
}

function attrs(maxAge: number): string {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`;
}

export function sessionCookieHeader(value: string): string {
  return `${SESSION_COOKIE}=${value}; ${attrs(SESSION_MAX_AGE)}`;
}

export function clearCookieHeader(): string {
  return `${SESSION_COOKIE}=; ${attrs(0)}`;
}
