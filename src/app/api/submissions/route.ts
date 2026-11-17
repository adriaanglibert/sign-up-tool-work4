import { createSubmission } from "@/lib/store";
import type { Preference } from "@/lib/types";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Ongeldige aanvraag." }, { status: 400 });
  }
  if (!body || typeof body !== "object") {
    return Response.json({ error: "Ongeldige aanvraag." }, { status: 400 });
  }

  const input = body as { studentName?: unknown; preferences?: unknown };
  if (
    typeof input.studentName !== "string" ||
    !Array.isArray(input.preferences)
  ) {
    return Response.json(
      { error: "Vul je naam en drie voorkeuren in." },
      { status: 400 },
    );
  }
  const preferences = input.preferences as Preference[];
  if (
    preferences.some(
      (preference) => !preference || typeof preference.branchId !== "string",
    )
  ) {
    return Response.json(
      { error: "Een voorkeur is ongeldig." },
      { status: 400 },
    );
  }

  try {
    const result = await createSubmission({
      studentName: input.studentName,
      preferences,
    });
    if (result.error)
      return Response.json({ error: result.error }, { status: result.status });
    return Response.json({ submission: result.submission }, { status: 201 });
  } catch {
    return Response.json(
      { error: "De inschrijving kon niet worden opgeslagen. Probeer opnieuw." },
      { status: 500 },
    );
  }
}
