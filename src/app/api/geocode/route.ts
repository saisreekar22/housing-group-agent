import { NextResponse, type NextRequest } from "next/server";
import { resolveArea } from "@/lib/geocoding/geocoder";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (!query) {
    return NextResponse.json({ error: "Missing q query parameter" }, { status: 400 });
  }

  try {
    const result = await resolveArea(query);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Geocoding failed" },
      { status: 500 }
    );
  }
}
