import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { snapshots } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { eq } from "drizzle-orm";

export async function GET() {
  try {
    const allSnapshots = await db.select().from(snapshots);
    return NextResponse.json({ snapshots: allSnapshots });
  } catch {
    return NextResponse.json({ snapshots: [] });
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
    const body = await request.json();

    if (body.action === "create") {
      // Fetch current config (simplified)
      const configData = { schemaVersion: 1, timestamp: new Date().toISOString(), note: body.description || "Manual snapshot" };
      const [snapshot] = await db.insert(snapshots).values({
        name: body.name || `snapshot-${Date.now()}`,
        description: body.description,
        configData,
      }).returning();
      return NextResponse.json({ success: true, snapshot });
    }

    if (body.action === "restore") {
      const [snapshot] = await db.select().from(snapshots).where(eq(snapshots.id, body.snapshotId)).limit(1);
      if (!snapshot) return NextResponse.json({ error: "Snapshot not found" }, { status: 404 });
      return NextResponse.json({ success: true, configData: snapshot.configData, message: "Restore initiated (simulated)" });
    }

    if (body.action === "delete") {
      await db.delete(snapshots).where(eq(snapshots.id, body.snapshotId));
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
