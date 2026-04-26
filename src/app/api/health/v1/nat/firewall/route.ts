import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { firewallRules, firewallDefaults } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { eq } from "drizzle-orm";

export async function GET() {
  try {
    const rules = await db.select().from(firewallRules);
    const [defaults] = await db.select().from(firewallDefaults).limit(1);
    return NextResponse.json({
      defaults: defaults || { wanDefaultPolicy: "deny", lanDefaultPolicy: "allow" },
      rules,
    });
  } catch {
    return NextResponse.json({ defaults: { wanDefaultPolicy: "deny", lanDefaultPolicy: "allow" }, rules: [] });
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
    const body = await request.json();
    await db.insert(firewallRules).values(body);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to create rule" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    await requireAdmin();
    const body = await request.json();
    if (body.defaults) {
      const [existing] = await db.select().from(firewallDefaults).limit(1);
      if (existing) {
        await db.update(firewallDefaults).set({ ...body.defaults, updatedAt: new Date() });
      } else {
        await db.insert(firewallDefaults).values(body.defaults);
      }
    }
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
    await db.delete(firewallRules).where(eq(firewallRules.id, parseInt(id)));
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
