import { NextResponse } from "next/server";
import { db, ensureMigrated } from "@/db/init";
import { events } from "@/db/schema";
import { desc, eq, and, gte, lte, type SQL } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  ensureMigrated();
  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category");
  const severity = searchParams.get("severity");
  const sessionId = searchParams.get("sessionId");
  const since = searchParams.get("since"); // ISO timestamp
  const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 200);
  const offset = parseInt(searchParams.get("offset") || "0");

  const conditions: SQL[] = [];
  if (category) conditions.push(eq(events.eventCategory, category));
  if (severity) conditions.push(eq(events.severity, severity));
  if (sessionId) conditions.push(eq(events.sessionId, sessionId));
  if (since) conditions.push(gte(events.observedAt, since));

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const rows = db
    .select()
    .from(events)
    .where(where)
    .orderBy(desc(events.observedAt))
    .limit(limit)
    .offset(offset)
    .all();

  return NextResponse.json(rows);
}
