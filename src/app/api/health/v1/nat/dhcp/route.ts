import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { dhcpConfig, dhcpLeases } from "@/db/schema";
import { getSimulatedDhcpLeases } from "@/lib/simulation";
import { requireAdmin } from "@/lib/auth";

export async function GET() {
  try {
    const [config] = await db.select().from(dhcpConfig).limit(1);
    const simLeases = getSimulatedDhcpLeases();
    return NextResponse.json({
      config: config || {
        enabled: true,
        interfaceName: "eth1",
        poolStart: "192.168.1.100",
        poolEnd: "192.168.1.199",
        leaseTime: "24h",
        dnsServers: ["1.1.1.1", "8.8.8.8"],
        gateway: "192.168.1.1",
        domain: "local",
      },
      leases: simLeases,
    });
  } catch {
    return NextResponse.json({ error: "Failed to load DHCP config" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    await requireAdmin();
    const body = await request.json();
    const [existing] = await db.select().from(dhcpConfig).limit(1);
    if (existing) {
      await db.update(dhcpConfig).set({ ...body, updatedAt: new Date() });
    } else {
      await db.insert(dhcpConfig).values(body);
    }
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Error";
    return NextResponse.json({ error: msg }, { status: msg.includes("Unauthorized") ? 401 : 500 });
  }
}
