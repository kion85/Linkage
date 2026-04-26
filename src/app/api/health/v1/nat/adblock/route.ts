import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { adblockConfig } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";

export async function GET() {
  try {
    const [config] = await db.select().from(adblockConfig).limit(1);
    return NextResponse.json(config || { enabled: false, blocklists: [], blockedCount: 0, allowedDomains: [] });
  } catch {
    return NextResponse.json({ enabled: false, blocklists: [], blockedCount: 0 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    await requireAdmin();
    const body = await request.json();
    const [existing] = await db.select().from(adblockConfig).limit(1);
    if (existing) {
      await db.update(adblockConfig).set({ ...body, updatedAt: new Date() });
    } else {
      await db.insert(adblockConfig).values(body);
    }
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
