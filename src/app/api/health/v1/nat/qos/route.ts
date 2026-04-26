import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { qosConfig } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";

export async function GET() {
  try {
    const [config] = await db.select().from(qosConfig).limit(1);
    return NextResponse.json(config || { enabled: true, downloadMbps: 100, uploadMbps: 100 });
  } catch {
    return NextResponse.json({ enabled: true, downloadMbps: 100, uploadMbps: 100 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    await requireAdmin();
    const body = await request.json();
    const [existing] = await db.select().from(qosConfig).limit(1);
    if (existing) {
      await db.update(qosConfig).set({ ...body, updatedAt: new Date() });
    } else {
      await db.insert(qosConfig).values(body);
    }
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
