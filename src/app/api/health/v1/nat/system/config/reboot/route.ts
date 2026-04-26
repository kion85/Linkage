import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/db";
import { systemLogs } from "@/db/schema";

export async function POST() {
  try {
    await requireAdmin();
    await db.insert(systemLogs).values({
      level: "info",
      source: "system",
      message: "System reboot initiated by admin",
    });
    return NextResponse.json({ success: true, message: "Reboot initiated (simulated)" });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Error";
    if (msg.includes("Unauthorized")) return NextResponse.json({ error: msg }, { status: 401 });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
