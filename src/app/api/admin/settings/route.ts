import {
  isAdminAuthorized,
  isSameOrigin,
  unauthorizedResponse,
} from "@/lib/admin-auth";
import { updateRegistrationStatus } from "@/lib/store";

export async function PATCH(request: Request) {
  if (!isAdminAuthorized(request)) return unauthorizedResponse();
  if (!isSameOrigin(request))
    return Response.json({ error: "Ongeldige aanvraag." }, { status: 403 });
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Ongeldige aanvraag." }, { status: 400 });
  }
  const isOpen =
    body && typeof body === "object"
      ? (body as { isOpen?: unknown }).isOpen
      : undefined;
  if (typeof isOpen !== "boolean")
    return Response.json({ error: "De status is ongeldig." }, { status: 400 });
  try {
    return Response.json({ settings: await updateRegistrationStatus(isOpen) });
  } catch {
    return Response.json(
      { error: "De inschrijvingsstatus kon niet worden opgeslagen." },
      { status: 500 },
    );
  }
}
