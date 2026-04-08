import { NextResponse } from "next/server";
import { db, ensureMigrated } from "@/db/init";
import { agentCurrent } from "@/db/schema";
import { desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  ensureMigrated();
  const agents = db
    .select()
    .from(agentCurrent)
    .orderBy(desc(agentCurrent.startedAt))
    .limit(100)
    .all();

  return NextResponse.json(agents);
}
