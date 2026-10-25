import { NextResponse } from "next/server";
import { seedDatabase } from "@/lib/db/listings";

export const dynamic = "force-dynamic";

async function seed() {
  try {
    const result = await seedDatabase();
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Seeding failed" },
      { status: 500 }
    );
  }
}

export async function GET() {
  return seed();
}

export async function POST() {
  return seed();
}
