import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { systemConfig } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";

export async function GET() {
  try {
    const [config] = await db.select().from(systemConfig).limit(1);
    return NextResponse.json({
      uiLanguage: config?.uiLanguage || "en",
      uiTheme: config?.uiTheme || "auto",
      uiSoundVolume: config?.uiSoundVolume ?? 30,
      uiWallpaper: config?.uiWallpaper || null,
    });
  } catch {
    return NextResponse.json({ uiLanguage: "en", uiTheme: "auto", uiSoundVolume: 30, uiWallpaper: null });
  }
}

export async function PUT(request: NextRequest) {
  try {
    await requireAdmin();
    const body = await request.json();
    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (body.uiLanguage !== undefined) updateData.uiLanguage = body.uiLanguage;
    if (body.uiTheme !== undefined) updateData.uiTheme = body.uiTheme;
    if (body.uiSoundVolume !== undefined) updateData.uiSoundVolume = body.uiSoundVolume;
    if (body.uiWallpaper !== undefined) updateData.uiWallpaper = body.uiWallpaper;

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
