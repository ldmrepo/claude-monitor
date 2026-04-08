import { NextResponse } from "next/server";
import { db, ensureMigrated } from "@/db/init";
import { rawEvents, events, sessionCurrent, alertCurrent } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { getConnectionCount } from "@/server/sse";

export const dynamic = "force-dynamic";

export async function GET() {
  ensureMigrated();

  const rawCount = db.select({ count: sql<number>`count(*)` }).from(rawEvents).get();
  const eventCount = db.select({ count: sql<number>`count(*)` }).from(events).get();
  const sessionCount = db.select({ count: sql<number>`count(*)` }).from(sessionCurrent).get();
  const openAlerts = db
    .select({ count: sql<number>`count(*)` })
    .from(alertCurrent)
    .where(eq(alertCurrent.status, "open"))
    .get();

  return NextResponse.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    db: {
      rawEvents: rawCount?.count || 0,
      events: eventCount?.count || 0,
      sessions: sessionCount?.count || 0,
      openAlerts: openAlerts?.count || 0,
    },
    sse: {
      connections: getConnectionCount(),
    },
  });
}
