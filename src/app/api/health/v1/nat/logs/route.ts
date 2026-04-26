import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { systemLogs } from "@/db/schema";
import { SAMPLE_LOGS } from "@/lib/defaults";
import { desc, eq, and, gte } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get("limit") || "50");
  const level = searchParams.get("level");
  const source = searchParams.get("source");

  try {
    const conditions = [];
    if (level) conditions.push(eq(systemLogs.level, level));
    if (source) conditions.push(eq(systemLogs.source, source));

    const query = conditions.length > 0
      ? db.select().from(systemLogs).where(and(...conditions)).orderBy(desc(systemLogs.timestamp)).limit(limit)
      : db.select().from(systemLogs).orderBy(desc(systemLogs.timestamp)).limit(limit);

    const logs = await query;

    if (logs.length === 0) {
      // Return sample logs if DB is empty
      return NextResponse.json({
        logs: SAMPLE_LOGS.map((l, i) => ({
          id: i + 1,
          timestamp: new Date(Date.now() - (SAMPLE_LOGS.length - i) * 60000).toISOString(),
          ...l,
        })),
        total: SAMPLE_LOGS.length,
      });
    }

    return NextResponse.json({ logs, total: logs.length });
  } catch {
    return NextResponse.json({ logs: SAMPLE_LOGS, total: SAMPLE_LOGS.length });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    await db.insert(systemLogs).values({
      level: body.level || "info",
      source: body.source || "system",
      message: body.message,
      details: body.details,
    });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
