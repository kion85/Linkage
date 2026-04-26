import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { guestWifiConfig } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";

export async function GET() {
  try {
    const [config] = await db.select().from(guestWifiConfig).limit(1);
    return NextResponse.json(config || { enabled: false, ssid: "Linkage-Guest", password: "", isolation: true, speedLimitMbps: 10, lanAccess: false });
  } catch {
    return NextResponse.json({ enabled: false, ssid: "Linkage-Guest" });
  }
}

export async function PUT(request: NextRequest) {
  try {
    await requireAdmin();
    const body = await request.json();
    const [existing] = await db.select().from(guestWifiConfig).limit(1);
    if (existing) {
      await db.update(guestWifiConfig).set({ ...body, updatedAt: new Date() });
    } else {
      await db.insert(guestWifiConfig).values(body);
    }
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
