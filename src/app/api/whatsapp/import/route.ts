import { NextResponse, type NextRequest } from "next/server";
import { ingestChatExport } from "@/lib/ingest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(request: NextRequest) {
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Expected multipart form data" }, { status: 400 });
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "A .txt or .zip chat export is required" }, { status: 400 });
  }

  if (!/\.(txt|zip)$/i.test(file.name)) {
    return NextResponse.json(
      { error: "Only WhatsApp .txt or .zip chat exports are supported" },
      { status: 400 }
    );
  }

  try {
    const buffer = new Uint8Array(await file.arrayBuffer());
    const result = await ingestChatExport(file.name, buffer);
    return NextResponse.json({
      ok: true,
      fileName: file.name,
      received: result.received,
      candidates: result.candidates,
      extracted: result.extracted,
      stored: result.stored,
      skipped: result.skipped,
      source: result.source,
      errors: result.errors.slice(0, 20),
      filters: {
        skippedShort: result.parsed.skippedShort,
        skippedOld: result.parsed.skippedOld,
        skippedNonHousing: result.parsed.skippedNonHousing,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to import chat export" },
      { status: 500 }
    );
  }
}
