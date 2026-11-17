import { isAdminAuthorized, unauthorizedResponse } from "@/lib/admin-auth";
import { getAdminSnapshot } from "@/lib/store";

export async function GET(request: Request) {
  if (!isAdminAuthorized(request)) return unauthorizedResponse();
  try {
    return Response.json(await getAdminSnapshot(), {
      headers: { "Cache-Control": "no-store, max-age=0" },
    });
  } catch {
    return Response.json(
      { error: "Beheerdersgegevens konden niet worden geladen." },
      { status: 500 },
    );
  }
}
