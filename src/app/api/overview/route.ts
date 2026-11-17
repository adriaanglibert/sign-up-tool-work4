import { getPublicSnapshot } from "@/lib/store";

export async function GET() {
  try {
    const snapshot = await getPublicSnapshot();
    return Response.json(snapshot, {
      headers: { "Cache-Control": "no-store, max-age=0" },
    });
  } catch {
    return Response.json(
      { error: "Het overzicht kon niet worden geladen." },
      { status: 500 },
    );
  }
}
