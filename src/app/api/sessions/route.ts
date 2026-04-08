import { NextResponse } from "next/server";
import { db, ensureMigrated } from "@/db/init";
import { sessionCurrent } from "@/db/schema";
import { desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  ensureMigrated();
  const sessions = db
    .select()
    .from(sessionCurrent)
    .orderBy(desc(sessionCurrent.lastActivityAt))
    .all();

  return NextResponse.json(sessions);
}
