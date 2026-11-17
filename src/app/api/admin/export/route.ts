import { isAdminAuthorized, unauthorizedResponse } from "@/lib/admin-auth";
import { getAdminSnapshot } from "@/lib/store";

function csvField(value: string): string {
  const safeValue = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return `"${safeValue.replaceAll('"', '""')}"`;
}

export async function GET(request: Request) {
  if (!isAdminAuthorized(request)) return unauthorizedResponse();
  const format = new URL(request.url).searchParams.get("format");
  if (format !== "json" && format !== "csv")
    return Response.json({ error: "Kies json of csv." }, { status: 400 });
  try {
    const { matrix, submissions } = await getAdminSnapshot();
    if (format === "json") {
      return new Response(`${JSON.stringify(submissions, null, 2)}\n`, {
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Content-Disposition": 'attachment; filename="inschrijvingen.json"',
          "Cache-Control": "no-store",
        },
      });
    }
    const organizationNames = new Map(
      matrix.organizations.map(({ id, name }) => [id, name]),
    );
    const branchNames = new Map(
      matrix.branches.map(({ id, name }) => [id, name]),
    );
    const headers = [
      "Tijdstip",
      "Student",
      "Voorkeur 1 Branch",
      "Voorkeur 2 Branch",
      "Voorkeur 3 Branch",
      "Toegewezen VZW",
      "Toegewezen Branch",
      "Status",
    ];
    const rows = submissions.map((submission) => [
      submission.submittedAt,
      submission.studentName,
      ...submission.preferences.map(
        (preference) => branchNames.get(preference.branchId) ?? "",
      ),
      submission.assignedCombination
        ? (organizationNames.get(
            submission.assignedCombination.organizationId,
          ) ?? "")
        : "",
      submission.assignedCombination
        ? (branchNames.get(submission.assignedCombination.branchId) ?? "")
        : "",
      submission.status,
    ]);
    const csv = [headers, ...rows]
      .map((row) => row.map(csvField).join(";"))
      .join("\r\n");
    return new Response(`\uFEFF${csv}`, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="inschrijvingen.csv"',
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return Response.json(
      { error: "De export kon niet worden gegenereerd." },
      { status: 500 },
    );
  }
}
