import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { torrentConfig, torrentDownloads } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";

export async function GET() {
  try {
    const [config] = await db.select().from(torrentConfig).limit(1);
    const downloads = await db.select().from(torrentDownloads);
    return NextResponse.json({
      config: config || { enabled: false, downloadPath: "/downloads", maxDownloadMbps: 50, maxUploadMbps: 10, maxConnections: 50 },
      downloads,
    });
  } catch {
    return NextResponse.json({ config: { enabled: false }, downloads: [] });
  }
}

export async function PUT(request: NextRequest) {
  try {
    await requireAdmin();
    const body = await request.json();
    const [existing] = await db.select().from(torrentConfig).limit(1);
    if (existing) {
      await db.update(torrentConfig).set({ ...body, updatedAt: new Date() });
    } else {
      await db.insert(torrentConfig).values(body);
    }
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
