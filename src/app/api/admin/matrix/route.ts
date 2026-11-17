import {
  isAdminAuthorized,
  isSameOrigin,
  unauthorizedResponse,
} from "@/lib/admin-auth";
import { updateCellCapacity } from "@/lib/store";

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
  if (!body || typeof body !== "object")
    return Response.json({ error: "Ongeldige aanvraag." }, { status: 400 });
  const input = body as {
    organizationId?: unknown;
    branchId?: unknown;
    maxCapacity?: unknown;
  };
  if (
    typeof input.organizationId !== "string" ||
    typeof input.branchId !== "string" ||
    typeof input.maxCapacity !== "number"
  ) {
    return Response.json(
      { error: "VZW, Branch en capaciteit zijn verplicht." },
      { status: 400 },
    );
  }
  try {
    const result = await updateCellCapacity({
      organizationId: input.organizationId,
      branchId: input.branchId,
      maxCapacity: input.maxCapacity,
    });
    if (result.error)
      return Response.json({ error: result.error }, { status: result.status });
    return Response.json({ matrix: result.matrix });
  } catch {
    return Response.json(
      { error: "De capaciteit kon niet worden opgeslagen." },
      { status: 500 },
    );
  }
}
