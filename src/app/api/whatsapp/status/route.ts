import { NextResponse } from "next/server";
import { getWhatsAppStatus } from "@/lib/whatsapp/manager";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(getWhatsAppStatus());
}
