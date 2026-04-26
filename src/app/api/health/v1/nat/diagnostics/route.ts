import { NextRequest, NextResponse } from "next/server";
import { simulatePing, simulateTraceroute, simulateSpeedtest, getSimulatedArpTable, getSimulatedRouteTable, getSimulatedNatTable } from "@/lib/simulation";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    switch (action) {
      case "ping": {
        const result = simulatePing(body.target || "8.8.8.8", body.count || 4);
        return NextResponse.json(result);
      }
      case "traceroute": {
        const result = simulateTraceroute(body.target || "8.8.8.8");
        return NextResponse.json(result);
      }
      case "speedtest": {
        const result = simulateSpeedtest();
        return NextResponse.json(result);
      }
      case "arp": {
        return NextResponse.json({ entries: getSimulatedArpTable() });
      }
      case "routes": {
        return NextResponse.json({ entries: getSimulatedRouteTable() });
      }
      case "nat": {
        return NextResponse.json({ entries: getSimulatedNatTable() });
      }
      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
