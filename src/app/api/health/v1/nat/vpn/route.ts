import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { vpnProfiles } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { eq } from "drizzle-orm";

export async function GET() {
  try {
    const profiles = await db.select().from(vpnProfiles);
    return NextResponse.json({ profiles });
  } catch {
    return NextResponse.json({ profiles: [] });
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
    const body = await request.json();

    if (body.action === "connect") {
      await db.update(vpnProfiles).set({ status: "connected", updatedAt: new Date() }).where(eq(vpnProfiles.id, body.id));
      return NextResponse.json({ success: true });
    }
    if (body.action === "disconnect") {
      await db.update(vpnProfiles).set({ status: "disconnected", updatedAt: new Date() }).where(eq(vpnProfiles.id, body.id));
      return NextResponse.json({ success: true });
    }

    await db.insert(vpnProfiles).values(body);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });
    await db.delete(vpnProfiles).where(eq(vpnProfiles.id, parseInt(id)));
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
