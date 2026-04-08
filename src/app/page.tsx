import { db, ensureMigrated } from "@/db/init";
import { sessionCurrent, alertCurrent, toolExecCurrent } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { DashboardClient } from "@/components/dashboard/dashboard-client";

export const dynamic = "force-dynamic";

export default function Home() {
  ensureMigrated();
  const sessions = db
    .select()
    .from(sessionCurrent)
    .orderBy(desc(sessionCurrent.lastActivityAt))
    .all();

  const openAlerts = db
    .select()
    .from(alertCurrent)
    .where(eq(alertCurrent.status, "open"))
    .all().length;

  const runningTools = db
    .select()
    .from(toolExecCurrent)
    .where(eq(toolExecCurrent.currentState, "running"))
    .all().length;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <DashboardClient
        initialSessions={sessions}
        initialOpenAlerts={openAlerts}
        initialRunningTools={runningTools}
      />
    </div>
  );
}
