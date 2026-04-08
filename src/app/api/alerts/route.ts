import { NextResponse } from "next/server";
import { db, ensureMigrated } from "@/db/init";
import { alertCurrent } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { acknowledgeAlert } from "@/server/projection/alert";

export const dynamic = "force-dynamic";

export async function GET() {
  ensureMigrated();
  const alerts = db
    .select()
    .from(alertCurrent)
    .orderBy(desc(alertCurrent.raisedAt))
    .limit(100)
    .all();

  return NextResponse.json(alerts);
}

export async function PATCH(request: Request) {
  ensureMigrated();
  const body = await request.json();
  const { alertId, action } = body;

  if (action === "acknowledge" && alertId) {
    acknowledgeAlert(alertId);
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
