import { NextResponse } from "next/server";
import { db } from "@/db";
import { sql } from "drizzle-orm";

export async function GET() {
  try {
    await db.execute(sql`SELECT 1`);
    return NextResponse.json({
      status: "ok",
      service: "Linkage SFID",
      version: "1.0.0",
      timestamp: new Date().toISOString(),
      database: "connected",
    });
  } catch (error) {
    return NextResponse.json({
      status: "degraded",
      service: "Linkage SFID",
      version: "1.0.0",
      timestamp: new Date().toISOString(),
      database: "error",
      error: String(error),
    }, { status: 503 });
  }
}
