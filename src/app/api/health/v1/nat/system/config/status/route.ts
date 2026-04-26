import { NextResponse } from "next/server";
import { getSimulatedMetrics, getSimulatedInterfaces } from "@/lib/simulation";

export async function GET() {
  const metrics = getSimulatedMetrics();
  const interfaces = getSimulatedInterfaces();

  return NextResponse.json({
    ...metrics,
    interfaces: interfaces.map((i) => ({
      name: i.name,
      status: i.status,
      role: i.role,
      type: i.type,
      ipAddress: i.ipAddress,
      rxBytesPerSec: i.rxBytesPerSec,
      txBytesPerSec: i.txBytesPerSec,
    })),
  }, {
    headers: {
      "Cache-Control": "no-store, must-revalidate",
      "ETag": `"${Date.now()}"`,
    },
  });
}
