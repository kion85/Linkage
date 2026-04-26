import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { interfaces } from "@/db/schema";
import { getSimulatedInterfaces } from "@/lib/simulation";
import { requireAdmin } from "@/lib/auth";
import { eq } from "drizzle-orm";

export async function GET() {
  try {
    const dbIfaces = await db.select().from(interfaces);
    if (dbIfaces.length === 0) {
      // Return simulated data if no DB records
      const sim = getSimulatedInterfaces();
      return NextResponse.json({ interfaces: sim });
    }
    const sim = getSimulatedInterfaces();
    const merged = dbIfaces.map((dbIface) => {
      const simIface = sim.find((s) => s.name === dbIface.name);
      return {
        ...dbIface,
        rxBytesPerSec: simIface?.rxBytesPerSec || 0,
        txBytesPerSec: simIface?.txBytesPerSec || 0,
        sparkline: simIface?.sparkline || [],
      };
    });
    return NextResponse.json({ interfaces: merged });
  } catch {
    return NextResponse.json({ interfaces: getSimulatedInterfaces() });
  }
}

export async function PUT(request: NextRequest) {
  try {
    await requireAdmin();
    const body = await request.json();
    const { name, ...updates } = body;
    if (!name) return NextResponse.json({ error: "Interface name required" }, { status: 400 });

    const [existing] = await db.select().from(interfaces).where(eq(interfaces.name, name)).limit(1);
    if (existing) {
      await db.update(interfaces).set({ ...updates, updatedAt: new Date() }).where(eq(interfaces.name, name));
    } else {
      await db.insert(interfaces).values({ name, ...updates });
    }
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Error";
    return NextResponse.json({ error: msg }, { status: msg.includes("Unauthorized") ? 401 : 500 });
  }
}
