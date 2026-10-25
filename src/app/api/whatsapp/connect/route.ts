import { NextResponse, type NextRequest } from "next/server";
import { connectWhatsApp } from "@/lib/whatsapp/manager";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as {
    phoneNumber?: unknown;
    method?: unknown;
  };

  const method = body.method === "qr" ? "qr" : "pairing";
  const phoneNumber =
    method === "pairing" && typeof body.phoneNumber === "string"
      ? body.phoneNumber
      : undefined;

  if (method === "pairing" && !phoneNumber) {
    return NextResponse.json(
      { error: "phoneNumber is required for pairing code linking" },
      { status: 400 }
    );
  }

  try {
    const status = await connectWhatsApp(phoneNumber, method);
    return NextResponse.json(status);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to connect WhatsApp" },
      { status: 500 }
    );
  }
}
