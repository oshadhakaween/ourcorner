import { getMe, getPartner } from "@/lib/auth";

// Who am I, and who is my partner? Used by the profile chip in the site header.
export async function GET() {
  const me = await getMe();
  if (!me) return new Response("Unauthorized", { status: 401 });

  const partner = await getPartner(me);
  return Response.json(
    {
      me: { id: me.id, name: me.name, email: me.email, imageUrl: me.imageUrl },
      partner: partner ? { id: partner.id, name: partner.name, imageUrl: partner.imageUrl } : null,
    },
    { headers: { "Cache-Control": "private, no-store" } }
  );
}
