import {
  isAdminAuthorized,
  isSameOrigin,
  unauthorizedResponse,
} from "@/lib/admin-auth";
import { resetSubmissions } from "@/lib/store";

export async function POST(request: Request) {
  if (!isAdminAuthorized(request)) return unauthorizedResponse();
  if (!isSameOrigin(request))
    return Response.json({ error: "Ongeldige aanvraag." }, { status: 403 });
  try {
    await resetSubmissions();
    return Response.json({ reset: true });
  } catch {
    return Response.json(
      { error: "De inschrijvingen konden niet worden gereset." },
      { status: 500 },
    );
  }
}
