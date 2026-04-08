import { NextResponse } from "next/server";
import { db, ensureMigrated } from "@/db/init";
import { toolExecCurrent } from "@/db/schema";
import { desc, eq, and, type SQL } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  ensureMigrated();
  const { searchParams } = new URL(request.url);
  const state = searchParams.get("state");
  const sessionId = searchParams.get("sessionId");
  const limit = Math.min(parseInt(searchParams.get("limit") || "100"), 500);

  const conditions: SQL[] = [];
  if (state) conditions.push(eq(toolExecCurrent.currentState, state));
  if (sessionId) conditions.push(eq(toolExecCurrent.sessionId, sessionId));

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const tools = db
    .select()
    .from(toolExecCurrent)
    .where(where)
    .orderBy(desc(toolExecCurrent.requestedAt))
    .limit(limit)
    .all();

  return NextResponse.json(tools);
}
