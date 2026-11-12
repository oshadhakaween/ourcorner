import { getMe } from "@/lib/auth";
import { ablyRest } from "@/lib/ably";

// Gives a logged-in browser a temporary listen-only pass for live updates.
export async function GET() {
  const me = await getMe();
  if (!me) return new Response("Unauthorized", { status: 401 });

  const tokenRequest = await ablyRest.auth.createTokenRequest({
    clientId: me.id,
    capability: { chat: ["subscribe"], "room:*": ["subscribe"] },
  });
  return Response.json(tokenRequest);
}
