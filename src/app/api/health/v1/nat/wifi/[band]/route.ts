import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { wifiConfig } from "@/db/schema";
import { getSimulatedWifiClients } from "@/lib/simulation";
import { requireAdmin } from "@/lib/auth";
import { eq } from "drizzle-orm";

export async function GET(request: NextRequest, { params }: { params: Promise<{ band: string }> }) {
  const { band } = await params;
  try {
    const [config] = await db.select().from(wifiConfig).where(eq(wifiConfig.band, band)).limit(1);
    const clients = getSimulatedWifiClients().filter((c) => c.band === band || band === "all");
    return NextResponse.json({
      config: config || {
        band,
        enabled: true,
        ssid: band === "2.4g" ? "Linkage-2G" : "Linkage-5G",
        password: "linkagepass",
        channel: band === "2.4g" ? 6 : 36,
        channelWidth: band === "2.4g" ? "20" : "80",
        security: "wpa2",
        hiddenSsid: false,
      },
      clients,
    });
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ band: string }> }) {
  const { band } = await params;
  try {
    await requireAdmin();
    const body = await request.json();
    const [existing] = await db.select().from(wifiConfig).where(eq(wifiConfig.band, band)).limit(1);
    if (existing) {
      await db.update(wifiConfig).set({ ...body, band, updatedAt: new Date() }).where(eq(wifiConfig.band, band));
    } else {
      await db.insert(wifiConfig).values({ ...body, band });
    }
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
