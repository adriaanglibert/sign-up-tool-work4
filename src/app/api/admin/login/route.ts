import {
  checkLoginRateLimit,
  createAdminCookie,
  isSameOrigin,
  recordLoginAttempt,
  verifyAdminPassword,
} from "@/lib/admin-auth";

export async function POST(request: Request) {
  if (!isSameOrigin(request))
    return Response.json({ error: "Ongeldige aanvraag." }, { status: 403 });
  if (!checkLoginRateLimit(request))
    return Response.json(
      { error: "Te veel aanmeldpogingen. Probeer later opnieuw." },
      { status: 429 },
    );
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Ongeldige aanvraag." }, { status: 400 });
  }
  const password =
    body && typeof body === "object"
      ? (body as { password?: unknown }).password
      : undefined;
  if (
    typeof password !== "string" ||
    password.length > 256 ||
    !verifyAdminPassword(password)
  ) {
    recordLoginAttempt(request, false);
    return Response.json(
      { error: "Het wachtwoord klopt niet." },
      { status: 401 },
    );
  }
  recordLoginAttempt(request, true);
  try {
    return new Response(JSON.stringify({ authenticated: true }), {
      headers: {
        "Content-Type": "application/json",
        "Set-Cookie": createAdminCookie(),
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return Response.json(
      { error: "De beheerderauthenticatie is niet correct ingesteld." },
      { status: 500 },
    );
  }
}
