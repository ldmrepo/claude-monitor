import { db, ensureMigrated } from "@/db/init";
import { sessionCurrent, alertCurrent, toolExecCurrent } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { DashboardClient } from "@/components/dashboard/dashboard-client";
import Link from "next/link";

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
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Claude Vault</h1>
          <p className="text-muted-foreground text-sm">Claude Code Monitoring Dashboard</p>
        </div>
        <nav className="flex gap-4 text-sm">
          <Link href="/tools" className="text-muted-foreground hover:text-foreground">Tools</Link>
          <Link href="/tasks" className="text-muted-foreground hover:text-foreground">Tasks</Link>
          <Link href="/alerts" className="text-muted-foreground hover:text-foreground">Alerts</Link>
          <Link href="/events" className="text-muted-foreground hover:text-foreground">Events</Link>
        </nav>
      </div>
      <DashboardClient
        initialSessions={sessions}
        initialOpenAlerts={openAlerts}
        initialRunningTools={runningTools}
      />
    </div>
  );
}
