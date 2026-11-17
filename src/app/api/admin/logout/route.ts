import { clearAdminCookie, isSameOrigin } from "@/lib/admin-auth";

export async function POST(request: Request) {
  if (!isSameOrigin(request))
    return Response.json({ error: "Ongeldige aanvraag." }, { status: 403 });
  return new Response(JSON.stringify({ authenticated: false }), {
    headers: {
      "Content-Type": "application/json",
      "Set-Cookie": clearAdminCookie(),
      "Cache-Control": "no-store",
    },
  });
}
