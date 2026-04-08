import { NextResponse } from "next/server";
import { db, ensureMigrated } from "@/db/init";
import { sessionCurrent, toolExecCurrent, taskCurrent, agentCurrent } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  ensureMigrated();
  const { sessionId } = await params;

  const session = db
    .select()
    .from(sessionCurrent)
    .where(eq(sessionCurrent.sessionId, sessionId))
    .get();

  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  const tools = db
    .select()
    .from(toolExecCurrent)
    .where(eq(toolExecCurrent.sessionId, sessionId))
    .orderBy(desc(toolExecCurrent.requestedAt))
    .limit(200)
    .all();

  const tasks = db
    .select()
    .from(taskCurrent)
    .where(eq(taskCurrent.sessionId, sessionId))
    .orderBy(desc(taskCurrent.createdAt))
    .limit(100)
    .all();

  const agents = db
    .select()
    .from(agentCurrent)
    .where(eq(agentCurrent.sessionId, sessionId))
    .orderBy(desc(agentCurrent.startedAt))
    .limit(50)
    .all();

  return NextResponse.json({ session, tools, tasks, agents });
}
