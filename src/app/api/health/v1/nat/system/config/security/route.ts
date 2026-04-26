import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { systemConfig } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";

export async function GET() {
  try {
    const [config] = await db.select().from(systemConfig).limit(1);
    return NextResponse.json({
      twoFaEnabled: config?.twoFaEnabled || false,
      ipWhitelist: (config?.ipWhitelist as string[]) || [],
      autoBackup: config?.autoBackup || false,
      autoBackupInterval: config?.autoBackupInterval || "0 2 * * *",
    });
  } catch {
    return NextResponse.json({ twoFaEnabled: false, ipWhitelist: [], autoBackup: false });
  }
}

export async function PUT(request: NextRequest) {
  try {
    await requireAdmin();
    const body = await request.json();
    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (body.twoFaEnabled !== undefined) updateData.twoFaEnabled = body.twoFaEnabled;
    if (body.ipWhitelist !== undefined) updateData.ipWhitelist = body.ipWhitelist;
    if (body.autoBackup !== undefined) updateData.autoBackup = body.autoBackup;
    if (body.autoBackupInterval !== undefined) updateData.autoBackupInterval = body.autoBackupInterval;
    if (body.adminPassword) {
      const bcrypt = await import("bcryptjs");
      updateData.adminPassword = await bcrypt.hash(body.adminPassword, 10);
    }

    const [existing] = await db.select().from(systemConfig).limit(1);
    if (existing) {
      await db.update(systemConfig).set(updateData);
    } else {
      await db.insert(systemConfig).values(updateData);
    }
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
