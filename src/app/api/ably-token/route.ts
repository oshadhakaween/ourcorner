import { getMe } from "@/lib/auth";
import { ablyRest } from "@/lib/ably";

// Gives a logged-in browser a temporary LISTEN-ONLY pass for live updates.
// (Only the server can publish, so nobody can fake a chat message or a move.)
export async function GET() {
  const me = await getMe();
  if (!me) return new Response("Unauthorized", { status: 401 });

  const tokenRequest = await ablyRest.auth.createTokenRequest({
    clientId: me.id,
    capability: JSON.stringify({ chat: ["subscribe"], "room:*": ["subscribe"] }),
  });
  return Response.json(tokenRequest, { headers: { "Cache-Control": "private, no-store" } });
}
