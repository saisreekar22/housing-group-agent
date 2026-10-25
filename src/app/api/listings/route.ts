import { NextResponse, type NextRequest } from "next/server";
import { fallbackListings, filterListings, queryListings } from "@/lib/db/listings";
import { loadTrackedGroupIds } from "@/lib/db/tracked-groups";
import { parseFilters } from "@/lib/filters";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const filters = parseFilters(request.nextUrl.searchParams);
    const demo = request.nextUrl.searchParams.get("demo") === "true";

    if (demo) {
      const listings = filterListings(fallbackListings(), filters);
      return NextResponse.json({
        listings,
        source: "fallback" as const,
        count: listings.length,
        filters,
      });
    }

    const trackedGroupIds = await loadTrackedGroupIds();
    const { listings, source } = await queryListings(filters, {
      allowSeedFallback: false,
      groupIds: trackedGroupIds,
    });
    return NextResponse.json({
      listings,
      source,
      count: listings.length,
      filters,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load listings" },
      { status: 500 }
    );
  }
}
