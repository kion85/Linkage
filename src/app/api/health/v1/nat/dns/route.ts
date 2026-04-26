import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { dnsConfig, dnsRecords } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { eq } from "drizzle-orm";

export async function GET() {
  try {
    const [config] = await db.select().from(dnsConfig).limit(1);
    const records = await db.select().from(dnsRecords);
    return NextResponse.json({
      config: config || { upstreamServers: ["1.1.1.1", "8.8.8.8"], cacheEnabled: true, cacheSize: 1000 },
      records,
    });
  } catch {
    return NextResponse.json({ error: "Failed to load DNS config" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    await requireAdmin();
    const body = await request.json();
    const [existing] = await db.select().from(dnsConfig).limit(1);
    if (existing) {
      await db.update(dnsConfig).set({ ...body, updatedAt: new Date() });
    } else {
      await db.insert(dnsConfig).values(body);
    }
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Error";
    return NextResponse.json({ error: msg }, { status: 401 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
    const body = await request.json();
    if (body.action === "addRecord") {
      await db.insert(dnsRecords).values(body.record);
    } else if (body.action === "deleteRecord") {
      await db.delete(dnsRecords).where(eq(dnsRecords.id, body.id));
    }
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
