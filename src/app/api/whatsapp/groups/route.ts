import { NextResponse, type NextRequest } from "next/server";
import {
  getBufferedMessageCounts,
  getWhatsAppGroups,
  getWhatsAppStatus,
  setTrackedGroups,
} from "@/lib/whatsapp/manager";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const status = getWhatsAppStatus();
  if (!status.connected) {
    return NextResponse.json(
      { error: "WhatsApp is not connected", status },
      { status: 409 }
    );
  }

  const [groups, messageCounts] = await Promise.all([
    getWhatsAppGroups(),
    getBufferedMessageCounts(),
  ]);
  return NextResponse.json({
    groups,
    trackedGroupIds: getWhatsAppStatus().trackedGroupIds,
    messageCounts,
  });
}

export async function POST(request: NextRequest) {
  const status = getWhatsAppStatus();
  if (!status.connected) {
    return NextResponse.json(
      { error: "WhatsApp is not connected", status },
      { status: 409 }
    );
  }

  const body = (await request.json().catch(() => ({}))) as { groupIds?: unknown };
  if (!Array.isArray(body.groupIds) || !body.groupIds.every((id) => typeof id === "string")) {
    return NextResponse.json({ error: "groupIds must be a string array" }, { status: 400 });
  }

  try {
    const nextStatus = await setTrackedGroups(body.groupIds as string[]);
    return NextResponse.json(nextStatus);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to save tracked groups" },
      { status: 500 }
    );
  }
}
