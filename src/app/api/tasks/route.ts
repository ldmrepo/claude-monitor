import { NextResponse } from "next/server";
import { db, ensureMigrated } from "@/db/init";
import { taskCurrent } from "@/db/schema";
import { desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  ensureMigrated();
  const tasks = db
    .select()
    .from(taskCurrent)
    .orderBy(desc(taskCurrent.createdAt))
    .limit(100)
    .all();

  return NextResponse.json(tasks);
}
